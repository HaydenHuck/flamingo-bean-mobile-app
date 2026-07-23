# Flamingo Bean Admin Dashboard

React and TypeScript staff dashboard for managing orders and menu products.

## Prerequisites

- Node.js 20 or newer
- npm
- The Flamingo Bean backend running locally or at a reachable URL
- An administrator account created by the backend

## Run locally

Run these commands from the `admin` directory.

1. Install dependencies:

   ```bash
   npm install
   ```

2. If the backend is not available at `http://127.0.0.1:8000`, create `.env.local` and set its URL:

   ```text
   VITE_API_BASE_URL=http://your-backend-host:8000
   ```

3. Start the FastAPI backend from the repository's `backend` directory. See `backend/README.md` for database and account setup.

4. Start the dashboard:

   ```bash
   npm run dev
   ```

5. Open `http://127.0.0.1:5173` in a browser.

Vite reloads the page as source files change. Restart the development server after changing `.env.local`.

## Create an administrator

Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`, then run this command from the `backend` directory:

```bash
python scripts/create_admin.py
```

Use that account on the dashboard login screen. The backend stores the short-lived session in an HttpOnly cookie; the dashboard does not persist JWTs in browser storage. State-changing requests include a CSRF token held only in memory.

For deployed environments, both applications must use HTTPS and `ADMIN_COOKIE_SECURE=true`. Plain HTTP local development requires the explicit backend-only `ADMIN_COOKIE_SECURE=false` override documented in the backend README.

## Production-style build

Create an optimized build and run the local preview server:

```bash
npm run build
npm run preview
```

The build output is written to `dist`. A production host must serve that directory, provide the correct `VITE_API_BASE_URL` at build time, use HTTPS, and configure the backend to allow requests from the deployed dashboard origin.

## Verification

After signing in, verify that:

- The dashboard summary loads.
- Orders and order details are visible.
- Order fulfillment status can be updated.
- Products can be created and edited.
- Products can be enabled and disabled.

Running `npm run build` is the project's TypeScript and production-build check.

## Common problems

- **Login fails:** create the administrator again and confirm the backend uses the expected `.env` file and database.
- **The dashboard cannot reach the API:** verify `VITE_API_BASE_URL`, backend port `8000`, and browser developer-console network errors.
- **The browser reports a CORS error:** add the dashboard's exact origin to the backend CORS configuration.
- **Environment changes do not appear:** restart Vite after editing `.env.local`.
- **A previously valid login expires:** sign in again; sessions use the short lifetime configured by `JWT_EXPIRE_MINUTES`.
- **Login succeeds but later requests are unauthorized:** verify the frontend uses `credentials: include`, the backend allows the dashboard's exact CORS origin, and the cookie's Secure/SameSite settings match the deployment.

## Security

Only public client configuration may use the `VITE_*` prefix because Vite embeds those values in the browser bundle. Never place database credentials, administrator passwords, JWT secrets, Square credentials, Firebase Admin credentials, or other backend secrets in this application.
