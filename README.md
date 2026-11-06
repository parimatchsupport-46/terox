# Terox — User Panel + Admin Panel

Two separate React apps, deployed to two separate Vercel URLs.

## Structure

```
terox/
├── firebase.json          # Firebase project config
├── firestore.rules        # Firestore security rules (edit & copy to Firebase Console)
├── vercel.json            # Root Vercel config (monorepo)
├── .env.example           # Firebase env var template
├── user-panel/            # User panel React app → user-panel.vercel.app
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
└── admin-panel/           # Admin panel React app → admin-panel.vercel.app
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── vercel.json
```

## Firebase Setup (one-time)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Add a Web app (not Android/iOS)
4. Copy the config values:
   - API key, Auth domain, Project ID, Storage bucket, Messaging Sender ID, App ID
5. Go to **Build → Firestore** → Create database (Start in test mode is fine)
6. Go to **Build → Firestore → Rules** tab
7. Open `firestore.rules` from this repo
8. Copy the rules content → paste into Firebase Console → Publish

## Firebase configuration

Both panels use the same frontend Firebase web config in `user-panel/src/lib/firebase.js` and `admin-panel/src/lib/firebase.js`. No Vercel environment variables are required. To use another Firebase project, update both files and redeploy both projects. The web config is public; access must be protected by Firestore security rules.

## Vercel Deployment

### Option A: Two separate Vercel projects (recommended for separate URLs)

1. **User Panel:**
   - Create new Vercel project
   - Import repo, set **Root Directory** to `user-panel`
   - Deploy → gets `user-panel-xxx.vercel.app`

2. **Admin Panel:**
   - Create new Vercel project
   - Import same repo, set **Root Directory** to `admin-panel`
   - Deploy → gets `admin-panel-xxx.vercel.app`

### Option B: One Vercel project with rewrites

1. Create one Vercel project from this repo root
2. Use rewrites in `vercel.json` to route `/admin` to admin panel build

## Firestore Rules

Edit `firestore.rules` when you need to change permissions.
To update: copy file content → paste into Firebase Console → Publish.

## Data Sync

Both panels use the same Firestore collection (`data`) for:
- `terox.users.v1` — user roster
- `terox.chats.v1` — chat threads
- `terox.profile.v1` — user profile
- `terox.prefs.v1` — preferences
- `terox.payreq.v1` — payment requests
- `terox.upi.v1` — admin-set UPI ID used to generate payment QR codes locally
- `terox.dashboard.reset.v1` — server timestamp marking the dashboard reporting period

The `firestore-sync.js` module bridges localStorage ↔ Firestore automatically.

## Payment and dashboard settings

Save the receiver UPI ID in Admin Settings. The user payment page generates a UPI QR locally using that ID and the selected amount, only after receiving the server-confirmed ID. The UPI ID is not verified by the application; verify the recipient in the UPI app. Dashboard reset starts a new reporting period; it does not delete chats, payments, users, or payment settings. Total user counts remain current.

**Security:** The example Firestore rules currently allow public writes. Do not use the payment feature in production until Firebase Authentication and admin-only write rules are in place; otherwise anyone can change the payment recipient.
