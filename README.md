# Tirupati Puffed Rice Mill — Management System

A cloud-based business management web application for a puffed rice (muri) mill. This is the
foundation release: authentication, the application shell, the dashboard and business settings.
Billing, stock, production, staff, loans and reports are represented by clearly marked
"Coming Soon" pages and will be added in later phases.

## Tech stack

**Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Axios, react-hot-toast
**Backend:** Node.js, Express 5, MongoDB, Mongoose, JWT, bcrypt

Both parts use plain JavaScript (no TypeScript).

## Project structure

```
murii/
├── backend/
│   ├── .env.example
│   └── src/
│       ├── config/        # environment loading and database connection
│       ├── controllers/   # auth and settings request handlers
│       ├── middleware/    # JWT auth, error handling
│       ├── models/        # User, BusinessSettings
│       ├── routes/        # /api/auth, /api/settings
│       ├── services/      # token signing and verification
│       ├── utils/         # async wrapper, HTTP errors, validators
│       ├── app.js         # Express app
│       └── server.js      # startup entry point
└── frontend/
    └── src/
        ├── components/    # layout pieces, form fields, dialogs, icons
        ├── hooks/         # authentication and business-settings contexts
        ├── layouts/       # sidebar + header application shell
        ├── pages/         # login, dashboard, settings, placeholders
        ├── services/      # Axios instance and API calls
        └── utils/         # currency, dates, validation, navigation
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB 6 or newer running locally, or a MongoDB Atlas connection string
- A modern browser (Chrome, Edge or Firefox)

## 1. Install

```bash
# Backend
cd backend
npm install

# Frontend (from the project root, in a second terminal or after returning)
cd frontend
npm install
```

## 2. Configure environment variables

The backend reads its configuration from `backend/.env`. The file is not committed.

```bash
cd backend
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Edit `backend/.env`:

| Variable      | Required | Description                                                        |
| ------------- | -------- | ------------------------------------------------------------------ |
| `MONGODB_URI` | Yes      | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/tirupati_muri` |
| `JWT_SECRET`  | Yes      | Random secret for signing tokens. Must be at least 32 characters.  |
| `PORT`        | No       | Backend port. Defaults to `5000`.                                  |
| `CLIENT_URL`  | No       | Allowed frontend origin for CORS. Defaults to `http://localhost:5173`. |
| `NODE_ENV`    | No       | `development` or `production`.                                     |

Generate a strong JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env` or paste the real secret into frontend code.

The frontend calls `/api` through the Vite development proxy, so no frontend environment
variables are required locally. To point the frontend at a different API host, create
`frontend/.env` with:

```
VITE_API_URL=https://your-api-host/api
```

## 3. MongoDB setup

### Local MongoDB

1. Install MongoDB Community Server for your operating system.
2. Start the MongoDB service (`mongod`). On Windows it normally runs as a service.
3. Verify it is listening on port `27017`.
4. Use `mongodb://127.0.0.1:27017/tirupati_muri` as `MONGODB_URI`. The database and
   collections are created automatically on first write.

### MongoDB Atlas

1. Create a free cluster and a database user.
2. Allow your IP address in Network Access.
3. Copy the connection string and set the database name, for example:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tirupati_muri?retryWrites=true&w=majority`

## 4. Run the application

Use two terminals.

**Terminal 1 — backend**

```bash
cd backend
npm run dev
```

Expected output:

```
MongoDB connected: tirupati_muri at 127.0.0.1
API running on http://localhost:5000 (development)
```

**Terminal 2 — frontend**

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>.

Production commands:

```bash
cd backend && npm start
cd frontend && npm run build
```

## 5. Create the first user

The application ships without any users.

1. Open <http://localhost:5173>. You are redirected to the login page.
2. Click **Create the first user** at the bottom of the sign-in card.
3. Enter the owner name, email and a password of at least 8 characters, then confirm it.
4. Submit the form. The account is created, and the form returns to sign-in with the email
   filled in.
5. Enter the password and sign in.

The setup endpoint refuses to create a second user once an account exists. Passwords are
hashed with bcrypt; they are never stored in plain text. Sessions use a JWT stored in the
browser's local storage and are validated against `GET /api/auth/me` on page load.

## 6. Save business settings

1. Open **Settings** from the sidebar.
2. Update the business name, address, phone, email, GST number or owner name.
3. Click **Save settings**. A confirmation toast appears.
4. Refresh the page. The saved values (and the business name in the sidebar) persist because
   they are stored in MongoDB.

## API endpoints

| Method | Path               | Auth | Purpose                              |
| ------ | ------------------ | ---- | ------------------------------------ |
| GET    | `/api/health`      | No   | Health check and database status     |
| POST   | `/api/auth/setup`  | No   | Create the first (and only) user     |
| POST   | `/api/auth/login`  | No   | Sign in and receive a JWT            |
| GET    | `/api/auth/me`     | Yes  | Return the signed-in user            |
| GET    | `/api/settings`    | Yes  | Read business settings               |
| PUT    | `/api/settings`    | Yes  | Create or update business settings   |

Protected routes expect `Authorization: Bearer <token>`.

## What is included in this release

- Working MERN application with separate frontend and backend
- MongoDB connection through Mongoose
- Single-user authentication: bcrypt hashing, JWT, protected routes, logout
- First-time setup flow for the owner account
- Responsive sidebar/header layout with all 13 navigation entries
- Dashboard shell with empty (₹0) placeholder cards and Indian currency formatting
- Business settings form saved to MongoDB
- "Coming Soon" placeholders for all future modules
- Server-side validation, consistent error responses, loading and empty states, toasts

## What is intentionally not included yet

Retail billing, wholesale, parties, stock, production, staff, expenses, cash book, bank
accounts, loans, reports and WhatsApp integration. No fake invoices, stock, transactions or
accounting calculations are generated by this release.

## Notes

- Currency is formatted for India with the `en-IN` locale, e.g. `₹1,00,000`.
- The interface is English-only and designed desktop-first, with a responsive mobile drawer.
- The frontend dev server proxies `/api` to `http://localhost:5000`. If you change `PORT`,
  update `frontend/vite.config.js` (or set `VITE_API_URL`).

## Troubleshooting

- **Backend exits with "Missing required environment variables"** — `backend/.env` is missing
  or incomplete. Copy `.env.example` and fill in the values.
- **MongoDB connection failed** — confirm the MongoDB service is running and the URI is correct.
- **CORS error in the browser** — make sure `CLIENT_URL` matches the URL you open the frontend on.
- **Port already in use** — change `PORT` for the backend and the proxy target in
  `frontend/vite.config.js`, or stop the process using port 5000/5173.
- **"Initial setup is already complete"** — an account already exists; sign in instead.
