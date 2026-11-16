// CCA Auction — ImageKit upload signer (Cloudflare Worker)
//
// Lets signed-in auction staff upload photos to ImageKit without putting your ImageKit
// PRIVATE key in the public website. Paste this whole file into a Cloudflare Worker.
//
// In the Worker's Settings → Variables and Secrets, add:
//   IMAGEKIT_PRIVATE_KEY   (type: Secret)  ImageKit dashboard → Developer options → Private key
//   FIREBASE_PROJECT_ID    (type: Text)    cca-auction
//   ALLOWED_ORIGIN         (type: Text)    https://tplunkett09.github.io
//
// How it decides who may upload: the website sends the person's Firebase sign-in token.
// The Worker uses that token to read one staff-only record from your Firestore database.
// Firestore's own security rules answer "yes" only for owners and people on the Staff page,
// so anyone else (or anyone not signed in) is refused.

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return reply({ error: "Method not allowed" }, 405);
    if (!env.IMAGEKIT_PRIVATE_KEY || !env.FIREBASE_PROJECT_ID) {
      return reply({ error: "Upload signer isn't configured (missing IMAGEKIT_PRIVATE_KEY or FIREBASE_PROJECT_ID)." }, 500);
    }

    const idToken = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!idToken) return reply({ error: "Please sign in as staff first." }, 401);

    // Staff check: only staff are allowed to read counters/items (see firestore.rules).
    // 200 = allowed and it exists, 404 = allowed but not created yet, 401/403 = not staff.
    const check = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/counters/items`,
      { headers: { Authorization: "Bearer " + idToken } });
    if (check.status !== 200 && check.status !== 404) {
      return reply({ error: "This login isn't allowed to upload photos." }, 403);
    }

    // ImageKit signature: HMAC-SHA1(privateKey, token + expire), lowercase hex. Expire must be < 1 hour away.
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 30 * 60;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.IMAGEKIT_PRIVATE_KEY),
      { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token + expire));
    const signature = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

    return reply({ token, expire, signature });
  },
};
