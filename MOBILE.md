# Mobile (Capacitor) Setup

This project uses Capacitor to wrap the existing Next.js app so the mobile UI matches the web UI exactly.

## Why Capacitor
- It renders the same HTML/CSS in a WebView, so the responsive layout matches the web app.
- It allows native push notifications with minimal UI rewrites.

## How it works here
- The native shell loads the web app from `CAPACITOR_SERVER_URL`.
- If `CAPACITOR_SERVER_URL` is not set, Capacitor falls back to local assets in `out`.
  - Note: local assets require a static export and are **not compatible** with server-side features.

## Commands
```bash
npm install
npx cap sync
```

Add native platforms:
```bash
npx cap add android
npx cap add ios
```

Open native projects:
```bash
npm run cap:open:android
npm run cap:open:ios
```

## Configure the URL
Set `CAPACITOR_SERVER_URL` to your deployed web app.
Example:
```bash
CAPACITOR_SERVER_URL=https://your-domain.com
```

## Push notifications
The app registers for push notifications in `app/components/push-notifications-bridge.tsx`.
You must:
- Configure Firebase Cloud Messaging (Android) and add `google-services.json`.
- Configure APNs (iOS) and add the required entitlements/certificates.
- Send the device token to your backend inside the `onToken` handler.

## Optional: Static export
If you want local assets in the bundle, you can switch to static export in Next.js.
This requires removing/rewriting server-only features (API routes, dynamic rendering, etc).
