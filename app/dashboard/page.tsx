import Link from "next/link";
import { CATEGORIES_PRECOMMANDE } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import { basculerNotifEmail, deconnexion, envoyerFeedback } from "./actions";
import AlertesListe from "./alertes-liste";
import { TAILLE_PAGE_ALERTES } from "./alertes-types";
import NotifPush from "./notif-push";

const PANNEAU = "rounded-2xl bg-surface p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";
const BOUTON_PRIMAIRE =
  "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_-10px_var(--accent)]";
const LIEN_DISCRET = "text-xs text-muted underline-offset-4 hover:text-foreground hover:underline";
const CHAMP =
  "rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cyan focus:outline-none";

// Renforcement défensif (31/08/2026, même correctif que pokedeals-saas,
// signalement direct de l'utilisateur -- préférence email "recochée" à
// chaque visite) : force un rendu dynamique systématique, sans AUCUNE mise
// en cache possible côté Next.js pour cette page.
export const dynamic = "force-dynamic";

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // le proxy redirige déjà vers /login

  const categorieParam = searchParams.categorie;
  const categorieActive = (
    Array.isArray(categorieParam) ? categorieParam[0] : categorieParam
  ) as (typeof CATEGORIES_PRECOMMANDE)[number] | undefined;
  const filtreValide = categorieActive && CATEGORIES_PRECOMMANDE.includes(categorieActive);

  let requeteAlertes = supabase
    .from("precommande_alerts")
    .select("id, titre_produit, boutique, url_produit, prix, devise, categorie, created_at")
    .order("created_at", { ascending: false })
    .limit(TAILLE_PAGE_ALERTES);
  if (filtreValide) requeteAlertes = requeteAlertes.eq("categorie", categorieActive);

  const requetePreferences = supabase
    .from("user_preferences")
    .select("notif_email")
    .eq("user_id", user.id)
    .maybeSingle();

  // Audit PRIORITAIRE du 03/09/2026 -- même schéma de bug qu'un incident réel
  // survenu plus tôt cette session (une colonne manquante en base avait fait
  // échouer silencieusement CETTE MÊME requête `precommande_alerts` pendant
  // longtemps sans que personne ne le remarque : `data` était simplement
  // `null`, rendu à l'identique d'un vrai "aucune précommande détectée").
  // Corrigé ici : `error` est désormais systématiquement vérifiée et loguée
  // côté serveur pour les deux requêtes, pour qu'une requête cassée soit
  // visible dans les logs Vercel au lieu de se confondre avec un état vide
  // légitime. Les deux requêtes sont aussi lancées en parallèle (Promise.all)
  // puisqu'elles sont indépendantes l'une de l'autre.
  const [{ data: alertes, error: erreurAlertes }, { data: preferences, error: erreurPreferences }] =
    await Promise.all([requeteAlertes, requetePreferences]);

  if (erreurAlertes) {
    console.error("[dashboard] Échec de la requête precommande_alerts :", erreurAlertes.message);
  }
  if (erreurPreferences) {
    console.error("[dashboard] Échec de la requête user_preferences :", erreurPreferences.message);
  }

  const notifEmailActive = preferences?.notif_email ?? true;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Précommandes
            </h1>
            <p className="font-mono text-sm text-muted">{user.email}</p>
          </div>
          <form action={deconnexion}>
            <button type="submit" className={LIEN_DISCRET}>
              Se déconnecter
            </button>
          </form>
        </header>

        <p className="text-center font-mono text-xs text-cyan">
          🆓 100% gratuit et illimité — toutes les précommandes détectées, sans abonnement
        </p>

        <section className={`${PANNEAU} flex items-center justify-between gap-4`}>
          <div>
            <p className="text-sm font-semibold text-foreground">
              🎁 Découvre PokéDeals
            </p>
            <p className="mt-1 text-xs text-muted">
              Notre service sœur alerte sur les bonnes affaires cartes Pokémon TCG — 100% gratuit
              et illimité, comme ici.
            </p>
          </div>
          <a
            href="https://pokedeals-rho.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className={`${LIEN_DISCRET} shrink-0`}
          >
            Découvrir →
          </a>
        </section>

        <section className={`${PANNEAU} flex flex-col gap-2`}>
          <h2 className="text-sm font-medium text-foreground">Notifications</h2>
          <NotifPush />
          <form action={basculerNotifEmail} className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notif_email"
              name="notif_email"
              defaultChecked={notifEmailActive}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <label htmlFor="notif_email" className="text-xs text-muted">
              Recevoir mes alertes par email
            </label>
            <button type="submit" className={LIEN_DISCRET}>
              Enregistrer
            </button>
            {searchParams.notifications === "enregistre" && (
              <span className="text-xs text-cyan">Enregistré ✓</span>
            )}
          </form>
          {notifEmailActive && (
            // Ajouté le 04/09/2026 : sans nom de domaine vérifié pour
            // l'expéditeur (SendGrid en vérification "Single Sender", pas de
            // domaine complet SPF/DKIM/DMARC), les premiers emails d'un
            // nouvel expéditeur atterrissent souvent en spam -- confirmé en
            // conditions réelles sur le canari de livraison le jour même.
            // Prévenir directement ici plutôt que de laisser l'utilisateur
            // penser que la fonctionnalité ne marche pas.
            <p className="text-xs text-muted">
              Tu ne reçois rien par email ? Vérifie ton dossier spam/courrier
              indésirable, surtout pour les premiers emails.
            </p>
          )}
        </section>

        <section className={PANNEAU}>
          <h2 className="mb-3 text-sm font-medium text-foreground">Dernières précommandes détectées</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                !filtreValide
                  ? "bg-accent text-accent-ink"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              Tout le scellé
            </Link>
            {CATEGORIES_PRECOMMANDE.map((categorie) => (
              <Link
                key={categorie}
                href={`/dashboard?categorie=${encodeURIComponent(categorie)}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  categorieActive === categorie
                    ? "bg-accent text-accent-ink"
                    : "bg-background text-muted hover:text-foreground"
                }`}
              >
                {categorie}
              </Link>
            ))}
          </div>
          {erreurAlertes && (
            <p className="mb-3 text-xs text-danger">
              Impossible de charger les précommandes pour l&apos;instant, réessaie dans un instant.
            </p>
          )}
          <AlertesListe
            key={filtreValide ? categorieActive : "tout"}
            alertesInitiales={alertes ?? []}
            categorie={filtreValide ? categorieActive : undefined}
          />
        </section>

        <section className={PANNEAU}>
          <h2 className="text-sm font-medium text-foreground">Une suggestion ou une critique ?</h2>
          <p className="mt-1 text-xs text-muted">
            Le site est en phase de lancement — tous les retours sont utiles, bons ou mauvais.
          </p>
          {searchParams.feedback === "envoye" ? (
            <p className="mt-4 text-sm text-cyan">Merci, ton message a bien été envoyé !</p>
          ) : (
            <form action={envoyerFeedback} className="mt-4 flex flex-col gap-3">
              <textarea
                name="message"
                required
                maxLength={2000}
                rows={3}
                placeholder="Dis-moi ce qui te plaît, ce qui te manque, ce qui bugue..."
                className={`${CHAMP} resize-none`}
              />
              <button type="submit" className={`${BOUTON_PRIMAIRE} self-start`}>
                Envoyer
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
