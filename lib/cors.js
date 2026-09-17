// Applied only to the two public, unauthenticated read-only routes
// (/api/models, /api/models/[slug]) — these are meant to be called from
// anywhere, including a browser directly (a static/client-only prototype
// with no backend of its own), not just server-side. Never apply this to
// an authenticated /api/admin/* route — those should stay same-origin.
//
// Access-Control-Allow-Origin: "*" is safe here specifically because this
// data is public and read-only (no cookies, no auth, nothing
// origin-specific to leak) — the same reasoning that makes these routes
// unauthenticated in the first place.
function applyPublicCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // caller should return immediately
  }
  return false;
}

module.exports = { applyPublicCors };
