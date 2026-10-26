# Tirupati Puffed Rice Mill — Management System

A cloud-based business management web application for a puffed rice (muri) mill. This release
includes authentication, the application shell, the dashboard, business settings, the product
master, fast retail billing with printable thermal receipts, a ledger-based Muri stock module,
wholesale invoicing with A4 invoices, complete party ledgers with credit limits, payment
receipts, accounts receivable and WhatsApp payment reminders, expense management, a daily cash
book with cash in hand, physical cash counts and adjustments, multi-account bank management
with transaction ledgers and account-to-account transfers, and Muri production entries with
yield and per-KG ratio calculation, finished-stock integration and printable production
history, staff accounts with salary payroll ledgers, a real-data business dashboard with
range filters and a report centre with twelve printable/exportable reports. Every important
document (thermal receipt, wholesale invoice, party ledger, staff ledger, bank ledger, production
report, loan report and every report) can be printed or downloaded as a PDF, and invoices,
ledgers and payment reminders can be shared through WhatsApp click-to-chat. Cancelled
transactions are never deleted: they are marked CANCELLED and kept in an audit trail, and daily
closing compares expected and physical cash with notes. The loan module is still represented by a
clearly marked "Coming Soon" page and will be added in a later phase. The application is
production-ready for deployment on Vercel (frontend), Render or Railway (backend) and MongoDB
Atlas (database).

## Tech stack

**Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Axios, react-hot-toast, jsPDF
**Backend:** Node.js, Express 5, MongoDB, Mongoose, JWT, bcrypt, helmet, express-rate-limit

Both parts use plain JavaScript (no TypeScript).

## Project structure

```
murii/
├── render.yaml            # Render Blueprint for the backend API
├── backend/
│   ├── .env.example
│   └── src/
│       ├── config/        # environment loading and database connection
│       ├── controllers/   # auth, settings, product, sale, stock, party, payment, invoice, expense, cash book, bank account, production, staff, dashboard, report, backup, audit and cancellation handlers
│       ├── middleware/    # JWT auth, async errors, 404 and central error handling
│       ├── models/        # User, BusinessSettings, Product, Sale, Counter, ProductStock, StockTransaction, Party, PartyPayment, WholesaleInvoice, ExpenseCategory, Expense, CashAdjustment, CashCount, BankAccount, BankTransaction, Production, Staff, StaffTransaction
│       ├── routes/        # /api/auth, /api/settings, /api/products, /api/sales, /api/stock, /api/parties, /api/invoices, /api/expenses, /api/cash-book, /api/bank-accounts, /api/production, /api/staff, /api/dashboard, /api/reports, /api/backup, /api/audit
│       ├── services/      # token signing, seeds, sales, wholesale invoices, party ledger, stock, expenses, cash book, bank accounts, production, staff, dashboard aggregation, reports, backup, audit, cancellation, bill numbers
│       ├── utils/         # async wrapper, HTTP errors, validators, stock types, local-date helpers
│       ├── app.js         # Express app (helmet, CORS, body limit, rate limits)
│       └── server.js      # startup entry point
└── frontend/
    ├── .env.example       # VITE_API_URL for deployed builds
    ├── vercel.json        # SPA rewrites for Vercel
    └── src/
        ├── components/    # layout pieces, form fields, dialogs (expense, opening cash, physical cash, bank account, bank transaction, bank transfer, production, cancellation, confirm), receipt, invoice sheet, production report, sales chart, report preview dialog, payment dialog, icons
        ├── hooks/         # authentication and business-settings contexts
        ├── layouts/       # sidebar + header application shell
        ├── pages/         # login, dashboard, reports, settings, products, retail billing, stock, wholesale, parties, party ledger, receivables, expenses, cash book, bank accounts, bank account ledger, production, staff, staff ledger, audit trail, placeholders
        ├── services/      # Axios instance and API calls
        └── utils/         # currency, dates, validation, billing, stock, invoice, production, navigation, report definitions, report CSV/PDF, WhatsApp share helpers and other PDFs
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
| `PORT`        | No       | Backend port. Defaults to `5000` (the host sets it in production).  |
| `CLIENT_URL`  | No       | Allowed frontend origin(s) for CORS, comma-separated. Defaults to `http://localhost:5173`. |
| `NODE_ENV`    | No       | `development` or `production`.                                     |
| `TRUST_PROXY` | No       | Set to `true` behind Render/Railway/Nginx so rate limiting uses the real client IP. |

Generate a strong JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env` or paste the real secret into frontend code.

The frontend calls `/api` through the Vite development proxy, so no frontend environment
variables are required locally. To point the frontend at a different API host, copy
`frontend/.env.example` to `frontend/.env` and set:

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

For hosting (Vercel, Render/Railway, Atlas) see
[21. Production deployment](#21-production-deployment).

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
2. Update the business name, address, phone, email, GST number, owner name, receipt and invoice
   footers, retail Muri rate, wholesale Muri rate, bag weight or low-stock threshold.
3. Click **Save settings**. A confirmation toast appears.
4. Refresh the page. The saved values (and the business name in the sidebar) persist because
   they are stored in MongoDB.

The Muri rates and bag weight are saved as business-level defaults. Retail billing reads the
live retail rate from the product master, not from these business-level defaults. The
low-stock threshold (default **100 KG**) is used by the Stock page and the dashboard warning.

## 7. Manage products

On first start the backend seeds one product, **Muri** (unit KG, retail ₹45, wholesale ₹42, bag
weight 50) if the products collection is empty. Open **Product Management** from the System
section of the sidebar to:

- search, add and edit products with their retail rate, wholesale rate and bag weight;
- deactivate a product, which keeps it in the catalogue but removes it from
  `GET /api/products?active=true` (the list the retail and wholesale screens use).

Products are never hard-deleted, so future transactions can keep referring to them.

## 8. Retail billing

Open **Retail Billing** from the sidebar. The page is designed for fast counter sales:

1. **Product** defaults to the first active product (Muri is seeded). The rate field is
   prefilled from that product's retail rate in the Product Master; it is never hard-coded and
   can still be adjusted for an individual bill.
2. **Amount → KG** is the default mode. Type an amount, or tap a ₹50/₹100/₹200/₹500 shortcut,
   and the quantity is calculated live: `quantity = amount ÷ rate`. At ₹45/KG, ₹100 shows
   **2.22 KG**.
3. Switch to **KG → Amount** to enter the weight instead: `amount = quantity × rate`
   (2.2 KG × ₹45 = ₹99).
4. Choose **Cash**, **UPI**, **Bank** or **Credit**. Credit sales require a
   customer/party name. An optional note can be added.
5. Click **Complete sale**. A success dialog offers **Print receipt**, **Download PDF** and
   **New sale**.

Quantities are stored with up to 6 decimal places for accurate calculations and shown with 2
decimals. Amounts are stored and shown with 2 decimals. Bill numbers are sequential and
concurrency-safe: `R-000001`, `R-000002`, `R-000003`, ...

Every completed retail sale deducts the sold quantity from stock and writes a **Retail Sale**
entry to the stock ledger referencing the bill number. If the requested quantity exceeds the
available stock, the sale is rejected with
`Insufficient Muri stock. Available: <quantity> KG.` and nothing is saved — no bill number is
consumed. See [Stock management](#9-stock-management).

### Receipts

The receipt dialog previews a monospace thermal receipt and lets you switch between **58 mm**
and **80 mm** paper. **Print receipt** uses the browser's print dialog with `@media print` CSS
that hides the application and prints only the receipt at the chosen width. **Download PDF**
saves a matching PDF named `receipt-<bill number>.pdf`. The receipt contains the business
name, address and phone (from Settings), bill number, date and time, product, quantity × rate,
total, payment method, customer/party for credit sales, notes, **Thank You** and the receipt
footer from Settings.

### Sales data

Every sale stores the bill number, sale type (`retail`), product reference plus a snapshot of
the product name and unit, quantity, rate, amount, payment method, customer/party name, note,
timestamps and the stock balance after the deduction. The dashboard's **Today's Sales** and
**Monthly Sales** cards are calculated from these records.

## 9. Stock management

Stock is never a single editable number. **Every change is an append-only transaction** in the
stock ledger, and the current balance is maintained atomically from those movements.

### Opening stock

Open **Stock** from the Operations section. Until opening stock is recorded the page shows a
prompt. Click **Record opening stock**, enter the quantity on hand (for example `500`), and
save. Opening stock can be recorded only once per product; later corrections use **Adjust
stock**. The opening movement appears in the ledger as **Opening Stock**.

### Recording movements

The Stock page shows:

- **Current stock** in KG and the equivalent number of bags from the product's configured bag
  weight (500 KG ÷ 50 KG = 10 bags);
- the configured minimum stock and when the last movement happened;
- the **stock ledger** with date, transaction type, reference, in, out and running balance;
- actions for **Add stock** (purchase/stock addition), **Record wastage** and **Adjust stock**
  (signed correction). Retail sales and wholesale invoices are added automatically from their
  billing screens.

The balance follows one rule, implemented in one place
(`backend/src/services/stockService.js`):

```
opening + purchases + production − retail sales − wholesale sales − wastage + adjustments
```

### Retail sales and insufficient stock

Completing a ₹100 sale at ₹45/KG is a 2.222222 KG movement. The stock decreases from 500 KG to
**497.778 KG** (shown as **497.78 KG**), and the ledger receives a **Retail Sale** row with
quantity `-2.222222`, reference `R-000001`, and the resulting balance.

The deduction uses an atomic conditional update, so two concurrent sales can never take stock
below zero. A sale larger than the available stock (for example 600 KG when 497.78 KG remain)
is rejected with:

```
Insufficient Muri stock. Available: 497.78 KG.
```

The sale is not saved, the stock balance is unchanged, and the bill number is not consumed.
The billing screen also warns before submission when the calculated quantity exceeds the
available stock.

### Wholesale invoices and stock

Saving a wholesale invoice deducts its quantity with the same atomic conditional update and
writes a **Wholesale Sale** ledger entry that references the invoice number, for example
`INV-000001`. The invoice is rejected with `Insufficient Muri stock. Available: <quantity> KG.`
when the quantity exceeds the balance; nothing is saved, the stock balance is unchanged, and no
invoice number is consumed. The wholesale screen shows the available stock and warns before
submission. See [Wholesale invoices](#10-wholesale-invoices).

### Low-stock threshold

Set the minimum stock in **Settings → Rates and packaging** (default 100 KG). When a product
with recorded opening stock falls below the threshold, the Stock page and the dashboard show a
**Low stock warning** with the current balance. The warning is derived from live stock data,
never stored separately.

### Dashboard

The **Muri Stock** card shows the current balance, bag count and low-stock minimum from the same
stock service, and the low-stock warning links to the Stock page. See
[17. Business dashboard](#17-business-dashboard).

### Transaction types and production

The ledger understands Opening Stock, Production, Retail Sale, Wholesale Sale, Wastage,
Adjustment and Purchase/Stock Addition. This release writes opening stock, purchases, wastage,
adjustments, retail sales, wholesale sales and production. Production uses the same
`applySignedMovement` service as every other movement, so the balance and ledger stay
consistent. Raw material is not a stock item in this release: it is kept on the production
record only, so no stock is created or deducted for it.

## 10. Wholesale invoices

Open **Wholesale** from the Operations section. The page has two tabs: **New invoice** and
**Invoice history**.

### Parties

Wholesale invoices are raised against a party. Parties can be added from the Wholesale screen
or managed from the standalone **Parties** page (name, phone, address, opening balance, credit
limit, notes and active status). The party name and phone are copied onto each invoice when it
is saved, so later edits do not change historical invoices. Inactive parties cannot receive new
invoices, but they keep their ledger and can still make payments. See
[Parties, ledgers and credit management](#11-parties-ledgers-and-credit-management).

### Creating an invoice

1. Select an existing **party**.
2. Select an active **product**. Muri is selected automatically when present.
3. The **rate** is prefilled from the product's wholesale rate and can be adjusted for this
   invoice; it is never hard-coded.
4. Enter the **quantity** in the product unit (KG for Muri). The invoice total is calculated
   live from `quantity × rate`.
5. Choose **Cash**, **UPI**, **Bank** or **Credit**.
6. Enter the **amount received**, or use **Full payment** / **No payment**. The balance due is
   calculated live as `total − paid` and cannot be negative; an amount greater than the total
   is rejected.
7. Optionally add notes (printed on the invoice), then click **Save invoice**.

For example, 500 KG × ₹50 = **₹25,000**. With ₹10,000 received, the invoice has **paid
₹10,000** and **due ₹15,000**, and its status is **Partially Paid**. Saving it also deducts
500 KG from stock (1,000 KG → 500 KG) and writes a Wholesale Sale row to the ledger referencing
`INV-000001`.

Invoice numbers are sequential and concurrency-safe: `INV-000001`, `INV-000002`, and so on.
Numbers are generated on the server after stock is reserved, so a rejected invoice never
consumes a number. Each invoice stores the number, party reference and name/phone snapshot,
product reference and name/unit snapshot, quantity, rate, amount, total, paid, due, payment
method, status, notes and timestamps. Paid and due are stored per invoice; the party balance is
not stored — it is calculated from the opening balance, invoices and receipts as described
below. Inactive parties cannot receive new invoices. When a party has a credit limit, a new
invoice with an amount due cannot take its outstanding above that limit; the invoice is
rejected with a message showing the available credit and the amount this invoice would add.
Fully paid invoices (due zero) are always allowed.

Statuses are derived from the amounts: **Paid** (`due` is zero), **Partially Paid** (some
amount received), and **Credit** (nothing received).

### A4 invoice, print and PDF

After saving, the invoice dialog shows an A4-styled preview with the business header from
Settings (name, address, phone, email, GSTIN), invoice number, date, status, party details, the
product line (quantity, rate, amount), the payment method and notes, and the Total, Paid and
Due totals plus the invoice footer.

- **Print invoice** uses the browser print dialog with `@media print` rules that hide the
  application and print only the A4 invoice (`@page size: A4`).
- **Download PDF** saves `invoice-<number>.pdf` with the same A4 layout. The PDF uses `Rs.`
  instead of `₹` because the built-in PDF fonts do not include the rupee glyph.
- **Share on WhatsApp** opens click-to-chat with the party's phone and a message containing the
  business name, invoice number, date, total, paid and outstanding. The button is disabled when
  the party has no phone number, and nothing is sent until you press Send in WhatsApp.
- **New invoice** closes the dialog and clears the quantities for the next sale.

### Invoice history

The **Invoice history** tab lists invoices newest first with invoice number, date, party,
total, paid, due, status and a **View** action that reopens the printable invoice. Three
summary cards show **Invoice sales**, **Amount received** and **Balance due** for the current
filter, calculated on the server from invoice-level records.

Search matches the invoice number, party name or phone. **From date** and **To date** filter by
invoice date; both bounds are inclusive and the list shows the latest 200 matching invoices.
**Clear filters** resets the search and dates.

## 11. Parties, ledgers and credit management

Open **Parties** from the Operations section to manage every customer or supplier account, and
**Receivables** from the Finance section for the outstanding report.

### Party management

The Parties page lists every party with phone, opening balance, credit limit, status and
actions. Search matches the name or phone, and the status filter shows all, active-only or
inactive-only parties. **Add party** and **Edit** open a dialog with:

| Field             | Notes                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Name              | Required                                                           |
| Phone             | Required; used for search and WhatsApp reminders                    |
| Address           | Optional                                                           |
| Opening balance   | Amount already owed when the party was added; `0` or more          |
| Credit limit      | Maximum outstanding allowed for new credit invoices; `0` = no limit |
| Notes             | Optional, up to 500 characters                                     |
| Active            | Inactive parties keep their history but cannot receive new invoices |

Parties are never hard-deleted. Editing a party does not rewrite the name or phone copied onto
historical invoices and payments.

### Party ledger

Open a party with **Ledger** on the Parties or Receivables page. The ledger shows **Date**,
**Reference**, **Description**, **Debit**, **Credit** and **Balance**, and the page shows total
invoices, total sales, total received, outstanding and the credit-limit position.

- **Debit** is what the party owes: the opening balance and invoice totals.
- **Credit** is money received: the amount paid when an invoice was created plus every later
  payment receipt.
- **Balance** is the running `debit − credit` including the opening balance. The current
  outstanding is `opening balance + total invoice value − total received`.

Nothing writes a balance directly. Every figure is recalculated from the opening balance,
invoices and recorded payments each time the ledger is requested. The opening-balance row is
always shown first, then transactions in date order. A payment received on the same day as an
invoice is shown after that invoice.

Example: opening balance **₹5,000**, an invoice for **₹20,000** with **₹5,000** paid, and a
later **₹10,000** receipt produce this ledger:

| Date  | Reference  | Description      | Debit    | Credit   | Balance  |
| ----- | ---------- | ---------------- | -------- | -------- | -------- |
| 01 Oct| Opening    | Opening balance  | ₹5,000   | —        | ₹5,000   |
| 05 Oct| INV-000001 | Wholesale invoice| ₹20,000  | ₹5,000   | ₹20,000  |
| 10 Oct| PAY-000001 | Payment received | —        | ₹10,000  | ₹10,000  |

The party's outstanding is **₹10,000**.

### Receive payment

Use **Receive payment** on the party page. The party is fixed by the dialog, and the form asks
for the **amount**, **payment method** (**Cash**, **UPI** or **Bank**), **payment date** (today
or earlier) and optional **notes**. UPI and bank payments are recorded into the **bank**
account; cash is recorded into the **cash** account. The dialog previews the outstanding after
the payment and offers **Full outstanding**.

Saving a payment:

- creates a numbered payment receipt (`PAY-000001`, `PAY-000002`, ...) with a snapshot of the
  party name and phone;
- adds a **Credit** row to the party ledger and reduces the outstanding immediately;
- increases the cash or bank collection totals shown on the Receivables page.

Payments are rejected when the amount is zero or negative, when the date is in the future, or
when the account does not match the method (cash payments must use the cash account, UPI and
bank payments the bank account). A payment larger than the outstanding is allowed and leaves
the party with an advance; no invoice is created. A rejected payment does not consume a
payment number.

### Accounts receivable

The **Receivables** page lists only parties with a positive outstanding balance, sorted from
the highest amount due. Each row shows the party, phone, outstanding amount, last payment and
last invoice dates, credit limit and actions to open the ledger or send a reminder. The four
summary cards show **Total receivable**, **Parties with dues**, **Cash received** and **Bank
received**. The cash and bank cards are all-time totals of recorded receipts and are not
affected by the search box. Search matches the party name or phone.

The **Party Receivable** card on the dashboard uses the same total and shows how many parties
have dues.

### Credit limits

A credit limit of `0` means no limit. Otherwise:

```
available credit = max(credit limit − current outstanding, 0)
```

A new invoice with an amount due larger than the available credit is rejected before stock is
reserved or an invoice number is used:

```
Credit limit exceeded. Available credit: ₹2,000.00; this invoice would add ₹2,500.00 to the outstanding.
```

An invoice that is fully paid at creation adds nothing to the outstanding and is always
allowed. A credit invoice may bring the outstanding to exactly the limit; anything above it is
rejected.

### WhatsApp payment reminders

**Send Payment Reminder** on the party page, or **Remind** on the Receivables page, opens
WhatsApp click-to-chat (`https://wa.me/<phone>?text=<message>`) with a pre-filled message:

```
Dear ABC Traders,

This is a payment reminder from Tirupati Puffed Rice Mill. Your outstanding balance is ₹5,000.00.

Please arrange the payment at your earliest convenience.

Thank you,
Tirupati Puffed Rice Mill
```

The message contains the party name, outstanding amount and business name. The button is
disabled when nothing is due. Phone numbers are normalised for WhatsApp: spaces and punctuation
are removed, a leading `0` on an 11-digit number is dropped, and a 10-digit Indian number gets
the `91` country code. No paid WhatsApp API, template approval or server-side messaging is used
— the user reviews the message in WhatsApp and sends it themselves.

### Send ledger on WhatsApp

**Send Ledger on WhatsApp** on the party page opens click-to-chat with a statement summary
containing the party name, the date it was generated, the opening balance, total invoices, total
payments received and the current outstanding. It is available even when nothing is due (for
example as a settled-account confirmation) and is disabled only when the party has no phone
number. The message is built from the same ledger figures shown on the page; the detailed
transaction lines are not included, and **Ledger PDF** is the way to share the full statement.

### End-to-end example

With 1,000 KG of opening stock and a 500 KG invoice at ₹40:

1. Create **ABC Traders** with opening balance `0` and credit limit `₹50,000`.
2. Raise an invoice for **₹20,000** with **₹5,000** paid. The ledger shows debit ₹20,000,
   credit ₹5,000, balance **₹15,000**; stock becomes 500 KG.
3. Record a **₹10,000 cash** payment. The outstanding becomes **₹5,000**, the ledger balance
   becomes ₹5,000, cash received becomes ₹10,000 and the dashboard receivable falls by ₹10,000.
4. Try a 10 KG credit invoice for ABC. It is rejected with the credit-limit message, stock and
   invoice numbers are unchanged.

## 12. Expense management

Open **Expenses** from the Finance section. The page records day-to-day mill costs and shows
**Total expenses**, **Paid from cash**, **Paid from bank** and **Expense entries** for the
current filters.

### Categories

Eleven categories are seeded on first start, in this order: **Electricity**, **Fuel**,
**Transport**, **Salary**, **Maintenance**, **Rent**, **Packaging**, **Repairs**,
**Bank Charges**, **Loan Interest** and **Miscellaneous**. Seeds use insert-only writes, so
renaming or adding categories later never duplicates or overwrites them.

Custom categories can be added from the category dropdown in the expense dialog (**Add**) or
with `POST /api/expenses/categories`. Names are trimmed, limited to 60 characters and checked
case-insensitively; a duplicate returns `409`.

### Recording an expense

| Field           | Notes                                                                |
| --------------- | -------------------------------------------------------------------- |
| Expense date    | Required; cannot be in the future                                     |
| Amount          | Required; greater than zero                                          |
| Category        | Required; a seeded or custom category                                |
| Payment method  | **Cash**, **UPI** or **Bank**                                        |
| Cash/bank account | Derived from the method: cash payments use the cash account, UPI and bank payments the bank account |
| Description     | Required, up to 200 characters                                       |
| Notes           | Optional, up to 500 characters                                       |

Expense numbers are sequential and concurrency-safe: `EXP-000001`, `EXP-000002`, and so on.
The number is allocated only after validation succeeds, so a rejected expense never consumes a
number. The cash book reads only **cash** expenses; UPI and bank expenses are recorded and
listed but never reduce cash in hand.

The list can be searched by expense number, description, category or notes and filtered by
category and an inclusive **From**/**To** date range. It shows the latest 200 matching rows
while the summary cards cover every expense matching the filters.

## 13. Cash in hand and the daily cash book

Open **Cash Book** from the Finance section. The daily cash book follows one formula, computed
from stored transactions on every request:

```
Opening Cash + Cash Sales + Cash Collections + Other Cash Income
  − Cash Expenses − Cash Payments − Other Cash Outflows
= Closing Cash
```

### Opening cash

Set the opening cash once with **Opening cash**: an amount and an **opening date** (today or
earlier). Opening cash is the cash on hand at the **start** of that date, so cash movements
before the opening date are excluded rather than mixed into the balance. Opening a date before
the configured opening date shows zeroes, a notice that opening cash starts later, and a
disabled physical count. Changing the amount or date recalculates every cash book figure,
including the dashboard.

### Daily closing

The page has **Previous day** / **Next day** / **Today** navigation and a date picker. The
**Daily closing** card shows the nine closing figures in order:

| Row                      | Source                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| Opening cash             | Opening balance plus the net cash flow of all earlier days             |
| Cash sales               | Retail sales paid in cash and the paid portion of cash wholesale invoices |
| Cash collections         | Cash payments received from parties (`PAY-...`)                        |
| Cash expenses            | Cash operating expenses plus cash expenses in the **Loan Interest** category |
| Staff payments           | Cash expenses in the **Salary** category plus cash staff advances and salary payments (`STF-...`) |
| Other cash transactions  | Net of cash-count surplus and shortage adjustments (`ADJ-...`)         |
| Expected closing cash    | Opening + cash sales + collections + other − cash expenses − staff     |
| Physical cash            | The latest cash amount counted for the date, or **not counted yet**    |
| Difference               | Physical cash minus expected closing cash                              |

Each cash expense is counted once: Salary goes to **Staff payments**, Loan Interest to **Cash
expenses**, and every other cash expense to **Cash expenses**. UPI and bank expenses are excluded
entirely. The card also shows the recorded **closing notes**, the count time and whether the cash
book was adjusted.

The **Cash transactions** table lists every cash movement for the selected date with reference,
description, cash in, cash out and running balance. The running balance starts at the opening
cash and ends at the expected closing cash.

### Credit sales are not cash

A credit transaction raises sales and receivables but never cash. A ₹20,000 credit invoice
produces **Sales ₹20,000**, **Cash ₹0** and **Receivable ₹20,000**; it does not appear in the
cash book. Wholesale invoices with `paymentMethod: cash` contribute only their **paid** amount,
never the unpaid due.

### Physical cash and closing notes

**Daily closing** (or **Update closing**) opens the closing dialog for the selected date. It
shows the expected closing cash, the physical amount, the live **Difference** and prefills the
previous count, reason and notes when one exists.

- With **Adjust cash book to match** unticked, the count is stored for comparison only.
- With it ticked, the difference is written as a numbered adjustment (`ADJ-000001`, ...) and
  appears under **Other cash transactions**.
- A **reason** is required whenever the cash book is adjusted for a non-zero difference.
  A matched count creates no adjustment and needs no reason.
- **Closing notes** (up to 500 characters) are saved with the count and shown on the daily
  closing card.

A count cannot be recorded for a future date or before the opening date. If creating the
adjustment fails, the count is rolled back, so the two collections never disagree.

### Worked example

Starting with no recorded cash, then setting opening cash **₹10,000** on today's date:

1. A **₹5,000 cash** retail sale raises closing cash to **₹15,000**.
2. A **₹2,000 cash** expense (Electricity) lowers it to **₹13,000** — the expected result.
3. A **₹20,000 credit** invoice is saved. Cash stays at **₹13,000**; sales and receivables
   rise by ₹20,000.
4. A **₹100 UPI** expense is recorded. Cash is still **₹13,000**.
5. A party pays **₹1,000 in cash**. Cash becomes **₹14,000**.
6. Counting **₹13,900** and adjusting writes `ADJ-000001` for ₹100, closing at **₹13,900**.

### Dashboard

The **Expenses** card shows expenses dated inside the selected range (with the cash portion),
and **Cash in Hand** shows closing cash as of the range end from the cash book service. The
cash-flow section splits cash sales, collections, expenses and staff payments. All figures are
derived from actual transactions, never stored totals. See
[17. Business dashboard](#17-business-dashboard).

## 14. Bank accounts and transactions

Open **Bank Accounts** from the Finance section. Multiple accounts can be tracked at the same
time, each with its own ledger, balance and daily totals.

### Accounts

**Add account** asks for:

| Field            | Notes                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Bank name        | Required, e.g. `SBI`, `HDFC Bank`                                   |
| Account name     | Required, e.g. `Tirupati Puffed Rice Mill — Current Account`        |
| Account number   | Required, 4–34 letters or digits; spaces and dashes are ignored     |
| Opening balance  | Balance already in the account; `0` or more                         |
| Active           | Inactive accounts keep their history but cannot receive transactions |

Account numbers are normalised (spaces and dashes removed, letters uppercased) and must be
unique; a duplicate returns `409`. The full number is stored but **never returned by the API**:
every response contains only a masked value such as `•••• 9012`. Editing an account leaves the
number field blank and shows the current masked number, so the stored number is preserved
unless a new one is entered.

### Balances

No balance is stored. Each account balance is recalculated from its transactions on every
request:

```
Opening balance + inflows − outflows = Current balance
```

A negative result is allowed and is shown in red; the app does not block an overdraft, it
records what actually happened. The **Bank Accounts** page shows every account with its
**Account**, **Balance**, **Today's inflow** and **Today's outflow**, plus summary cards for
**Total bank balance**, **Active accounts** and today's total inflow/outflow. Clicking an account
opens its ledger. The account page also offers **Ledger PDF**, which downloads the full
transaction ledger with the account summary and running balance.

### Transaction ledger

The account details page shows the current balance, opening balance, today's inflow and outflow
and the transaction count, followed by the ledger: an **Opening balance** row first, then every
transaction in date order with reference, description, in, out and running balance. Transfer
rows show the counterparty account (for example `HDFC Bank · •••• 2345`).

**Record transaction** supports these manual types:

| Type            | Direction | Typical use                               |
| --------------- | --------- | ----------------------------------------- |
| Deposit         | Inflow    | Cash or cheque deposited into the account |
| Withdrawal      | Outflow   | Cash withdrawn from the account           |
| Sales collection| Inflow    | Money collected from a sale               |
| Party payment   | Inflow    | Payment received from a party             |
| Expense         | Outflow   | A cost paid from the account              |
| Loan receipt    | Inflow    | Loan or borrowing credited                |
| Loan repayment  | Outflow   | Loan instalment paid                      |
| Other           | Chosen    | Any other movement; **In** or **Out** must be selected |

Each entry needs an amount greater than zero, a date (today or earlier) and a description of up
to 200 characters, with optional notes. Numbers are sequential: `BTX-000001`, `BTX-000002`, ...
Inactive accounts reject new transactions. The dialog previews the balance after the entry.

### Transfers between accounts

**Transfer** moves money between two different active accounts, for example **SBI → HDFC**:

- the source account decreases by the amount;
- the destination account increases by the same amount;
- the total business money is unchanged.

A transfer writes **two linked rows** that share one `TRF-000001` number: an outflow on the
source and an inflow on the destination, each naming the other account. Transfers to the same
account are rejected, and both entries must use an active account. If the second row cannot be
written, the first is deleted, so a transfer never exists on one side only.

### Automatic entries from other modules

When a bank account is selected, the related module also writes a bank transaction:

| Source                                        | Type               | Direction |
| --------------------------------------------- | ------------------ | --------- |
| Wholesale invoice paid by **UPI** or **Bank** | Sales collection   | Inflow    |
| Party payment received by **UPI** or **Bank** | Party payment      | Inflow    |
| Expense paid by **UPI** or **Bank**           | Expense            | Outflow   |
| Staff advance or payment by **UPI** or **Bank** | Staff payment    | Outflow   |

Only the **paid** portion of a wholesale invoice is credited; the unpaid due is not. Cash
transactions never touch a bank account. The bank account selector appears on those forms when
the method is UPI or Bank, listing active accounts with masked numbers and current balances,
and is required when money is actually moving. If the bank movement fails, the invoice,
payment, expense or staff entry is rolled back (and stock reservations are released for
invoices), so the source record and the bank ledger never disagree.

### Worked example

1. Add **SBI Current Account** with opening balance **₹1,00,000**.
2. Record a **₹20,000 deposit**. Balance is **₹1,20,000**.
3. Record a **₹5,000 expense** paid from SBI. Balance is **₹1,15,000** — the expected result.
4. Add **HDFC Bank** with opening balance **₹50,000**.
5. Transfer **₹10,000** from SBI to HDFC. SBI shows **₹1,05,000**, HDFC **₹60,000**, and the
   total stays **₹1,65,000**.

### Dashboard

The **Total Bank Balance** card shows the current combined balance of every bank account and how
many accounts are active, recalculated from the bank ledgers on every request. See
[17. Business dashboard](#17-business-dashboard).

## 15. Muri production and yield calculation

Open **Production** from the Operations section. Every saved production record adds the finished
Muri quantity to stock once and keeps the raw material quantity on the record only.

### Recording production

1. Click **Record production**.
2. Choose the **production date** (today is prefilled; future dates are rejected).
3. Optionally enter the **production cost** for the batch.
4. Enter the **raw material quantity** in KG processed in this batch.
5. Enter the **finished muri quantity** in KG. This is the amount added to Muri stock.
6. Optionally enter the **wastage / loss** in KG and **notes** (up to 500 characters).
7. Check the live ratio panel, then click **Save production**.

| Field              | Rule                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| Production date    | Required; cannot be in the future                                     |
| Raw material (KG)  | Required; greater than zero                                           |
| Finished muri (KG) | Required; greater than zero                                           |
| Wastage / loss     | Optional; zero or more                                                |
| Production cost    | Optional; zero or more                                                |
| Notes              | Optional; up to 500 characters                                        |

Production numbers are sequential and assigned by the server: `PROD-000001`, `PROD-000002`, and
so on. Validation runs before the number is allocated, so a rejected entry does not consume a
number. The record is linked to the Muri product.

### Ratio calculation

Both ratios are calculated from the stored quantities and shown on the form, in the history and
in the PDF — they are never entered or stored separately:

- **Yield %** = finished muri ÷ raw material × 100
- **Raw material per KG** = raw material ÷ finished muri

For example, raw material **100 KG** and finished muri **250 KG** give a yield of **250%** and
**0.40 KG** of raw material per KG of muri.

### Stock integration and double counting

Saving a production record writes one **Production** stock movement for the finished quantity,
referencing the `PROD-` number, for example `Raw material 100 KG → finished 250 KG`. The Muri
stock balance therefore increases by exactly the finished quantity, and the movement appears in
the Stock ledger like every other transaction.

Raw material is **not** deducted from stock and no raw-material stock is created, because raw
material inventory is not part of this release. The quantity is kept on the production record
as information, so the same batch cannot be counted twice. If the stock movement fails, the
production record is deleted, so the record and the stock ledger never disagree.

### Production history

The page lists **Date**, **Production number**, **Raw material**, **Finished Muri**,
**Wastage** and **Yield** (with raw material per KG below it), newest first and limited to 200
rows. **Search** matches the production number or notes, and the **From** / **To** date filters
are inclusive. The four summary cards — **Finished Muri**, **Raw material**, **Wastage / loss**
and **Yield** — always reflect the current filters.

**Print** opens an A4 production-history preview and **Download PDF** saves the same report.
Both include the applied filters, every matching row and a totals row.

### Dashboard

The **Production** card and section show finished Muri for the selected range, the batch count,
average yield, raw material, wastage and production cost. See
[17. Business dashboard](#17-business-dashboard).

### Worked example

1. Enter raw material **100 KG** and finished muri **250 KG**. The form shows yield **250%** and
   **0.40 KG** raw per KG.
2. Save. The record becomes **PROD-000001** and Muri stock increases by **250 KG**.
3. The Stock ledger shows a **Production** row of **+250 KG** referencing **PROD-000001**.

## 16. Staff management and staff ledger

Open **Staff** from the Operations section. Every staff member has their own account, and the
ledger and balances are calculated from the recorded entries on every request.

### Staff details

| Field          | Rule                                                        |
| -------------- | ----------------------------------------------------------- |
| Name           | Required, up to 150 characters                              |
| Phone          | Required; valid phone number of up to 20 characters         |
| Role           | Required, up to 100 characters (e.g. Supervisor, Operator)  |
| Joining date   | Required; cannot be in the future                           |
| Monthly salary | Required; greater than zero                                 |
| Status         | **Active** or **Inactive**                                  |
| Notes          | Optional, up to 500 characters                              |

Inactive staff keep their history but cannot receive new ledger entries. The list page shows
each staff member with their role, phone, joining date, monthly salary, remaining payable and
status, with search across name, phone and role plus an active/inactive filter.

### Entry types

| Type             | Ledger side | Effect on payable | Moves cash or bank |
| ---------------- | ----------- | ----------------- | ------------------ |
| Salary           | Debit       | Increases         | No                 |
| Bonus            | Debit       | Increases         | No                 |
| Advance          | Credit      | Reduces           | Yes                |
| Payment          | Credit      | Reduces           | Yes                |
| Deduction        | Credit      | Reduces           | No                 |
| Loan recovery    | Credit      | Reduces           | No                 |

**Debit** increases what the mill owes the staff member; **credit** reduces it. Only **Advance**
and **Payment** move money — they reduce the cash book (cash) or the selected bank account (UPI
or Bank). Salary, bonus, deduction and recovery are book entries and never touch cash or bank.

Entries are numbered sequentially by the server: `STF-000001`, `STF-000002`, and so on, and a
rejected entry does not consume a number.

### Salary entry

One salary entry is allowed per staff member per month. Choose the **salary month** (a `YYYY-MM`
value; future months are rejected) and the amount defaults to the staff member's monthly salary,
which can be adjusted. A second entry for the same month is rejected with a clear message. The
monthly salary screen shows the calculation the owner expects:

```
Salary:     ₹15,000
Advance:    ₹ 3,000
Remaining:  ₹12,000
```

### Staff ledger

The staff detail page shows **Date**, **Description**, **Debit**, **Credit** and **Balance** with
a running balance, plus the entry type, the `STF-` reference and the salary month where relevant.
Four cards summarise the account at all times: **Salary payable** (salary + bonus),
**Payments made**, **Advance** and **Remaining payable**. A sidebar repeats the equation:

```
Salary payable − deductions − advance − paid = remaining payable
```

**Ledger PDF** downloads the full staff ledger with the summary cards, every entry and the
running balance.

### Recording a payment

Click **Record payment** (or **Record an advance**) and choose **Cash**, **UPI** or **Bank**:

- **Cash** reduces the daily cash book as a staff payment row.
- **UPI** or **Bank** reduces the selected bank account through a `staff-payment` outflow,
  listed in the account ledger like any other bank transaction.

If the bank movement fails, the staff entry is deleted, so the ledger and the bank balance never
disagree.

### Dashboard and reports

Cash advances and salary payments appear in the dashboard's **Cash flow → Staff payments** row;
the salary accrual itself never moves cash. The **Staff Report** (see
[18. Reports](#18-reports)) lists salary, bonus, advances, payments, deductions and remaining
payable for every staff member, with date filters and exports.

### Worked example

1. Add **Ramesh Kumar** with monthly salary **₹15,000**.
2. Record the **October 2026 salary** of **₹15,000**. Salary payable **₹15,000**, remaining
   payable **₹15,000**.
3. Pay an **advance of ₹3,000** in cash. Remaining payable **₹12,000**, and the cash book's staff
   payments increase by **₹3,000**.
4. Pay the remaining **₹12,000**. Remaining payable **₹0** and all dues are settled — the
   expected result.

## 17. Business dashboard

The dashboard is calculated entirely from recorded transactions on the server. It loads through
a single `GET /api/dashboard` request and never receives a transaction list to total in the
browser, and it contains no mock or sample figures.

### Date range

| Range      | Period                                                       |
| ---------- | ------------------------------------------------------------ |
| Today      | Today only                                                   |
| This Week  | Monday of the current week through today                     |
| This Month | The 1st of the current month through today                   |
| Custom     | Any two dates up to today, at most 366 days, with from ≤ to  |

The selected range drives the sales, expense, cash-flow, production and chart figures. Cash in
hand is the closing balance on the range end date; stock, bank and party balances are current.
Every request returns the resolved range (`key`, `fromKey`, `toKey`, `days`, `label`) so the UI
and the API always agree on the period.

### Cards

| Card                  | Source                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Sales                 | Retail `Sale.amount` + wholesale `WholesaleInvoice.total`, including credit invoices |
| Expenses              | `Expense.amount` in the range, split into cash and bank                |
| Cash in Hand          | Closing cash from the cash book service on the range end date          |
| Total Bank Balance    | Sum of derived bank-account balances (`opening + inflow − outflow`)    |
| Party Receivable      | Opening balances + invoices − invoice receipts − party payments        |
| Muri Stock            | Current stock quantity, bag count and low-stock threshold              |
| Production            | Finished Muri in the range, batch count and average yield              |
| Loan Outstanding      | Shown as **not tracked**; the loan module is not part of this release  |

### Sections

- **Sales** — retail, wholesale and total sales, bill counts, wholesale paid/due, and a daily
  stacked bar chart. Ranges longer than 62 days switch the chart to monthly buckets.
- **Monthly sales** — current month versus the previous month, with the amount and percentage
  change. This comparison always uses whole calendar months, independent of the range selector.
- **Expenses** — today's and this month's expenses plus the top five expense categories.
- **Cash flow** — cash inflow, cash outflow and net movement, split into cash sales, party
  collections, other cash in, expenses, staff payments, loan payments and other cash out.
- **Receivables** — total outstanding, the number of parties owing money, and the five largest
  balances linked to their party ledgers.
- **Production** — production quantity, batch count, average yield, raw material, wastage and cost.
- **Stock** — current Muri stock, bags at the configured bag weight, low-stock minimum and a
  low-stock warning linking to the Stock page.
- **Accounting rules** — an on-screen reminder of how sales, collections, expenses, cash, bank,
  loans and receivables are kept apart.

### Accounting rules enforced

- **Sales** are billed amounts and include credit invoices.
- **Collections** are party payments and cash receipts. A party payment is never counted again
  as a sale.
- Only **cash** movements affect cash in hand: cash retail sales, the paid cash portion of
  wholesale invoices, cash party collections, cash expenses, cash staff advances/payments and
  cash adjustments. Credit invoices and unpaid dues never enter the cash book.
- **Staff salary** accrues as payable and does not move cash. Only staff `advance` and `payment`
  entries move cash or bank.
- **Bank** movements are separate from cash, and **loans** are never added to sales.
- Cash-flow movement is limited to the configured cash opening date, so transactions recorded
  before the opening date cannot change cash in hand or the cash-flow figures.
- **Receivables** are derived from opening balances, invoices, invoice receipts and later
  payments.

### Worked verification example

With cash opening **₹2,000** on the range date: a ₹5,000 cash retail sale, a ₹2,000 credit
retail sale, a ₹8,400 wholesale invoice with ₹4,000 received in cash, a ₹3,000 cash party
payment, a ₹1,000 cash expense and a ₹500 cash staff advance produce:

```
Sales                = 5,000 + 2,000 + 8,400 = 15,400
Collections          = 3,000
Cash inflow          = 5,000 + 4,000 + 3,000 = 12,000
Cash outflow         = 1,000 + 500 = 1,500
Cash in hand         = 2,000 + 12,000 − 1,500 = 12,500
Party receivable     = 8,400 − 4,000 − 3,000 = 1,400
```

The credit ₹2,000 retail sale raises sales and receivables but never appears in cash. This exact
scenario is asserted by the backend verification script during development.

## 18. Reports

Open **Reports** from the Insights section. Twelve reports share one server-side report service,
one A4 landscape print preview and the same CSV/PDF export pipeline.

| Report                  | Date control       | Filters and focus                                                    |
| ----------------------- | ------------------ | -------------------------------------------------------------------- |
| Daily Sales             | One date           | Search reference, customer/party or product                          |
| Monthly Sales           | Month (`YYYY-MM`)  | Day-by-day retail, wholesale and total, with the previous-month comparison |
| Date Range Sales        | From / to          | Search reference, customer/party or product                          |
| Expenses                | From / to          | Search and expense category; cash/bank split plus category breakdown |
| Cash Book               | From / to          | Daily opening, cash sales, collections, expenses, staff, loans and closing cash |
| Bank                    | From / to          | Search and bank account; money in, money out and net                 |
| Party Outstanding       | As-of date         | Search party; opening, invoiced, received, outstanding and credit limit |
| Party Ledger            | From / to + party  | Opening balance, invoice debits, receipt/payment credits and running balance |
| Stock                   | From / to          | Search product; opening stock, stock in, stock out, closing stock and low-stock flag |
| Production              | From / to          | Search batch, product or notes; batches, finished KG, raw material, wastage, cost and yield |
| Staff                   | From / to          | Search name, role or phone; salary, bonus, advance, payment, deduction, recovery and remaining payable |
| Loans                   | From / to          | Search description/reference; loan receipts, repayments, loan interest and net |

Every report returns the same envelope:

```json
{
  "report": {
    "key": "daily-sales",
    "title": "Daily Sales Report",
    "description": "...",
    "range": { "fromKey": "2026-10-27", "toKey": "2026-10-27", "label": "27 Oct 2026", "days": 1 },
    "filters": { "search": "" },
    "summary": { "...": "report-specific totals" },
    "rows": [],
    "extra": { "...": "optional secondary table" },
    "notes": []
  }
}
```

Report rules:

- Reports refuse dates in the future and ranges longer than 366 days; `from` cannot be after `to`.
- Daily, monthly and range sales use billed amounts. Paid and due are shown separately, so a
  credit invoice is never presented as cash received.
- The cash book report starts from the configured cash opening date and lists each day with its
  opening, movement and closing balance. Credit sales and unpaid dues never appear.
- Party outstanding is an as-of balance (opening + invoices − invoice receipts − party payments)
  and party ledger opening balances are calculated from everything dated before the range.
- Stock opening is the sum of stock movements before the range, in/out are the movements inside
  the range, and closing is the current computed balance; low stock uses the business threshold.
- Staff range columns count entries in the period while **remaining payable** is the all-time
  ledger balance.
- Loan receipts, repayments and loan interest are reported separately and are never added to sales.

### Print, PDF and CSV

**Print / PDF** opens the report preview, where **Print** sends the A4 landscape sheet to the
browser and **Download PDF** saves the same content with the business header, applied filters,
summary, table, totals, secondary table and notes. **Download CSV** (on the page and in the
preview) writes a UTF-8 CSV with the same metadata, summary, rows, totals and notes; the file is
named `report-<key>-<date>.csv` and the PDF `report-<key>-<date>.pdf`.

---

## 19. Data export and backups

Open **Settings → Export data**.

- **Download JSON** writes a full backup named `tirupati-backup-YYYY-MM-DD.json`. It contains a
  `meta` block (application, version, export time, dataset row counts) plus business settings,
  the signed-in account's name/email (never the password hash) and these datasets: products,
  parties, retail sales, wholesale invoices, party payments, expenses, expense categories, staff,
  staff transactions, bank accounts, bank transactions, production, stock transactions, daily
  cash counts and cash adjustments.
- **Download CSV** exports one dataset at a time, named `<dataset>-YYYY-MM-DD.csv`. The file is
  UTF-8 with a BOM so Excel opens the Rupee sign correctly, flattens nested fields with dot
  notation and escapes commas, quotes and line breaks.
- Exports include cancelled documents (marked with their cancellation fields) so the file is a
  complete audit copy rather than only the current working set.

Exports are available only to a signed-in user and are sent with `Cache-Control: no-store`.

### MongoDB Atlas backup

A JSON export is a readable copy, not a restorable database dump. Keep Atlas snapshots as the
real disaster-recovery backup:

1. In MongoDB Atlas open **Database → your cluster → Backup** and enable **Cloud Backup**
   (daily snapshots, or continuous backup for a busy mill).
2. Set the snapshot retention to at least 7 days. Download one archive every month and keep it
   on encrypted offline storage with the JSON exports.
3. Restore either with the Atlas **Restore** action, or by downloading the archive and running
   `mongorestore --uri "<atlas connection string>" --gzip --archive=backup.gz`.
4. Test a restore into a temporary database at least once a quarter.

## 20. Audit trail and cancellations

Nothing is deleted. Every transactional document stores `createdAt` and `updatedAt`
(Mongoose timestamps) plus its own reference number (`R-`, `INV-`, `PAY-`, `EXP-`, `STF-`,
`PROD-`, `BTX-`, `TRF-`). Cancelling a record sets `cancelled: true`, `cancelledAt` and an
optional `cancelReason`. A cancelled record stays in MongoDB but is filtered out of every list,
ledger, report, dashboard card and balance by a shared model plugin, so history is preserved
without affecting current figures.

Cancel actions are available where the transaction is listed:

| Cancel from            | Effect besides marking CANCELLED                                             |
| ---------------------- | ---------------------------------------------------------------------------- |
| Retail billing         | Restores the sold quantity to stock with a referenced adjustment             |
| Wholesale invoice      | Restores stock and cancels the linked bank `sales-collection` entry          |
| Party ledger           | Cancels the linked bank `party-payment` entry; outstanding recalculates       |
| Expenses               | Cancels the linked bank `expense` entry; the cash book recalculates           |
| Staff ledger           | Cancels the linked bank `staff-payment` entry and frees the salary month     |
| Production history     | Reverses the finished Muri through a stock adjustment; refuses if stock is insufficient (`409`) |
| Bank ledger            | Cancels both sides of a `TRF-` transfer, or a manual `BTX-` entry            |

Bank entries created automatically by another module cannot be cancelled from the bank ledger;
the API returns `400` and asks you to cancel the source document instead, so money movements are
never orphaned. Cancelling is confirmed in a dialog with an optional reason.

**Audit Trail** (Insights section) lists every cancelled transaction newest first with its type,
reference, original date, amount, cancellation time and reason. It supports search across
reference, type, description and reason. The list is also part of the JSON backup.

---

## 21. Production deployment

The application is split into three independently deployed pieces:

| Piece    | Host                    | Root directory |
| -------- | ----------------------- | -------------- |
| Frontend | Vercel                  | `frontend`     |
| Backend  | Render (or Railway)     | `backend`      |
| Database | MongoDB Atlas           | —              |

The repository already contains `render.yaml` (backend Blueprint), `frontend/vercel.json`
(SPA rewrites) and both `.env.example` files. Nothing is deployed automatically.

### 21.1 MongoDB Atlas

1. Create a free or paid cluster and a database user with read/write access.
2. Allow access from `0.0.0.0/0` (Render/Railway use dynamic egress IPs) or add the host's
   static outbound IPs if you have them.
3. Copy the connection string and add the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tirupati_muri?retryWrites=true&w=majority`
4. Enable **Cloud Backup** and set retention (see [MongoDB Atlas backup](#mongodb-atlas-backup)).

### 21.2 Backend on Render

1. Push the repository to GitHub, then in Render choose **New → Blueprint** and select the repo.
   `render.yaml` creates a Node web service named `tirupati-muri-api` with root directory
   `backend`, build command `npm ci`, start command `npm start` and health check `/api/health`.
2. Set the two unsynced variables:
   - `MONGODB_URI` — the Atlas connection string.
   - `CLIENT_URL` — the Vercel URL(s), comma-separated, for example
     `https://tirupati-muri.vercel.app,https://www.your-domain.com`.
   `JWT_SECRET` is generated by the Blueprint; you can replace it with your own 32+ character
   random string. `NODE_ENV=production` and `TRUST_PROXY=true` are set for you.
3. Deploy and confirm `https://<service>.onrender.com/api/health` returns
   `{"status":"ok","database":"connected"}`.

On Railway the same values apply: root directory `backend`, build `npm ci`, start `npm start`,
health check `/api/health`, plus the same environment variables.

### 21.3 Frontend on Vercel

1. Import the repository, set **Root Directory** to `frontend`. Vercel detects Vite
   (build `npm run build`, output `dist`).
2. Add the environment variable `VITE_API_URL` set to the backend API URL including `/api`,
   for example `https://tirupati-muri-api.onrender.com/api`.
3. Deploy. `vercel.json` rewrites every path to `index.html` so React Router routes work on
   refresh; assets are served as static files.
4. Add the Vercel production domain (and any custom domain) to `CLIENT_URL` on the backend and
   redeploy it, otherwise the browser receives a CORS error.

### 21.4 Environment variables

| Variable      | Where    | Production value                                                        |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `NODE_ENV`    | Backend  | `production`                                                            |
| `PORT`        | Backend  | Set by the host; do not hard-code                                          |
| `MONGODB_URI` | Backend  | Atlas connection string with the database name                          |
| `JWT_SECRET`  | Backend  | Random string of 32+ characters; never commit it                          |
| `CLIENT_URL`  | Backend  | Comma-separated frontend origins, e.g. `https://app.vercel.app`         |
| `TRUST_PROXY` | Backend  | `true` behind Render/Railway/Nginx so rate limiting sees the real IP    |
| `VITE_API_URL`| Frontend | Backend URL ending in `/api`                                            |

Secrets exist only in the hosting dashboards. `backend/.env` is git-ignored and must never be
committed; only `.env.example` files belong in Git.

### 21.5 Production checklist

- Backend starts in production mode, hides 5xx details and logs in combined format.
- Helmet security headers are sent on every response; `X-Powered-By` is disabled.
- Rate limiting: 1000 requests per 15 minutes per IP for the API, 20 attempts per 15 minutes for
  login and first-time setup.
- CORS accepts only the origins listed in `CLIENT_URL`; the request body limit is 100 KB.
- `npm run build` in `frontend` completes with no errors and `npm run lint` passes.
- A fresh database seeds the Muri product and the 11 expense categories on first start.
- Sign in once to confirm the JWT flow, then create the first user through the setup screen.
- Confirm `GET /api/health` from the host and open one report to verify database access.
- Keep Atlas Cloud Backup enabled and download a JSON export from **Settings → Export data**
  periodically, as described in [Data export and backups](#19-data-export-and-backups).

---

## API endpoints

| Method | Path               | Auth | Purpose                              |
| ------ | ------------------ | ---- | ------------------------------------ |
| GET    | `/api/health`      | No   | Health check and database status     |
| POST   | `/api/auth/setup`  | No   | Create the first (and only) user     |
| POST   | `/api/auth/login`  | No   | Sign in and receive a JWT            |
| GET    | `/api/auth/me`     | Yes  | Return the signed-in user            |
| GET    | `/api/settings`    | Yes  | Read business settings               |
| PUT    | `/api/settings`    | Yes  | Create or update business settings   |
| GET    | `/api/products`    | Yes  | List products (optional `active` and `search` filters) |
| POST   | `/api/products`    | Yes  | Create a product                     |
| GET    | `/api/products/:id`| Yes  | Read one product                     |
| PUT    | `/api/products/:id`| Yes  | Update a product or its active status |
| POST   | `/api/sales`       | Yes  | Create a retail sale and return its bill number |
| GET    | `/api/sales`       | Yes  | List recent sales (optional `type`, `limit`) |
| GET    | `/api/sales/summary` | Yes | Today's and this month's retail totals |
| GET    | `/api/sales/:id`   | Yes  | Read one sale                        |
| GET    | `/api/stock`       | Yes  | Current stock, bags and low-stock state for every product |
| POST   | `/api/stock/opening` | Yes | Record opening stock once per product |
| POST   | `/api/stock/movements` | Yes | Record a purchase, wastage or adjustment |
| GET    | `/api/stock/:productId/ledger` | Yes | Stock ledger for one product (optional `limit`, max 200) |
| GET    | `/api/parties`     | Yes  | List parties with derived outstanding (`search`, `active`) |
| POST   | `/api/parties`     | Yes  | Create a party with opening balance, credit limit, notes and status |
| GET    | `/api/parties/receivables` | Yes | Accounts receivable list and cash/bank receipt summary (`search`) |
| GET    | `/api/parties/:id` | Yes  | Party account, statistics, credit position and full ledger |
| PUT    | `/api/parties/:id` | Yes  | Update party details, opening balance, credit limit and status |
| POST   | `/api/parties/:id/payments` | Yes | Record a payment and return the new outstanding |
| GET    | `/api/invoices`    | Yes  | List wholesale invoices with a filtered summary (`search`, `from`, `to`, `limit`) |
| POST   | `/api/invoices`    | Yes  | Create a wholesale invoice and deduct stock |
| GET    | `/api/invoices/:id`| Yes  | Read one wholesale invoice           |
| GET    | `/api/expenses/categories` | Yes | List expense categories         |
| POST   | `/api/expenses/categories` | Yes | Add a custom expense category   |
| GET    | `/api/expenses`    | Yes  | List expenses and a filtered summary (`search`, `category`, `from`, `to`) |
| POST   | `/api/expenses`    | Yes  | Record an expense and return its `EXP-` number |
| GET    | `/api/cash-book`   | Yes  | Daily cash book for one date (`date`, defaults to today) |
| GET    | `/api/cash-book/summary` | Yes | Today's cash in hand and today's expense totals |
| PUT    | `/api/cash-book/opening` | Yes | Set the opening cash amount and opening date |
| POST   | `/api/cash-book/counts` | Yes | Record a physical cash count and optional adjustment |
| GET    | `/api/bank-accounts` | Yes | List bank accounts with balances and today's inflow/outflow |
| POST   | `/api/bank-accounts` | Yes | Add a bank account |
| GET    | `/api/bank-accounts/:id` | Yes | Account summary and full transaction ledger |
| PUT    | `/api/bank-accounts/:id` | Yes | Update account details, opening balance or status |
| POST   | `/api/bank-accounts/:id/transactions` | Yes | Record a manual bank transaction |
| POST   | `/api/bank-accounts/transfer` | Yes | Transfer money between two accounts |
| GET    | `/api/production`  | Yes  | List production batches with a filtered summary (`search`, `from`, `to`, `limit`) |
| POST   | `/api/production`  | Yes  | Record a production batch and add the finished Muri to stock |
| GET    | `/api/production/summary` | Yes | Today's and this month's production plus the current yield |
| GET    | `/api/staff`       | Yes  | List staff with derived totals and summary (`search`, `status`) |
| POST   | `/api/staff`       | Yes  | Add a staff member                          |
| GET    | `/api/staff/summary` | Yes | Staff counts, total payable, today's staff payments and monthly salary expense |
| GET    | `/api/staff/:id`   | Yes  | Staff details, totals and full salary ledger |
| PUT    | `/api/staff/:id`   | Yes  | Update staff details or status              |
| POST   | `/api/staff/:id/transactions` | Yes | Record a salary, bonus, advance, payment, deduction or recovery entry |
| GET    | `/api/dashboard`   | Yes  | Business dashboard for a range (`range=today\|week\|month\|custom`, plus `from`/`to`) |
| GET    | `/api/reports/:report` | Yes | Run one of the twelve reports (`from`, `to`, `date`, `month`, `asOf`, `party`, `account`, `category`, `search` as applicable) |
| GET    | `/api/backup/datasets` | Yes | List the datasets available for CSV export |
| GET    | `/api/backup/export` | Yes | Download a full JSON backup (`format=json`) or one CSV dataset (`format=csv&dataset=<key>`) |
| GET    | `/api/audit/cancelled` | Yes | List cancelled transactions (`search`, `limit`, max 500) |
| POST   | `/api/sales/:id/cancel` | Yes | Cancel a retail sale, restore stock and mark it CANCELLED |
| POST   | `/api/invoices/:id/cancel` | Yes | Cancel a wholesale invoice, restore stock and cancel linked bank entries |
| POST   | `/api/parties/:id/payments/:paymentId/cancel` | Yes | Cancel a party payment and its linked bank entry |
| POST   | `/api/expenses/:id/cancel` | Yes | Cancel an expense and its linked bank entry |
| POST   | `/api/staff/:id/transactions/:transactionId/cancel` | Yes | Cancel a staff entry, release the salary month and cancel linked bank entries |
| POST   | `/api/production/:id/cancel` | Yes | Cancel a production batch and reverse its finished stock |
| POST   | `/api/bank-accounts/:id/transactions/:transactionId/cancel` | Yes | Cancel a manual bank entry or both sides of a transfer |

Every cancel route accepts `{ "reason": "optional text, max 300 characters" }` and returns the
updated record with a confirmation `message`. Cancelling an already cancelled record returns
`404`; cancelling a bank entry that was created by another module returns `400` so the source
document is cancelled instead.

Protected routes expect `Authorization: Bearer <token>`. Products are never deleted; use
`PUT /api/products/:id` with `{ "active": false }` to retire one.

`POST /api/stock/opening` accepts `{ product, quantity, notes? }`. A second opening for the
same product returns `409`; use an adjustment instead. `POST /api/stock/movements` accepts
`{ product, type, quantity, notes? }` where `type` is `purchase`, `wastage` or `adjustment`.
Purchase and wastage quantities must be positive (wastage is stored as a negative movement);
adjustments are signed and cannot take the balance below zero. Production movements are
written only by `POST /api/production`; wholesale deductions are written only by
`POST /api/invoices`.

`POST /api/sales` accepts `{ product, inputMode, amount | quantity, rate?, paymentMethod,
customerName?, notes? }`. `inputMode` is `amount` (default) or `quantity`; `rate` defaults to
the product's retail rate. Credit sales require `customerName`. Bill numbers are generated on
the server and cannot be supplied by the client.

`POST /api/parties` accepts `{ name, phone, address?, openingBalance?, creditLimit?, notes?,
active? }`. `name` and `phone` are required; `openingBalance` and `creditLimit` default to `0`
and cannot be negative; a `creditLimit` of `0` means no limit. `PUT /api/parties/:id` updates
the same fields. `GET /api/parties` returns each party with its derived outstanding and can be
filtered with `search` (name or phone) and `active=true`.

`GET /api/parties/:id` returns `{ party, stats, credit, ledger }`, where `stats` contains the
invoice count, total sales, total received, outstanding and last invoice/payment dates, `credit`
contains the limit, used and available amounts, and `ledger` contains the opening, invoice and
payment rows with a running balance. Nothing in the API accepts a balance or ledger row from
the client; both are calculated from stored transactions.

`POST /api/parties/:id/payments` accepts `{ amount, paymentMethod, account, paymentDate,
bankAccountId?, notes? }`. `paymentMethod` is `cash`, `upi` or `bank`; `account` must be `cash`
for cash payments and `bank` for UPI/bank payments. When the account is `bank`, `bankAccountId`
selects the active bank account that receives the money and is required for the bank balance to
increase. `paymentDate` accepts `YYYY-MM-DD` and cannot be in the future. The server assigns the
`PAY-000001`-style number, creates the receipt and returns `{ payment, outstanding }`. A payment
number is allocated only after validation succeeds. If writing the bank transaction fails, the
payment is deleted.

`GET /api/parties/receivables` returns `{ parties, summary }`, sorted by outstanding from
highest to lowest and limited to positive balances. `summary` contains `totalOutstanding`,
`partyCount`, `cashReceived`, `bankReceived` and `paymentsCount`; the cash and bank figures are
all-time totals and are not narrowed by `search`.

`POST /api/invoices` accepts `{ partyId, productId, quantity, rate?, paid?, paymentMethod?,
bankAccountId?, notes? }`. `rate` defaults to the product's wholesale rate, `paid` defaults to
`0` and cannot exceed the calculated total, and `paymentMethod` is `cash` (default), `upi`,
`bank` or `credit`. When the method is `upi` or `bank` and `paid` is greater than zero,
`bankAccountId` selects the active account credited with the paid amount. The server calculates
`total`, `due`, status and the invoice number. Inactive parties
are rejected, and an invoice with an amount due is rejected when it would take the party's
outstanding above its credit limit. `GET /api/invoices` returns `{ invoices, summary }`, where
the summary applies the same search/date filters as the list.

`POST /api/expenses` accepts `{ expenseDate, categoryId? | category, amount, paymentMethod,
bankAccountId?, account?, description, notes? }`. `expenseDate` is `YYYY-MM-DD` and cannot be in
the future; `paymentMethod` is `cash`, `upi` or `bank`, and the account (`cash` for cash, `bank`
otherwise) is derived on the server when omitted. For UPI and bank expenses, `bankAccountId`
selects the active account the money is paid from. The category can be an id or an existing
category name; unknown names are rejected rather than silently created. The server allocates the
`EXP-000001`-style number after validation and returns `{ message, expense }`.
`GET /api/expenses` returns `{ expenses, summary }`, where `summary` covers all rows matching
the filters.

`GET /api/expenses/categories` returns `{ categories }`. `POST /api/expenses/categories`
accepts `{ name }`, returns `{ message, category }` and responds `409` when the name already
exists (case-insensitive).

`GET /api/cash-book?date=YYYY-MM-DD` returns the `opening` balance and effective opening, a
`summary` with cash sales, party collections, other income, expenses, staff payments, loan
payments, other outflows, total in/out and closing cash, the cash `entries` with a running
balance, and the `latestCount`. Dates before the opening date return zeroed figures with
`beforeOpening: true`. `GET /api/cash-book/summary` returns today's cash in hand plus today's
expense totals (total, cash, bank, count) for the dashboard.

`PUT /api/cash-book/opening` accepts `{ openingCash, openingDate }`; the amount cannot be
negative and the date cannot be in the future. `POST /api/cash-book/counts` accepts
`{ date?, physicalCash, adjustCashBook?, reason?, notes? }`; `date` defaults to today. When
`adjustCashBook` is true and the difference is non-zero, a reason is required and the server
writes an `ADJ-` adjustment (surplus to other cash income, shortage to other outflows). Counts
for future or before-opening dates return `400`.

`GET /api/bank-accounts` returns `{ accounts, summary }`. Each account contains its bank and
account names, `maskedAccountNumber`, opening balance, active status, derived `balance`, today's
inflow and outflow, transaction count and last transaction date; the summary contains
`totalBalance`, `accountCount`, `activeCount`, `todayInflow` and `todayOutflow`. The full account
number is never returned.

`POST /api/bank-accounts` accepts `{ bankName, accountName, accountNumber, openingBalance?,
active? }` and returns `{ message, account }` with `201`. The account number is normalised and
must be unique (`409` on duplicates). `PUT /api/bank-accounts/:id` accepts the same fields; when
`accountNumber` is omitted or blank the stored number is kept, so an edit does not require
re-entering it.

`GET /api/bank-accounts/:id` returns `{ account, summary, ledger }`. The ledger starts with an
`opening` row and then lists every transaction with direction, in, out and running balance;
transfer rows include the counterparty account as `{ _id, label }` using its masked number, for
example `HDFC Bank · •••• 2345`.

`POST /api/bank-accounts/:id/transactions` accepts `{ type, amount, transactionDate,
description, notes?, direction? }`. `type` is `deposit`, `withdrawal`, `sales-collection`,
`party-payment`, `expense`, `loan-receipt`, `loan-repayment` or `other`. The direction is fixed
by the type except for `other`, which requires `direction` (`inflow` or `outflow`). The date
cannot be in the future, the amount must be greater than zero, inactive accounts are rejected,
and the server assigns the `BTX-000001`-style number.

`POST /api/bank-accounts/transfer` accepts `{ fromAccountId, toAccountId, amount,
transactionDate?, notes? }`. The accounts must be different and active. The server assigns one
`TRF-000001`-style number, writes a matching outflow and inflow that both reference it, and
returns `{ message, transfer }` with the number, amount, date and both account labels. If the
second entry fails, the first is removed, so total business money is unchanged.

`POST /api/production` accepts `{ productionDate, rawMaterialKg, finishedKg, wastageKg?,
productionCost?, notes? }`. `productionDate` is `YYYY-MM-DD` and cannot be in the future;
`rawMaterialKg` and `finishedKg` must be greater than zero; `wastageKg` and `productionCost`
default to `0`. The server links the record to the Muri product, assigns the
`PROD-000001`-style number after validation, adds the finished quantity to stock and returns
`{ message, production, stock }`. Each production view includes the derived `yieldPercent`
and `rawMaterialPerKg`; raw material is never posted to stock. If the stock movement fails,
the production record is deleted.

`GET /api/production` returns `{ productions, summary }` with the same `search`, `from` and
`to` filters as the other history endpoints, inclusive dates, newest first and at most 200
rows. `summary` contains `count`, `finishedKg`, `rawMaterialKg`, `wastageKg`,
`productionCost` and the derived `yieldPercent` for the filtered rows.
`GET /api/production/summary` returns `{ summary }` with `today`, `month` (same shape),
`currentYieldPercent` from the latest batch and `latestProduction`
(`productionNumber`, `productionDate`).

`POST /api/staff` accepts `{ name, phone, role, joiningDate, monthlySalary, status?, notes? }`
and returns `{ message, staff }` with `201`. The joining date cannot be in the future, the
monthly salary must be greater than zero, and `status` defaults to `active`. Phone numbers are
validated and stored as entered. `PUT /api/staff/:id` accepts the same fields.

`GET /api/staff` returns `{ staff, summary }`, where every staff row includes its derived totals
(`salaryPayable`, `paidToStaff`, `advancePaid`, `remainingPayable`, and the per-type sums) and
`summary` contains `staffCount`, `activeCount`, `totalPayable`, `monthlyPayroll` and
`salaryMonth`. `GET /api/staff/:id` returns `{ staff, summary, ledger }`; the ledger lists every
entry with `debit`, `credit` and a running `balance`.

`POST /api/staff/:id/transactions` accepts `{ type, amount?, transactionDate, salaryMonth?,
paymentMethod?, bankAccountId?, description?, notes? }`. `type` is `salary`, `bonus`, `advance`,
`payment`, `deduction` or `recovery`. For `salary`, `salaryMonth` is required (`YYYY-MM`, not in
the future), one entry per staff per month is allowed (`409` on duplicates), and `amount` defaults
to the staff member's monthly salary. Other types require an amount greater than zero. `advance`
and `payment` derive the cash or bank account from `paymentMethod` (`cash`, `upi` or `bank`) and
require an active `bankAccountId` for UPI/Bank. Inactive staff are rejected, and if the bank
movement fails the entry is deleted.

`GET /api/staff/summary` returns `{ summary }` with `staffCount`, `activeCount`, `totalPayable`,
`todayPayments` (`total`, `cash`, `bank`, `count`), `monthlySalaryExpense`,
`monthlySalaryCount`, `salaryMonth` and `salaryMonthLabel`.

`GET /api/dashboard?range=today|week|month|custom` returns `{ dashboard }`. Custom ranges also
require `from` and `to` (`YYYY-MM-DD`), cannot include future dates and cannot exceed 366 days.
The response contains `generatedAt`, the resolved `range`, eight `cards`, and the `sales`
(with chart `series`), `monthly` (current, previous and change), `expenses`, `cashFlow`
(with `components`), `receivables`, `production`, `stock` and `notes` sections. All totals are
computed with MongoDB aggregation over the recorded collections; no transaction list is sent to
the browser. If the custom range starts before the configured cash opening date, cash-flow
movement starts at the opening date so it stays consistent with cash in hand.

`GET /api/reports/:report` returns `{ report }`, where `:report` is one of `daily-sales`,
`monthly-sales`, `sales-range`, `expenses`, `cash-book`, `bank`, `party-outstanding`,
`party-ledger`, `stock`, `production`, `staff` or `loan`. Date parameters are `date`
(`daily-sales`), `month` (`YYYY-MM`, `monthly-sales`), `asOf` (`party-outstanding`) or `from`
and `to` (all range reports; default is the current month through today). `party-ledger`
requires `party`; `bank` accepts `account`; `expenses` accepts `category`; searches use
`search` where the report supports it. Every response includes `range`, `filters`, `summary`,
`rows`, optional `extra` and `notes`. Reports never expose loan amounts as sales or unpaid
invoice dues as cash.

## What is included in this release

- Working MERN application with separate frontend and backend
- MongoDB connection through Mongoose
- Single-user authentication: bcrypt hashing, JWT, protected routes, logout
- First-time setup flow for the owner account
- Responsive sidebar/header layout with all 16 navigation entries, including the Audit Trail
- Business dashboard calculated with MongoDB aggregation from real transactions: Today, This Week, This Month and Custom ranges, with eight cards, a daily sales chart, monthly sales comparison, expense and cash-flow breakdowns, receivables, production, stock and low-stock warning
- Dashboard accounting that keeps sales, collections, expenses, cash, bank, loans and receivables separate: loans never count as sales, unpaid credit invoices never count as cash received and party payments never count as new sales
- Report centre with twelve reports (daily sales, monthly sales, date-range sales, expenses, cash book, bank, party outstanding, party ledger, stock, production, staff and loan), each with date filtering, search where useful, an A4 preview, browser printing, PDF download and CSV export
- Business settings saved to MongoDB, including receipt/invoice footers, Muri rates, bag weight
  and low-stock threshold
- Product master with search, add, edit and activate/deactivate; Muri is seeded on first start
- Fast retail billing in both Amount → KG and KG → Amount modes, with cash/UPI/bank/credit payment
- Sequential bill numbers (`R-000001`, `R-000002`, ...) generated safely under concurrent sales
- Thermal receipt preview and printing at 58 mm and 80 mm, plus receipt PDF download
- Stock ledger with opening stock, purchases, wastage and adjustments, current KG and bag count
- Atomic stock deduction on retail sales with exact insufficient-stock rejection and no bill-number gaps
- Real Muri stock on the dashboard with a configurable low-stock warning
- Party management with phone, address, opening balance, credit limit, notes and active status
- Party ledger calculated from the opening balance, invoices and recorded payments, with a running balance
- Receive-payment receipts (`PAY-000001`, ...) recorded to the cash or bank account with no number gaps on rejection
- Accounts receivable with outstanding, last payment and last invoice, sorted by highest amount due
- Credit-limit checks that reject invoices over the limit before stock or invoice numbers are used
- WhatsApp click-to-chat payment reminders pre-filled with the party, outstanding and business name
- Wholesale invoice actions: Print, Download PDF and Share on WhatsApp with a message containing the business name, invoice number, date, total, paid and outstanding
- Send Ledger on WhatsApp from the party ledger, and Send Payment Reminder from outstanding parties, both pre-filled and generated in the browser
- Wholesale invoices with live total, paid and due calculation and cash/UPI/bank/credit payment
- Sequential invoice numbers (`INV-000001`, `INV-000002`, ...) that are not consumed by rejected invoices
- Invoice-level paid and due tracking with Paid, Partially Paid and Credit statuses
- Atomic wholesale stock deduction with ledger entries referencing the invoice number
- A4 invoice preview, browser printing and PDF download
- Invoice history with server-side search, inclusive date filters and filtered sales/received/due summaries
- Expense management with 11 seeded categories, custom categories, server-assigned `EXP-000001` numbers and cash/bank classification
- Daily cash book with opening cash, cash sales, party collections, other income, expenses, staff and loan payments, other outflows and closing cash
- Cash transactions with a running balance and credit sales excluded from cash in hand
- Complete daily closing with opening cash, cash sales, cash collections, cash expenses, other income, staff payments, other outflows, expected closing cash, physical cash, difference and closing notes; difference is recalculated live after any cancellation
- Physical cash counts comparing expected and physical cash, with reason-required `ADJ-` adjustments for surpluses and shortages
- Dashboard Today's Expenses and Cash in Hand driven by actual expense and cash book transactions
- Multiple bank accounts with bank/account name, unique normalised account number, opening balance and active status
- Account numbers masked in every API response and on screen; balances derived from transactions (`opening + inflow − outflow`)
- Per-account bank ledger with `BTX-000001` transactions, running balance and today's inflow/outflow
- Manual transaction types: deposit, withdrawal, sales collection, party payment, expense, loan receipt, loan repayment and other
- Account-to-account transfers (`TRF-000001`) that move money without changing the total business balance
- Automatic bank entries from wholesale UPI/bank receipts, party UPI/bank payments and UPI/bank expenses, with rollback on failure
- Bank Accounts page with account balances and today's inflow/outflow, plus a dashboard Bank Balance card
- Muri production entries with server-assigned `PROD-000001` numbers, date, raw material, finished quantity, wastage, production cost and notes
- Yield % and raw material per KG calculated from the stored quantities and shown on the entry form, history list and PDF
- Finished Muri added to stock exactly once per production record through a referenced ledger entry, with the record rolled back if the movement fails; raw material stays on the record only
- Production history with search, inclusive date filters, filtered totals, A4 print preview and PDF download
- Dashboard production cards for today's production, monthly production and the current batch yield
- Staff management with name, phone, role, joining date, monthly salary, status and notes, plus search and active/inactive filters
- Staff ledger with salary, bonus, advance, payment, deduction and loan recovery entries (`STF-000001`, ...) and a running balance
- Debit/credit salary ledger showing salary payable, payments made, advance, deductions and remaining payable
- One monthly salary entry per staff member, defaulting to the monthly salary, with duplicate and future-month rejection
- Cash and bank staff payments that reduce the cash book or the selected bank account through a `staff-payment` outflow, with rollback on failure
- Dashboard staff cards for today's staff payments and the monthly salary expense
- "Coming Soon" placeholder for the loan module, which is the only module not implemented yet
- Audit trail that keeps cancelled retail sales, invoices, party payments, expenses, staff entries, production batches and manual bank entries as CANCELLED with a timestamp and reason, while reversing stock and linked bank movements
- PDF download for every important document: thermal receipt, wholesale invoice, party ledger, staff ledger, bank ledger, production history, loan report and all twelve reports
- Security hardening: helmet headers, API and login rate limiting, CORS allow-list, 100 KB JSON limit, hidden 5xx details and no secrets in the frontend bundle
- Deployment-ready configuration: `render.yaml`, `frontend/vercel.json`, `.env.example` files, production build and this deployment guide
- Server-side validation, consistent error responses, loading, error and empty states, confirmation dialogs, search, date filters and success toasts across the pages

## What is intentionally not included yet

A dedicated loan module is not implemented: the bank ledger has loan receipt and
loan repayment types, and cash expenses in the Loan Interest category feed the Loan payments row,
but there is no loan account, amortisation or outstanding tracking, so the Loan report only lists
recorded loan receipts and repayments and the dashboard shows loan outstanding as not tracked.
Raw-material inventory is not implemented:
production stores the raw material quantity on the record, but there is no raw-material stock
balance or deduction and none is simulated. Bank accounts are tracked, but
there is no cheque management, reconciliation against bank statements or automatic import.
The cash book still tracks the single cash account separately from the bank accounts. Staff
salary, advances and payments are recorded in the
staff module; there is no attendance, leave, overtime or payslip generation. WhatsApp
integration is limited to click-to-chat messages; no paid WhatsApp Business API or
automatic server-side sending is used. Lists are bounded by server-side limits (for example the
latest 200 expenses or 500 cancelled records) and older records are reached with search and date
filters; there is no page-by-page pagination. No fake invoices, stock,
transactions or accounting calculations are generated by this release.

## Notes

- Currency is formatted for India with the `en-IN` locale, e.g. `₹1,00,000`.
- Party balances are always derived from transactions. The opening balance is an input to the
  ledger; no stored running balance is ever overwritten.
- Credit sales never increase cash in hand. Only cash retail sales, the paid portion of cash
  wholesale invoices, cash party collections and cash count surpluses feed the cash book.
  UPI and bank amounts are recorded separately and do not affect cash.
- The cash book and its entries are recalculated from stored transactions on every request;
  only the opening cash amount, opening date and recorded physical counts are stored inputs.
- Bank balances are derived the same way (`opening balance + inflows − outflows`) and are never
  stored. Account numbers are stored for uniqueness but only masked values leave the API, and a
  transfer is always a paired outflow and inflow, so it cannot change total business money.
- Production yield and raw material per KG are calculated from the stored quantities on every
  read and are never stored. Each production record writes exactly one Production stock movement
  for the finished Muri; raw material is not part of the stock balance.
- Staff balances are derived from the ledger on every read: salary and bonus are debits, advance,
  payments, deductions and loan recoveries are credits, and the running balance equals the
  remaining payable. Only advance and payment move money; the salary month is stored once per
  entry so a month cannot be paid twice.
- Staff names are snapshotted onto each `STF-` entry, so renaming a staff member never rewrites
  history. Cash staff payments appear in the cash book's Staff payments row, and UPI/Bank staff
  payments write a `staff-payment` bank outflow.
- Payment reminders, invoice sharing and ledger sharing open `https://wa.me/...` in a new tab.
  The message is generated in the browser and nothing is sent until the user presses Send in
  WhatsApp. The invoice message contains the business name, invoice number, date, total, paid and
  outstanding; the ledger message contains the opening balance, invoices, payments received,
  outstanding and the date it was generated.
- Cancelled documents are kept with `cancelled`, `cancelledAt` and `cancelReason` and are excluded
  from every find, count and aggregation. Cancelling reverses the related stock and bank
  movements, so no ledger silently keeps money or stock from a cancelled document.
- Receipt, invoice, ledger, report and production PDFs use `Rs.` instead of `₹` because the
  built-in PDF fonts do not include the rupee glyph. On-screen and printed documents show `₹`.
- Dashboard and report totals are computed in MongoDB with aggregation pipelines and
  `$dateToString` buckets; the browser receives computed figures, not whole transaction lists.
- Dashboard cards mix as-of balances and range figures on purpose. Stock, bank and receivable
  balances are current, cash is as of the selected range end date, and sales, expenses,
  production and cash flow cover the selected range. A cash range that starts before the
  configured cash opening date begins at the opening date.
- Sales are accrual-based: retail bill amounts plus wholesale invoice totals, including credit.
  Collections are only recorded party payments and cash receipts. Unpaid invoice dues stay in
  receivables, and loan receipts stay in the bank/cash ledger, so no amount is counted twice.
- All API responses are protected by helmet headers and rate limits, and 5xx responses never leak
  stack traces or database details to the browser.
- The interface is English-only and designed desktop-first, with a responsive mobile drawer.
- The frontend dev server proxies `/api` to `http://localhost:5000`. If you change `PORT`,
  update `frontend/vite.config.js` (or set `VITE_API_URL`). Deployed builds use `VITE_API_URL`.

## Troubleshooting

- **Backend exits with "Missing required environment variables"** — `backend/.env` is missing
  or incomplete. Copy `.env.example` and fill in the values.
- **Backend exits with "JWT_SECRET must be at least 32 characters long"** — generate a longer
  value, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- **MongoDB connection failed** — confirm the MongoDB service is running and the URI is correct.
  For Atlas also confirm the database user, the database name in the URI and the IP allow-list.
- **CORS error in the browser** — make sure `CLIENT_URL` matches the URL you open the frontend on.
  For multiple frontends (Vercel preview plus custom domain) separate them with commas and no
  spaces: `https://app.vercel.app,https://www.example.com`. Redeploy the backend after changing it.
- **`429 Too Many Requests`** — the API allows 1000 requests per 15 minutes per IP and 20 login
  attempts per 15 minutes. Wait for the window to reset. Set `TRUST_PROXY=true` when deployed
  behind Render/Railway so the real client IP is used instead of the proxy.
- **Vercel shows 404 after refreshing a page** — deploy with root directory `frontend` so
  `vercel.json` rewrites unknown paths to `index.html`.
- **Frontend loads but every request fails in production** — `VITE_API_URL` is missing or lacks
  `/api`. Set it to the backend URL ending in `/api` and redeploy (Vite bakes it into the build).
- **Port already in use** — change `PORT` for the backend and the proxy target in
  `frontend/vite.config.js`, or stop the process using port 5000/5173.
- **"Initial setup is already complete"** — an account already exists; sign in instead.
