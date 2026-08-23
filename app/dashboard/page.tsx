import { createClient } from "@/lib/supabase/server";
import {
  basculerNotifEmail,
  creerSessionCheckout,
  creerSessionPortail,
  deconnexion,
  envoyerFeedback,
} from "./actions";
import NotifPush from "./notif-push";

const PANNEAU = "rounded-2xl bg-surface p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";
const BOUTON_PRIMAIRE =
  "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_-10px_var(--accent)]";
const LIEN_DISCRET = "text-xs text-muted underline-offset-4 hover:text-foreground hover:underline";
const CHAMP =
  "rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cyan focus:outline-none";

const STATUTS_ABONNEMENT_ACTIF = ["active", "trialing"];

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // le proxy redirige déjà vers /login

  const { data: abonnement } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const abonnementActif =
    !!abonnement && STATUTS_ABONNEMENT_ACTIF.includes(abonnement.status);

  const { data: alertes } = await supabase
    .from("precommande_alerts")
    .select("id, titre_produit, boutique, url_produit, prix, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("notif_email")
    .eq("user_id", user.id)
    .maybeSingle();
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

        {searchParams.abonnement === "succes" && (
          <p className="rounded-xl bg-cyan/10 px-4 py-3 text-sm text-cyan">
            Abonnement activé, merci ! Tu recevras désormais une alerte à chaque précommande
            détectée en stock.
          </p>
        )}
        {searchParams.abonnement === "annule" && (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">
            Paiement annulé — tu peux réessayer à tout moment.
          </p>
        )}

        <section className={PANNEAU}>
          {abonnementActif ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Abonnement actif</p>
                <p className="mt-1 text-xs text-muted">
                  Tu reçois toutes les alertes de précommande, en push et/ou par email.
                </p>
              </div>
              <form action={creerSessionPortail}>
                <button type="submit" className={LIEN_DISCRET}>
                  Gérer mon abonnement
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Aucun abonnement actif</p>
                <p className="mt-1 text-xs text-muted">
                  Abonne-toi pour recevoir les alertes de précommande en temps réel — tarif réduit
                  automatiquement si tu as déjà PokéDeals.
                </p>
              </div>
              <form action={creerSessionCheckout}>
                <button type="submit" className={BOUTON_PRIMAIRE}>
                  S&apos;abonner
                </button>
              </form>
            </div>
          )}
        </section>

        {abonnementActif && (
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
            </form>
          </section>
        )}

        <section className={PANNEAU}>
          <h2 className="mb-3 text-sm font-medium text-foreground">Dernières précommandes détectées</h2>
          {alertes && alertes.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {alertes.map((a) => (
                <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <a
                    href={a.url_produit}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {a.titre_produit}
                  </a>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {a.boutique}
                    {a.prix ? ` · ${Number(a.prix).toFixed(2)} €` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Aucune précommande détectée pour l&apos;instant — reviens bientôt.
            </p>
          )}
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
