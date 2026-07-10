import { NextResponse, type NextRequest } from "next/server";

/**
 * CSP durcie par nonce (pattern officiel Next App Router). Un nonce par requête
 * autorise les scripts inline de Next sans `'unsafe-inline'` ; `strict-dynamic`
 * propage la confiance aux scripts chargés par un script de confiance. Les
 * styles gardent `'unsafe-inline'` (Tailwind/inline styles ; risque faible et
 * pas de mécanisme de nonce côté styles). `connect-src` couvre Convex (HTTP+WS)
 * et better-auth (`*.convex.site`).
 *
 * `x-nonce` est transmis en en-tête de requête : Next l'applique automatiquement
 * à ses balises <script> quand il détecte la CSP porteuse du nonce.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Toutes les routes sauf les assets statiques Next (déjà immuables/signés).
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
