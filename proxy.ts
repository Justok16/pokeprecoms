import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // "api/webhooks" retiré le 03/09/2026 (audit) : hérité de pokedeals-saas
    // (webhook Stripe, cf. migration 0002_subscriptions.sql), mais cette
    // route n'a jamais existé dans CE dépôt (modèle 100% gratuit depuis le
    // début du scaffold, jamais de Stripe côté PokéPrécoms) -- vérifié par
    // recherche exhaustive, aucune route app/api/webhooks/*.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
