# Flamingo Bean Mobile

Expo React Native customer application for browsing products, placing orders, checking out, and viewing account orders.

## Prerequisites

- Node.js 20 or newer
- npm
- The Flamingo Bean backend running locally or at a reachable URL
- One of the following targets:
  - A web browser
  - Android Studio and an Android emulator
  - Xcode and an iOS simulator on macOS
  - Expo Go on a physical device

Firebase configuration is optional. Without it, customers can still use guest checkout.

## Run locally

Run these commands from the `mobile` directory.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example configuration:

   macOS or Linux:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start the FastAPI backend from the repository's `backend` directory. See `backend/README.md` for its complete setup.

4. Set `EXPO_PUBLIC_API_BASE_URL` in `.env` for the target:

   - Web or iOS simulator: `http://127.0.0.1:8000`
   - Android emulator: `http://10.0.2.2:8000`
   - Physical device: `http://<your-computer's-LAN-IP>:8000`

5. Start Expo:

   ```bash
   npm start
   ```

6. Use the Expo terminal shortcuts or run a target directly:

   ```bash
   npm run web
   npm run android
   npm run ios
   ```

The iOS command requires macOS and Xcode. For a physical device, keep the device and development computer on the same network and allow inbound traffic to backend port `8000`.

## Firebase customer accounts

To enable sign-up, sign-in, and customer order history, fill in the `EXPO_PUBLIC_FIREBASE_*` values in `.env` using the public web-app configuration from Firebase.

The backend must use a service account for the same Firebase project. The service-account credential belongs only in the backend; do not copy it into this application.

Restart Expo after changing `.env` so the values are included in the client bundle.

## Checkout

The mobile app sends only product IDs, selected sizes, and quantities. The backend reloads active products and calculates the authoritative total before creating a Square-hosted checkout session. Therefore:

- The backend must be running and reachable from the selected device.
- Square sandbox credentials must be configured in the backend.
- Payment status changes depend on the backend receiving Square webhooks.
- Guest checkout returns an access token shown on the payment-pending screen. Save it securely; the backend stores only its hash.
- Guest status lookup requires both the order number and access token. Signed-in customers use their Firebase identity instead.

No Square access token or webhook secret belongs in the mobile configuration.

## Verification

After the app opens, verify that:

- The product list loads from the backend.
- A guest order can be created.
- Checkout opens the Square sandbox page when Square is configured.
- Sign-up and sign-in appear and work when Firebase is configured.

## Common problems

- **Products do not load:** verify the backend is running and `EXPO_PUBLIC_API_BASE_URL` uses the correct host for the selected target.
- **A physical phone cannot connect:** do not use `127.0.0.1`; use the computer's LAN address and check the firewall.
- **Android cannot connect:** an Android emulator normally reaches the host computer through `10.0.2.2`.
- **Firebase appears disabled:** confirm all required `EXPO_PUBLIC_FIREBASE_*` values are present, then restart Expo.
- **Expo uses stale settings:** stop the server and run `npx expo start --clear`.
- **Checkout fails:** confirm the backend's Square sandbox configuration and public webhook URL.
