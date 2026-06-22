require("dotenv").config();
const express = require("express");
const cookieSession = require("cookie-session");
const { OAuth2Client } = require("google-auth-library");
const path = require("path");

const app = express();
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "leadflow_session",
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })
);
app.use(express.static(path.join(__dirname, ".")));

// In-memory store — replace with Supabase/PlanetScale for persistent prod data
const leadsStore = {};
function getUserLeads(email) {
  if (!leadsStore[email]) leadsStore[email] = [];
  return leadsStore[email];
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.get("/auth/google", (req, res) => {
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "select_account",
  });
  res.redirect(url);
});

app.get("/auth/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect("/?error=no_code");
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    req.session.user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub,
    };
    res.redirect("/");
  } catch (err) {
    console.error("OAuth error:", err.message);
    res.redirect("/?error=auth_failed");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  res.json({ user: req.session.user });
});

// ── Leads CRUD ────────────────────────────────────────────────────────────────
app.get("/api/leads", requireAuth, (req, res) => {
  res.json({ leads: getUserLeads(req.session.user.email) });
});

app.post("/api/leads", requireAuth, (req, res) => {
  const { name, location, email, phone, source, value, status } = req.body;
  if (!name || !location || !phone || !source)
    return res.status(400).json({ error: "Missing required fields" });
  const lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: name.trim(), location: location.trim(),
    email: (email || "").trim(), phone: phone.trim(),
    source, value: value || "0", status: status || "New",
    created: Date.now(),
  };
  getUserLeads(req.session.user.email).unshift(lead);
  res.status(201).json({ lead });
});

app.put("/api/leads/:id", requireAuth, (req, res) => {
  const leads = getUserLeads(req.session.user.email);
  const idx = leads.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Lead not found" });
  const { name, location, email, phone, source, value, status } = req.body;
  leads[idx] = {
    ...leads[idx],
    ...(name && { name: name.trim() }),
    ...(location && { location: location.trim() }),
    email: (email || "").trim(),
    ...(phone && { phone: phone.trim() }),
    ...(source && { source }),
    ...(value !== undefined && { value }),
    ...(status && { status }),
  };
  res.json({ lead: leads[idx] });
});

app.patch("/api/leads/:id/status", requireAuth, (req, res) => {
  const leads = getUserLeads(req.session.user.email);
  const lead = leads.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const valid = ["New", "Contacted", "Won", "Lost"];
  if (!valid.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
  lead.status = req.body.status;
  res.json({ lead });
});

app.delete("/api/leads/:id", requireAuth, (req, res) => {
  const email = req.session.user.email;
  const before = (leadsStore[email] || []).length;
  leadsStore[email] = (leadsStore[email] || []).filter((l) => l.id !== req.params.id);
  if (leadsStore[email].length === before) return res.status(404).json({ error: "Lead not found" });
  res.json({ success: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LeadFlow CRM → http://localhost:${PORT}`));
module.exports = app;
