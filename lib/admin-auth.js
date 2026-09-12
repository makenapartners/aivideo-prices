// Minimal shared-secret gate for admin endpoints.
//
// This is deliberately simple (no login system, no sessions) since v1 is
// a single-founder admin tool. Set ADMIN_SECRET in your Netlify env vars,
// then the /admin page will ask you for it once and remember it in your
// browser. Anyone calling the admin API directly needs to send it as
// the x-admin-secret header.
function requireAdmin(req, res) {
  const configured = process.env.ADMIN_SECRET;

  // If no secret is configured, fail closed rather than leaving admin
  // routes wide open on a public URL.
  if (!configured) {
    res.status(500).json({ error: "ADMIN_SECRET is not configured on the server" });
    return false;
  }

  const provided = req.headers["x-admin-secret"];
  if (provided !== configured) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

module.exports = { requireAdmin };
