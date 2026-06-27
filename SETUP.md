# VERMILION — Phase 1 setup

Three files, about 10 minutes, no command line. Same pattern you already run: Supabase for data, a single HTML file dropped on Netlify.

## 1 · Create the Supabase project
- New project at supabase.com. When it's ready, open **Settings → API** and copy two things:
  - **Project URL** (e.g. `https://abcd1234.supabase.co`)
  - **anon / public** key (the long one labeled `anon`)
- ⚠️ Copy the **anon** key, never the `service_role` key. The anon key is safe in the browser — the schema's Row Level Security lets the public *read* published works only, and limits all writing to your signed-in account.

## 2 · Run the schema
- Supabase → **SQL Editor → New query** → paste all of `vermilion-schema.sql` → **Run**.
- This builds the tables, security rules, the public `artwork` image bucket, and a safe view-counter. It's idempotent, so re-running never hurts.

## 3 · Create Barbara's login
- **Authentication → Users → Add user.** Enter her email + a password, and tick **Auto Confirm User**.
- That's the only account that can add or edit art. No public sign-up exists.

## 4 · Drop in your three values
Open `vermilion.html`, find the config block near the top of the script, and fill in:
```js
var SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";
var SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
var ARTIST_EMAIL  = "barbara@example.com";   // where "Inquire" buttons send
```
(You can edit this straight in the GitHub web UI, the way you usually do.)

## 5 · Deploy
- Rename `vermilion.html` to **`index.html`**, then drag it onto Netlify (or commit it to the connected repo). That's the whole site.

## 6 · Use it
- Public gallery lives at your site root.
- The studio is at **`yoursite.com/#admin`** — sign in, click **+ New artwork**, upload photos (first = cover, mark close-ups as *Detail*), fill the fields, set **Status → Published**, Save. It appears in the gallery instantly.
- A work stays hidden while it's a **Draft**. Availability cycles Available → Reserved → Sold by clicking the status button on each row.

## What Phase 1 covers
Catalog + collections, multi-image upload, the full metadata profile from your spec, four public viewing modes (gallery, grid, collections, full-screen showcase with keyboard arrows), the full filter set (collection, price, size, medium, color, subject, availability, year, plus text search), light/dark, QR-ready clean URLs (`/#art/{id}`), and a mailto-based "Inquire" button.

## Flagged assumptions / not-yet-built
- **No AI photo enhancement yet** — uploads go up as shot. That's Phase 2, and per our earlier note it'll stay fidelity-first (geometry + background only by default). Until then, shoot evenly lit.
- **"Inquire" is mailto, not captured inquiries** — real inquiry/favorites/wishlist storage is Phase 4.
- **Image bucket is public-read by design** — gallery images must load for any visitor.
- **One artist account** — multi-user isn't needed here; add more users in Supabase if that ever changes.
