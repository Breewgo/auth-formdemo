# Traceability App

Next.js 14 (pages router) + Expo / react-native-web + Supabase, installable as a PWA and works offline.
This repo combines the team's demos into one app:

| Piece | Where it came from | Where it lives now |
|---|---|---|
| Login, roles, form builder, generated forms | this repo (`main`) | `pages/login.js`, `pages/admin/…`, `components/DynamicForm.js` |
| QR code generation + printable sheet | this repo's `qr-generator` branch (based on Raul's qr-generator-demo) | `components/ItemQR.js`, `pages/admin/item-types/[id]/qr.js` |
| QR scanner (expo-camera) | [Optivat/nextjstest](https://github.com/Optivat/nextjstest) `main` | `components/QRScanner.js`, `pages/scan.js` |
| PWA manifest, icons, iPhone (Capacitor) build | [Optivat/nextjstest](https://github.com/Optivat/nextjstest) `pwa-branch` | `public/`, `capacitor.config.ts`, `scripts/package-ios.sh`, `.github/workflows/ios-ipa.yml` |
| Offline storage (IndexedDB) | new; `offlineDBaddition` in the team repo had no code pushed yet | `lib/offlineDb.js`, `components/OfflineStatus.js` |

- **Login & roles:** one login screen; admins go to `/admin`, employees to `/form-demo`.
- **Form builder** (`/admin/item-types/new`): admins define item types and their fields.
- **Generated forms** (`components/DynamicForm.js`): builds the form for any item type from its field definitions.
- **QR codes:** every registered item gets one (it holds the item's id); admins print sheets of them.
- **Scanning** (`/scan`): point the camera at a QR label to see the item and its details.
- **Offline:** forms, item types and saved items work with no signal and upload when it's back.

## Setup

1. Create a Supabase project at supabase.com.
2. SQL Editor → run `supabase/schema.sql`.
3. Authentication → Users → **Add user** (tick *Auto Confirm User*):
   `admin@test.com` and `employee@test.com`, with any password.
4. SQL Editor → run `supabase/seed.sql`. This adds the company, profiles, and the sample types Field, Bin, Truck and Juice Batch.
5. *(Optional)* SQL Editor → run `supabase/langers_seed.sql` to load the Langer's Farm item types (see below).
6. Copy `.env.example` to `.env.local` and fill in the values from Project Settings → API.
7. Install and run:
   ```bash
   npm install
   npm start
   ```
   Then open http://localhost:3000.

## Pages

| Route | Who | What |
|---|---|---|
| `/login` | everyone | Email/password login, then redirects by role |
| `/admin` | admin | Management home |
| `/admin/item-types` | admin | List of item types: edit, delete, view registered |
| `/admin/item-types/new` | admin | Form builder: create a type |
| `/admin/item-types/[id]/edit` | admin | Form builder: edit a type (rename, change fields, reorder, remove) |
| `/admin/item-types/[id]` | admin | Items registered under a type: view, edit, delete |
| `/admin/item-types/[id]/qr` | admin | Printable QR sheet (all items, or one with `?item=<id>`) |
| `/form-demo` | any signed-in user | Pick an item type, fill in its generated form, save to `items` (queued offline) |
| `/scan` | any signed-in user | Scan an item's QR code (or type its id) and see its details |

## Langer's Farm item types

`supabase/langers_seed.sql` loads this set. It's a placeholder based on a typical orchard-to-juice flow; adjust it to the mentor info.
You can also build any of these live in the form builder.

| Type | Contains | Fields (* required, P = public) |
|---|---|---|
| Orchard Block | Harvest Bin | Ranch Name*P, Block ID*, Variety*P (dropdown), Region P, Acres |
| Harvest Bin | | Harvest Date*P, Gross Weight (lbs)*, Bin Grade* (dropdown), Picking Crew |
| Truck Load | Harvest Bin | Load Number*, Departure Date*P, Destination*P (dropdown), License Plate*, Carrier |
| Receiving Lot | Truck Load | Received Date*P, Net Weight (lbs)*, Inspection Result* (dropdown), Brix, Inspector |
| Production Batch | Receiving Lot | Batch Number*P, Production Date*P, Process*P (dropdown), Volume (gal)*, Pasteurization Temp (°F) |
| Bottle Lot | Production Batch | Lot Code*P, Bottling Date*P, Best By Date*P, Bottle Size*P (dropdown), Units Bottled |

### Editing a type
- A field's **key** is fixed once it's created, so relabeling a field doesn't disconnect items already saved under it.
- Removing a field deletes its definition only; values already saved on items are kept and still shown under *View registered*.
- The "Contains" choices hide any type that would create a loop (e.g. Harvest Bin can't contain Bottle Lot).

## Using `DynamicForm`

```jsx
<DynamicForm
  itemTypeId={typeId}
  userId={session.user.id}
  companyId={profile.company_id}
  onSubmit={async (payload) => {
    // payload = { id, company_id, item_type_id, data, created_by, created_at }
    // id is a UUID made on the device, so inserting it twice can't create duplicates.
    await saveItem(payload); // lib/offlineDb.js: inserts now, or queues in IndexedDB when offline
  }}
/>
```

## Security (Row Level Security)
- Users only see rows that belong to their own company.
- Only admins can create or edit item types and field definitions.
- Employees can create items. Only the item's creator or an admin can edit it.

## Offline login
The Supabase session is saved in localStorage, and the profile (role and company) is cached too.
After one online login, reopening the app with no signal still signs you in.

## Offline (IndexedDB)
`lib/offlineDb.js` keeps two IndexedDB stores:
- **cache:** the item type list, each type's field definitions, and items you've scanned. Every Supabase read for these saves a copy, and offline reads use the copy, so a form works offline once it has been opened online.
- **outbox:** items registered with no signal. They upload automatically when the device comes back online (or with *Upload now*). Each item's id is made on the device, so a retried upload can't create a duplicate. If the server rejects an item (e.g. permissions), it stays in the outbox and the reason is shown.

Scanning an item that's still in the outbox shows it as *not uploaded yet*.

## Install as an app (PWA)
`public/manifest.webmanifest` and the icons make the site installable ("Add to Home Screen"). `public/sw.js` is a service worker that saves the app's pages and build files so it opens with no signal.
- It only runs in a production build: `npm run build && npx next start`. In `npm start` (dev) it's off.
- Browsers allow service workers, and phone cameras, only over **https** (or `localhost` on the same machine). To test on a phone, deploy (e.g. Vercel) or use an https tunnel.
- After changing `sw.js`, bump its `VERSION` so phones drop the old cache.

## iPhone app (Capacitor)
From the team's `pwa-branch`. `BUILD_IOS=1 npm run build` exports a static site to `out/`, which Capacitor wraps as an iOS app.
The **Build unsigned iPhone IPA** workflow (Actions tab → Run workflow) builds an unsigned `.ipa` to sideload with Sideloadly. It needs repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, since the static build bakes them in.
