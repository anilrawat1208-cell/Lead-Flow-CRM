# LeadFlow CRM — Deployment Guide

A simple, professional CRM for Indian small businesses with Google SSO, built on Node.js + Express, hosted on Vercel.

---

## Step 1 — Set up Google OAuth credentials

1. Go to **https://console.cloud.google.com**
2. Create a new project (e.g. "LeadFlow CRM")
3. Navigate to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in app name, support email, developer email → Save
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: LeadFlow CRM
   - **Authorised redirect URIs** — add:
     ```
     http://localhost:3000/auth/callback
     https://YOUR-APP.vercel.app/auth/callback
     ```
   - Click **Create**
5. Copy your **Client ID** and **Client Secret** — you'll need them next.

---

## Step 2 — Deploy to Vercel

### Option A — Deploy via Vercel CLI (recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Install project dependencies
npm install

# 3. Deploy (follow the prompts — link to your Vercel account)
vercel

# 4. Set environment variables (replace values with yours)
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add SESSION_SECRET      # any long random string
vercel env add APP_URL             # e.g. https://leadflow-crm.vercel.app

# 5. Re-deploy to apply env vars
vercel --prod
```

### Option B — Deploy via GitHub

1. Push this folder to a GitHub repository
2. Go to **https://vercel.com/new** → Import your repo
3. In **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `GOOGLE_CLIENT_ID` | your-client-id.apps.googleusercontent.com |
   | `GOOGLE_CLIENT_SECRET` | your-client-secret |
   | `SESSION_SECRET` | any-long-random-string |
   | `APP_URL` | https://your-app-name.vercel.app |
4. Click **Deploy**

---

## Step 3 — Update the redirect URI

After your Vercel URL is assigned (e.g. `https://leadflow-crm.vercel.app`):

1. Go back to Google Cloud Console → **APIs & Services → Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add your live Vercel URL to **Authorised redirect URIs**:
   ```
   https://leadflow-crm.vercel.app/auth/callback
   ```
4. Save

---

## Run locally

```bash
# Copy the example env file
cp .env.example .env

# Fill in .env with your credentials
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# SESSION_SECRET=my-local-secret
# APP_URL=http://localhost:3000

# Install and run
npm install
npm run dev
# → http://localhost:3000
```

---

## Project structure

```
leadflow-crm/
├── api/
│   └── index.js        ← Express server + Google OAuth + Leads API
├── public/
│   ├── index.html      ← Single-page app shell
│   ├── css/app.css     ← All styles
│   └── js/app.js       ← Frontend logic (no framework needed)
├── .env.example        ← Copy to .env and fill in your values
├── vercel.json         ← Vercel routing config
├── package.json
└── README.md
```

---

## Add a persistent database (optional but recommended)

The current backend stores leads **in memory** — they reset on every Vercel deployment or cold start. For persistent data, connect a free database:

### Supabase (PostgreSQL, free tier)
1. Create a project at **https://supabase.com**
2. Run this SQL in the Supabase SQL editor:
   ```sql
   create table leads (
     id text primary key,
     user_email text not null,
     name text not null,
     location text not null,
     email text,
     phone text not null,
     source text not null,
     value text default '0',
     status text default 'New',
     created bigint not null
   );
   ```
3. Install the client: `npm install @supabase/supabase-js`
4. Replace the in-memory `leadsStore` in `api/index.js` with Supabase queries
5. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your Vercel env vars

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/google` | Redirect to Google login |
| `GET` | `/auth/callback` | Google OAuth callback |
| `GET` | `/auth/logout` | Sign out |
| `GET` | `/api/me` | Current user info |
| `GET` | `/api/leads` | Get all leads |
| `POST` | `/api/leads` | Create a lead |
| `PUT` | `/api/leads/:id` | Update a lead |
| `PATCH` | `/api/leads/:id/status` | Update status only |
| `DELETE` | `/api/leads/:id` | Delete a lead |
