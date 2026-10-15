# Traceability App: Auth + Form Builder

Next.js 14 (pages router) + Expo / react-native-web + Supabase.
Same stack as the team demo (github.com/Optivat/nextjstest).

- **Login & roles:** one login screen; admins go to `/admin`, employees to `/form-demo`.
- **Form builder** (`/admin/item-types/new`): admins define item types and their fields.
- **Generated forms** (`components/DynamicForm.js`): builds the form for any item type from its field definitions.

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
| `/form-demo` | any signed-in user | Pick an item type, fill in its generated form, save to `items` |

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
    await supabase.from("items").insert(payload); // or put it in an offline queue
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
