"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SubscriptionPushJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard?notifications=enregistre");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

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

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    message,
  });
  if (error) {
    throw new Error(`Erreur lors de l'envoi : ${error.message}`);
  }

  redirect("/dashboard?feedback=envoye");
}
