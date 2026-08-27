import Stripe from "stripe";

// Client Stripe, cote SERVEUR uniquement. Instanciation PARESSEUSE (meme
// piege documente que pokedeals-saas/lib/stripe.ts et les clients
// Supabase) -- Next.js collecte la config des Route Handlers au BUILD, un
// throw immediat casserait `next build` meme sans jamais servir la route.
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Tarif solo (decide avec Justok le 27/08/2026, remplace l'ancien tarif
// unique 7,99€ sans palier gratuit). Niveau gratuit desormais permis
// cote produit : 1 alerte de precommande offerte pour essayer le service
// (cf. LIMITE_ALERTES_GRATUIT, gerée cote scraper -- justok16/pokedeals,
// connecteur_supabase_precoms.py -- puisque c'est lui qui envoie les
// notifications broadcast, pas ce depot).
export const PRIX_SOLO = 2.99;

// Nombre d'alertes de precommande offertes sans abonnement actif. Une fois
// consommee (colonne user_preferences.alerte_gratuite_envoyee, cf.
// migration 0007), plus aucune alerte gratuite -- il faut s'abonner pour
// en recevoir de nouvelles. Le decompte et l'envoi vivent cote scraper
// (justok16/pokedeals), cette constante ne sert ici qu'a l'affichage.
export const LIMITE_ALERTES_GRATUIT = 1;

// Coupon "bundle" (cree a la main dans le dashboard Stripe, MEME COMPTE
// que pokedeals-saas -- cf. determinerCouponBundle ci-dessous et son
// equivalent dans pokedeals-saas/lib/stripe.ts) : -1,00€ off, ramene le
// second abonnement (quel qu'il soit) de 2,99€ a 1,99€/mois. Meme coupon
// partage dans les DEUX sens, le geste commercial etant identique de
// chaque cote.
export const BUNDLE_DISCOUNT_COUPON_ID = "bundle-app-jumelee";

// ID du Price Stripe de l'abonnement PokeDeals (meme compte Stripe) --
// necessaire pour detecter si un client a deja PokeDeals actif au moment
// du checkout PokePrecoms. A renseigner en variable d'env une fois connu
// (cf. STRIPE_PRICE_ID dans pokedeals-saas/.env -- meme valeur ici,
// prefixee POKEDEALS_ pour la distinguer du Price propre a PokePrecoms).
const POKEDEALS_PRICE_ID = process.env.POKEDEALS_STRIPE_PRICE_ID;

export function estTesteurBeta(email: string | null | undefined) {
  if (!email) return false;
  const liste = (process.env.BETA_TESTER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return liste.includes(email.toLowerCase());
}

/**
 * Determine si le coupon bundle doit s'appliquer au checkout PokePrecoms
 * pour cet email, en cherchant un abonnement PokeDeals actif deja existant
 * pour le MEME client Stripe (meme compte Stripe partage entre les deux
 * apps, donc une recherche directe par email suffit -- pas besoin
 * d'appeler l'API de pokedeals-saas ni de partager une base Supabase).
 *
 * Simplifie le 27/08/2026 (nouvelle tarification a plat, plus de
 * distinction fondateur/standard) : un seul coupon possible, appliqué des
 * qu'un abonnement PokeDeals actif existe, quel que soit son tarif.
 *
 * Toute erreur reseau/API Stripe retombe sur `null` (tarif plein, 2,99€) --
 * ne doit jamais bloquer un checkout PokePrecoms, meme si la verification
 * du bundle echoue.
 */
export async function determinerCouponBundle(
  stripe: Stripe,
  email: string
): Promise<string | null> {
  if (!POKEDEALS_PRICE_ID) return null;
  try {
    const customers = await stripe.customers.list({ email, limit: 5 });
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
      });
      const aLAbonnementPokedeals = subscriptions.data.some((sub) =>
        sub.items.data.some((item) => item.price.id === POKEDEALS_PRICE_ID)
      );
      if (aLAbonnementPokedeals) return BUNDLE_DISCOUNT_COUPON_ID;
    }
  } catch {
    // Erreur API Stripe -- tarif plein par prudence, ne bloque jamais le checkout.
  }
  return null;
}
