# Flamingo Bean Backend

FastAPI service used by the Flamingo Bean mobile app and admin dashboard.

## Prerequisites

- Python 3.10 or newer
- A running MySQL server
- Square sandbox credentials if you want to test checkout
- Firebase Admin credentials if you want to test customer accounts

Square and Firebase are optional for basic API development. A MySQL connection is required to start the server.

## Run locally

Run these commands from the `backend` directory.

1. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   ```

   macOS or Linux:

   ```bash
   source .venv/bin/activate
   ```

   Windows PowerShell:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

2. Install the Python dependencies:

   ```bash
   python -m pip install -r requirements-dev.txt
   ```

3. Create an empty MySQL database. The database name is your choice; for example:

   ```sql
   CREATE DATABASE flamingo_bean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. Copy the example configuration:

   macOS or Linux:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Set `DATABASE_URL` in `.env` for your MySQL database:

   ```text
   DATABASE_URL=mysql+pymysql://username:password@localhost:3306/database_name
   ```

6. Apply database migrations:

   ```bash
   python -m alembic upgrade head
   ```

7. Start the development server:

   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

8. Verify that it is running:

   - Health check: `http://localhost:8000/health`
   - Interactive API documentation: `http://localhost:8000/docs`
   - OpenAPI schema: `http://localhost:8000/openapi.json`

The API refuses to start when migrations are missing. After migration, startup seeds the initial products only when the products table is empty.

## Secure checkout lifecycle

1. The client sends customer/fulfillment details plus product IDs, selected sizes, and quantities.
2. The backend retrieves every product from MySQL, rejects missing/inactive products or invalid sizes, applies quantity limits, and calculates subtotal, tax, shipping, and total.
3. The same server-calculated line items and fixed charges are stored locally and sent to Square. Every new order starts as `pending_payment`.
4. Square returns the payment-link and Square order identifiers, which are stored with the expected currency, amount, and location.
5. Only a correctly signed Square payment webhook can mark an order paid. The handler reconciles amount in integer cents, currency, location, Square order ID, payment ID, and checkout state.
6. Each Square event ID is stored once in `webhook_events`. Duplicate deliveries return success without repeating a state change. Audit rows contain limited status/error metadata, not full payment payloads.


## Order authorization

- Firebase-authenticated customers can read only orders whose stored Firebase UID matches their verified token.
- Admin users access orders only through admin-protected routes.
- Guest checkout returns a high-entropy access token exactly once. Only its SHA-256 hash is stored.
- Guest lookup requires both the nonnumeric order number and `X-Guest-Access-Token`; an order number or database ID alone is never authorization.
- Linking a guest order requires a verified Firebase email, the exact guest order number, and its access token. After linking, the guest token is invalidated.

## Optional configuration

### Admin account

Set the `JWT_*` and `ADMIN_*` values in `.env`, then create or update the local administrator:

```bash
python scripts/create_admin.py
```

Restart the API after changing environment variables.

Admin sessions use a short-lived JWT stored only in an HttpOnly cookie. State-changing admin requests also require the session's CSRF token. `ADMIN_COOKIE_SECURE=true` is required for deployed HTTPS environments. If plain HTTP is unavoidable for isolated local development, explicitly set it to `false` only in the uncommitted local `.env`.

### Square sandbox checkout

Add your Square sandbox access token and location ID to `.env`. Configure the return URL for the client that starts checkout.

Webhooks require a public HTTPS URL that forwards to:

```text
POST /webhooks/square
```

Set that URL and its corresponding signature key in `.env`. Use sandbox credentials for local development, and never expose Square credentials to the mobile or admin clients.

#### Start the local ngrok tunnel

Keep the FastAPI server running on port `8000`, then open a second terminal. If your ngrok account has a stable domain, start the tunnel with:

```bash
ngrok http --url your-static-domain.ngrok-free.dev 8000
```

If you do not have a stable domain, run:

```bash
ngrok http 8000
```

Copy the HTTPS forwarding URL printed by ngrok and append `/webhooks/square`. The resulting URL must match both:

- `SQUARE_WEBHOOK_NOTIFICATION_URL` in the uncommitted backend `.env`
- The webhook subscription URL in the Square Developer Dashboard

The URL must match exactly because Square includes it when calculating the webhook signature. Restart FastAPI after changing `.env`.

Leave the ngrok process running while testing payments. Closing its terminal or stopping the process makes the webhook unreachable, so completed Square payments will remain pending locally until Square successfully retries or the failed delivery is resent.

To confirm the tunnel is forwarding to FastAPI, send an unsigned request:

```bash
curl -i -X POST https://your-domain.ngrok-free.dev/webhooks/square \
  -H "Content-Type: application/json" \
  -d "{}"
```

An HTTP `401` response is expected because this test request has no Square signature. A `404` HTML response usually means the ngrok domain is inactive or points somewhere else. The local ngrok inspector is available at `http://127.0.0.1:4040` while the tunnel is running.

### Firebase customer accounts

Firebase is needed only for authenticated customer-account features; guest checkout works without it.

1. Enable the desired sign-in provider in Firebase Authentication.
2. Create a Firebase service-account credential for the project.
3. Store its JSON file outside version control, such as `backend/firebase-service-account.json`.
4. Set `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS_PATH` in `.env`.

Never commit a Firebase service-account file or include it in a client application.

## Configuration hardening

`CORS_ALLOWED_ORIGINS` must contain comma-separated exact origins. Wildcards and URL paths are rejected, and credentialed CORS is never combined with a wildcard.

Request and rate limits use these settings:

```text
MAX_REQUEST_BODY_BYTES=65536
MAX_WEBHOOK_BODY_BYTES=262144
RATE_LIMIT_ADMIN_LOGIN=5/60
RATE_LIMIT_CHECKOUT_CREATION=10/60
RATE_LIMIT_GUEST_ORDER_LOOKUP=30/60
RATE_LIMIT_GUEST_ORDER_LINKING=5/300
TRUSTED_PROXY_IPS=
```

Rate values use `requests/window_seconds`. The built-in limiter is process-local and suitable for one API process. Multi-worker or multi-replica deployments must enforce equivalent shared limits at a trusted reverse proxy/API gateway. `X-Forwarded-For` is ignored unless the direct peer matches an IP/CIDR listed in `TRUSTED_PROXY_IPS`; configure that list only with proxies you operate.

Square webhook retries are not rate-limited by the application. Signature validation, event-ID uniqueness, and transactional idempotency protect that endpoint instead.

## Migrations

Apply all migrations:

```bash
python -m alembic upgrade head
```

Review current revision:

```bash
python -m alembic current
```

Roll back only the security migration:

```bash
python -m alembic downgrade -1
```

Back up MySQL before any rollback. The baseline adoption migration deliberately does not delete existing tables or data on downgrade. Migration `0001` adopts a current development schema or creates a fresh baseline; `0002` adds guest-token hashes, currency/location reconciliation fields, the pending-payment default, and webhook audit records.

## Tests and checks

The tests use a disposable SQLite database and mock Firebase and Square:

```bash
python -m pytest
python -m ruff check app tests alembic scripts
python -m pip_audit -r requirements.txt
```

## Run with the other applications

Keep this API running on port `8000`, then start the mobile app or admin dashboard from its own directory. Configure each client to use the backend URL appropriate for where it runs:

- Browser or iOS simulator: `http://127.0.0.1:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device: `http://<your-computer's-LAN-IP>:8000`

For a physical device, the computer and device must be on the same network and the operating-system firewall must allow inbound traffic on port `8000`.

## Common problems

- **The API exits immediately:** confirm MySQL is running and `DATABASE_URL` is valid.
- **The API reports missing migrations:** run `python -m alembic upgrade head`.
- **A client cannot connect:** check the client API URL, port `8000`, and local firewall settings. A phone cannot use the computer's `127.0.0.1` address.
- **Checkout fails:** confirm the Square credentials are from the same sandbox account and location.
- **Authenticated customer routes fail:** confirm the Firebase project ID and service-account file match the Firebase project used by the client.
- **Environment changes do not appear:** stop and restart Uvicorn after editing `.env`.
- **Admin login works but the session is not retained:** use HTTPS with secure cookies, or set `ADMIN_COOKIE_SECURE=false` only for isolated local HTTP development.

## Security

The `.env` file and service-account credentials are ignored by Git. Keep all database passwords, JWT secrets, Square credentials, and Firebase Admin credentials on the backend only. The committed `.env.example` contains placeholders and documents the supported settings.
