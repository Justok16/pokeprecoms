import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRIX_SOLO } from "@/lib/stripe";
import { NOMBRE_BOUTIQUES } from "@/lib/constantes";

const ETAPES = [
  {
    titre: "Tu t'abonnes",
    texte: "Aucune configuration : dès que tu es abonné, tu es couvert pour tout le catalogue Pokémon TCG.",
  },
  {
    titre: "On surveille le marché pour toi",
    texte: `${NOMBRE_BOUTIQUES} boutiques françaises et japonaises sont scannées automatiquement, plusieurs fois par heure, à la recherche de nouvelles précommandes.`,
  },
  {
    titre: "Tu reçois l'alerte",
    texte: "Dès qu'un produit passe en précommande réellement disponible (pas juste annoncé), une notification push ou un email t'arrive avec le lien direct.",
  },
];

const CONFIANCE = [
  {
    titre: "Uniquement Pokémon TCG",
    texte: "Chaque candidat est vérifié pour exclure les autres franchises (Yu-Gi-Oh, Magic, Lorcana...) avant toute alerte.",
  },
  {
    titre: "Vraiment en stock",
    texte: "Une page de précommande qui existe mais reste indisponible ne déclenche rien — seule une précommande réellement commandable t'est signalée.",
  },
  {
    titre: "Jamais deux fois la même alerte",
    texte: "Chaque produit n'est signalé qu'une seule fois, même s'il reste en précommande plusieurs jours.",
  },
];

const FAQ = [
  {
    question: "Combien coûte PokéPrécoms ?",
    reponse: `${PRIX_SOLO.toFixed(2)} €/mois, sans niveau gratuit — le service consiste à couvrir tout le catalogue de précommandes, ce qui ne se prête pas à un palier limité. Si tu es déjà abonné à PokéDeals, une réduction s'applique automatiquement au moment du paiement.`,
  },
  {
    question: "J'ai déjà PokéDeals, ça change quoi ?",
    reponse: "Le tarif de PokéPrécoms est automatiquement réduit à 5,00 €/mois si tu fais partie des 200 premiers abonnés fondateurs PokéDeals, ou 7,00 €/mois sinon — soit 9,99 € ou 14,99 € au total pour les deux services, sans rien à configurer.",
  },
  {
    question: "Où sont scannées les précommandes ?",
    reponse: `Sur ${NOMBRE_BOUTIQUES} boutiques françaises et japonaises spécialisées Pokémon TCG — les mêmes que celles surveillées par PokéDeals.`,
  },
  {
    question: "À quelle fréquence les boutiques sont-elles scannées ?",
    reponse: "Automatiquement, plusieurs fois par heure — pas un scan permanent en temps réel, mais une surveillance régulière et continue.",
  },
  {
    question: "Comment je reçois mes alertes ?",
    reponse: "Par notification push directement dans le navigateur, et/ou par email — les deux canaux sont configurables indépendamment depuis le tableau de bord.",
  },
  {
    question: "Une alerte garantit-elle que je pourrai commander ?",
    reponse: "Non. PokéPrécoms détecte les précommandes au moment du scan. Un produit peut être retiré ou épuisé entre deux scans — vérifie toujours la page avant de valider ta commande.",
  },
];

const DONNEES_STRUCTUREES = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PokéPrécoms",
  applicationCategory: "ShoppingApplication",
  operatingSystem: "Web",
  description: `Alertes automatiques sur les précommandes Pokémon TCG disponibles sur ${NOMBRE_BOUTIQUES} boutiques françaises et japonaises.`,
  offers: [
    {
      "@type": "Offer",
      name: "Abonnement",
      price: PRIX_SOLO.toFixed(2),
      priceCurrency: "EUR",
      description: "Alertes illimitées sur toutes les précommandes détectées.",
    },
  ],
};

const DONNEES_STRUCTUREES_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.reponse },
  })),
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-[36rem] rounded-full bg-cyan/25 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[-10%] h-80 w-[32rem] rounded-full bg-accent/20 blur-[100px]"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_FAQ) }}
      />

      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-24 px-6 py-24">
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
            Ne rate plus une précommande Pokémon TCG.
          </p>
          <h1 className="font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
            PokéPrécoms
          </h1>
          <p className="max-w-md text-lg text-muted">
            Coffrets, displays, ETB... les précommandes rares partent en quelques minutes. On les
            repère pour toi, sur {NOMBRE_BOUTIQUES} boutiques françaises et japonaises.
          </p>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_30px_-8px_rgba(255,210,63,0.6)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            {user ? "Aller à mon tableau de bord" : "S'abonner"}
          </Link>
          <p className="font-mono text-xs text-cyan">
            {PRIX_SOLO.toFixed(2)} €/mois — dès 5,00 €/mois si tu as déjà PokéDeals
          </p>
        </section>

        <section className="w-full max-w-md">
          <div className="rounded-2xl bg-gradient-to-br from-accent via-cyan to-accent p-[1.5px]">
            <div className="rounded-[15px] bg-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                🎉 Précommande détectée
              </p>
              <p className="mt-3 text-base font-semibold text-foreground">
                Coffret Dresseur d&apos;Élite — 30e Anniversaire
              </p>
              <p className="font-mono text-xs text-muted">
                🇫🇷 boutique-exemple.fr · En stock / commandable
              </p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted">Prix</p>
                  <p className="font-mono text-2xl font-bold text-accent">59,99 €</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Exemple d&apos;alerte reçue par notification push ou email.
          </p>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Comment ça marche
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {ETAPES.map((etape, i) => (
              <div key={etape.titre} className="rounded-2xl bg-surface p-5">
                <span className="font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">{etape.titre}</h3>
                <p className="mt-1 text-sm text-muted">{etape.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Détection intelligente
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CONFIANCE.map((item) => (
              <div key={item.titre} className="rounded-2xl bg-surface p-5">
                <h3 className="text-sm font-semibold text-foreground">{item.titre}</h3>
                <p className="mt-1 text-sm text-muted">{item.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Tarifs
          </h2>
          <div className="rounded-2xl bg-gradient-to-br from-accent to-cyan p-[1.5px]">
            <div className="rounded-[15px] bg-surface p-6">
              <p className="text-sm font-semibold text-foreground">Abonnement</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-accent">
                  {PRIX_SOLO.toFixed(2)} €
                </span>
                <span className="text-sm font-normal text-muted">/mois</span>
              </p>
              <p className="mt-1 text-xs text-cyan">
                Déjà abonné à PokéDeals ? Le tarif descend automatiquement à 5,00 €/mois (offre
                fondateur) ou 7,00 €/mois — aucune configuration nécessaire.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
                <li>Toutes les précommandes détectées, sans limite</li>
                <li>Alertes push et email</li>
                <li>{NOMBRE_BOUTIQUES} boutiques françaises et japonaises</li>
                <li>Résiliable à tout moment</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-muted">
            Pas de niveau gratuit — le service consiste à couvrir tout le catalogue de
            précommandes.
          </p>
        </section>

        <section className="w-full">
          <div className="rounded-2xl bg-gradient-to-br from-cyan to-accent p-[1.5px]">
            <div className="flex flex-col items-center gap-3 rounded-[15px] bg-surface p-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-cyan">
                  Le service sœur
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-foreground">
                  PokéDeals
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted">
                  Configure ta watchlist de cartes Pokémon TCG et reçois une alerte dès
                  qu&apos;une bonne affaire tombe sous ton seuil de prix. Abonne-toi aux deux
                  services et paie moins cher sur PokéPrécoms.
                </p>
              </div>
              <a
                href="https://pokedeals-rho.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Découvrir PokéDeals →
              </a>
            </div>
          </div>
        </section>

        <section className="flex w-full flex-col gap-6">
          <h2 className="text-center font-display text-xl font-bold text-foreground">
            Questions fréquentes
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item) => (
              <details key={item.question} className="rounded-2xl bg-surface p-5">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-muted">{item.reponse}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
