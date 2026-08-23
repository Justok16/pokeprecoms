import Stripe from "stripe";

// Client Stripe, cote SERVEUR uniquement. Instanciation PARESSEUSE (meme
// piege documente que pokedeals-saas/lib/stripe.ts et les clients
// Supabase) -- Next.js collecte la config des Route Handlers au BUILD, un
// throw immediat casserait `next build` meme sans jamais servir la route.
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Pas de niveau gratuit -- abonnement payant uniquement (cf. CGU, decision
// explicite prise avec Justok le 23/08/2026 : le produit est "toutes les
// precommandes detectees", moins naturel a limiter par nombre que la
// watchlist de PokeDeals).
export const PRIX_SOLO = 7.99;

// Coupons "bundle" (memes noms que crees a la main dans le dashboard
// Stripe, MEME COMPTE que pokedeals-saas -- cf. determinerCouponBundle) :
//   - bundle-fondateur : -2,99€ (7,99€ -> 5,00€), pour un client ayant deja
//     un abonnement PokeDeals actif AVEC le coupon fondateur early-bird-200
//     applique (un des 200 premiers abonnes PokeDeals).
//   - bundle-standard : -0,99€ (7,99€ -> 7,00€), pour un client ayant deja
//     un abonnement PokeDeals actif SANS ce coupon.
// Total combine avec PokeDeals : 4,99+5,00=9,99€ (fondateur) ou
// 7,99+7,00=14,99€ (standard) -- chiffres decides avec Justok le 23/08/2026.
export const BUNDLE_FONDATEUR_COUPON_ID = "bundle-fondateur";
export const BUNDLE_STANDARD_COUPON_ID = "bundle-standard";

// ID du Price Stripe de l'abonnement PokeDeals (meme compte Stripe) --
// necessaire pour detecter si un client a deja PokeDeals actif au moment du
// checkout PokePrecoms. A renseigner en variable d'env une fois connu (cf.
// STRIPE_PRICE_ID dans pokedeals-saas/.env -- meme valeur ici, prefixee
// POKEDEALS_ pour la distinguer du Price propre a PokePrecoms).
const POKEDEALS_PRICE_ID = process.env.POKEDEALS_STRIPE_PRICE_ID;
const POKEDEALS_EARLY_BIRD_COUPON_ID = "early-bird-200";

export function estTesteurBeta(email: string | null | undefined) {
  if (!email) return false;
  const liste = (process.env.BETA_TESTER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return liste.includes(email.toLowerCase());
}

/**
 * Determine le coupon bundle a appliquer au checkout PokePrecoms pour cet
 * email, en cherchant un abonnement PokeDeals actif deja existant pour le
 * MEME client Stripe (meme compte Stripe partage entre les deux apps, donc
 * une recherche directe par email suffit -- pas besoin d'appeler l'API de
 * pokedeals-saas ni de partager une base Supabase).
 *
 * Toute erreur reseau/API Stripe retombe sur `null` (tarif plein, 7,99€) --
 * ne doit jamais bloquer un checkout PokePrecoms, meme si la verification
 * du bundle echoue.
 *
 * NON TESTE EN CONDITIONS REELLES : a verifier avec un vrai abonne fondateur
 * PokeDeals avant la mise en production.
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
        expand: ["data.discounts"],
      });
      for (const sub of subscriptions.data) {
        const aLAbonnementPokedeals = sub.items.data.some(
          (item) => item.price.id === POKEDEALS_PRICE_ID
        );
        if (!aLAbonnementPokedeals) continue;
        // `discounts` : Array<string | Discount> -- seulement les entrees
        // deja resolues (via expand ci-dessus) exposent `.source.coupon`,
        // une entree encore sous forme d'ID string est traitee comme "pas
        // fondateur" (ne devrait pas arriver avec cet expand, mais ne doit
        // jamais faire planter la detection). `coupon` lui-meme peut etre
        // soit l'ID (string), soit l'objet Coupon complet -- son `id` est
        // toujours identique a l'ID lui-meme cote Stripe.
        const estFondateur = sub.discounts.some((d) => {
          if (typeof d === "string") return false;
          const coupon = d.source.coupon;
          const couponId = typeof coupon === "string" ? coupon : coupon?.id;
          return couponId === POKEDEALS_EARLY_BIRD_COUPON_ID;
        });
        return estFondateur ? BUNDLE_FONDATEUR_COUPON_ID : BUNDLE_STANDARD_COUPON_ID;
      }
    }
  } catch {
    // Erreur API Stripe -- tarif plein par prudence, ne bloque jamais le checkout.
  }
  return null;
}
