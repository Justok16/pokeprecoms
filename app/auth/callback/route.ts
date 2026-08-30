import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Audit du 30/08/2026 : `next` vient de la query string (donc du lien
// envoyé à l'utilisateur, potentiellement forgé par un attaquant) et était
// concaténé tel quel à `origin`. Une valeur sans "/" initial, ex.
// "@evil.com/phish", produit "https://pokeprecoms.vercel.app@evil.com/phish"
// -- une URL valide où "pokeprecoms.vercel.app" devient un userinfo et
// "evil.com" devient le VRAI hôte : après une vraie connexion Google/GitHub
// réussie, l'utilisateur est redirigé vers un site tiers (open redirect
// exploitable en phishing). On n'accepte donc que les chemins relatifs
// commençant par un seul "/" (jamais "//", qui peut être réinterprété comme
// une URL relative au schéma par certains parseurs).
function cheminSuivantSur(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = cheminSuivantSur(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erreur=auth`);
}
