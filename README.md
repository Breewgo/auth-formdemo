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
5. Copy `.env.example` to `.env.local` and fill in the values from Project Settings → API.
6. Install and run:
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
| `/admin/item-types` | admin | List of item types and their fields |
| `/admin/item-types/new` | admin | Form builder |
| `/form-demo` | any signed-in user | Pick an item type, fill in its generated form, save to `items` |

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
