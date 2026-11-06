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

## Environment Variables

Set these in **both** Vercel projects (User Panel and Admin Panel):

| Variable | Value |
|---|---|
| VITE_FIREBASE_API_KEY | your-firebase-api-key |
| VITE_FIREBASE_AUTH_DOMAIN | your-project.firebaseapp.com |
| VITE_FIREBASE_PROJECT_ID | your-project |
| VITE_FIREBASE_STORAGE_BUCKET | your-project.appspot.com |
| VITE_FIREBASE_MESSAGING_SENDER_ID | your-sender-id |
| VITE_FIREBASE_APP_ID | your-app-id |

## Vercel Deployment

### Option A: Two separate Vercel projects (recommended for separate URLs)

1. **User Panel:**
   - Create new Vercel project
   - Import repo, set **Root Directory** to `user-panel`
   - Set Environment Variables (see above)
   - Deploy → gets `user-panel-xxx.vercel.app`

2. **Admin Panel:**
   - Create new Vercel project
   - Import same repo, set **Root Directory** to `admin-panel`
   - Set Same Environment Variables
   - Deploy → gets `admin-panel-xxx.vercel.app`

### Option B: One Vercel project with rewrites

1. Create one Vercel project from this repo root
2. Set Environment Variables
3. Use rewrites in `vercel.json` to route `/admin` to admin panel build

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

The `firestore-sync.js` module bridges localStorage ↔ Firestore automatically.
