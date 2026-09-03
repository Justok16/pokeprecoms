"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORIES_PRECOMMANDE } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import { TAILLE_PAGE_ALERTES, type AlerteLigne } from "./alertes-types";

type SubscriptionPushJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

// Message générique affiché à l'utilisateur pour toute erreur Postgres
// inattendue (audit du 03/09/2026) -- le texte brut de `error.message` (ex.
// "duplicate key value violates unique constraint...") ne doit jamais
// remonter jusqu'à l'UI (rendu verbatim par app/dashboard/error.tsx), mais
// reste loggé côté serveur pour le diagnostic.
const MESSAGE_ERREUR_GENERIQUE = "Une erreur est survenue, réessaie dans un instant.";

function erreurGenerique(contexte: string, error: { message: string }): Error {
  console.error(`[dashboard] ${contexte} :`, error.message);
  return new Error(MESSAGE_ERREUR_GENERIQUE);
}

export async function enregistrerAbonnementPush(subscription: SubscriptionPushJSON) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("Abonnement push invalide.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw erreurGenerique("Échec de l'enregistrement de l'abonnement push", error);
}

export async function supprimerAbonnementPush(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
}

// Audit du 31/08/2026 (même correctif que pokedeals-saas) : la vérification
// "notifications actives ?" côté client se basait UNIQUEMENT sur
// navigator.serviceWorker.pushManager.getSubscription() (état du
// navigateur), jamais recroisée avec le propriétaire réel en base -- sur un
// appareil partagé, si l'utilisateur A active le push puis se déconnecte
// sans cliquer "Désactiver", B qui se connecte ensuite voit l'UI afficher
// "actif" à tort. Cette action permet au client de vérifier que l'endpoint
// appartient bien à l'utilisateur CONNECTÉ avant d'afficher "actif" --
// sinon l'appelant doit désabonner le navigateur.
export async function abonnementPushAppartientAUtilisateur(endpoint: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  return data?.user_id === user.id;
}

export async function basculerNotifEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = formData.get("notif_email") === "on";

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, notif_email: active }, { onConflict: "user_id" });

  if (error) throw erreurGenerique("Échec de l'enregistrement de la préférence email", error);

  revalidatePath("/dashboard");
  redirect("/dashboard?notifications=enregistre");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Limite anti-abus (audit du 03/09/2026, même principe que pokedeals-saas) :
// aucun plafond n'existait jusqu'ici sur le nombre de retours envoyés par un
// même utilisateur -- un compte compromis ou un clic répété par erreur
// pouvait spammer indéfiniment la table `feedback`. 20/24h reste largement
// suffisant pour un usage légitime (un formulaire de retour, pas une
// messagerie) tout en bloquant un abus évident.
const LIMITE_FEEDBACK_PAR_JOUR = 20;

export async function envoyerFeedback(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    throw new Error("Le message ne peut pas être vide.");
  }
  if (message.length > 2000) {
    throw new Error("Le message est trop long (2000 caractères maximum).");
  }

  const depuis24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: erreurComptage } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", depuis24h);
  if (erreurComptage) {
    throw erreurGenerique("Échec de la vérification de la limite de feedback", erreurComptage);
  }
  if ((count ?? 0) >= LIMITE_FEEDBACK_PAR_JOUR) {
    throw new Error(
      `Tu as atteint la limite de ${LIMITE_FEEDBACK_PAR_JOUR} messages par 24h, réessaie plus tard.`
    );
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    message,
  });
  if (error) {
    throw erreurGenerique("Échec de l'envoi du feedback", error);
  }

  redirect("/dashboard?feedback=envoye");
}

// Pagination "Charger plus" (audit du 03/09/2026) : jusqu'ici un simple
// `.limit(50)` sans suite -- toute précommande au-delà des 50 plus récentes
// était définitivement invisible depuis le dashboard. Pagination par
// curseur sur `created_at` (déjà indexé seul, et désormais aussi en
// composite avec `categorie`, cf. migration
// 0010_precommande_alerts_categorie_created_at_idx.sql) : le client passe
// le `created_at` de la dernière ligne déjà affichée, on ne renvoie que les
// lignes strictement plus anciennes -- jamais d'offset (qui se désynchronise
// si de nouvelles lignes sont insérées entre deux clics).
export async function chargerPlusAlertes(
  avant: string,
  categorie?: string
): Promise<AlerteLigne[]> {
  const supabase = await createClient();
  const categorieValide =
    categorie && (CATEGORIES_PRECOMMANDE as readonly string[]).includes(categorie)
      ? categorie
      : undefined;

  let requete = supabase
    .from("precommande_alerts")
    .select("id, titre_produit, boutique, url_produit, prix, devise, categorie, created_at")
    .lt("created_at", avant)
    .order("created_at", { ascending: false })
    .limit(TAILLE_PAGE_ALERTES);
  if (categorieValide) requete = requete.eq("categorie", categorieValide);

  const { data, error } = await requete;
  if (error) {
    // Comme app/dashboard/page.tsx (correctif prioritaire du 03/09/2026) :
    // ne jamais avaler une erreur Supabase silencieusement -- ici, en plus
    // du log, on relance une erreur générique pour que le bouton "Charger
    // plus" affiche un message plutôt que de paraître avoir simplement
    // atteint la fin de la liste.
    console.error("[dashboard] Échec du chargement de précommandes supplémentaires :", error.message);
    throw new Error(MESSAGE_ERREUR_GENERIQUE);
  }
  return data ?? [];
}
