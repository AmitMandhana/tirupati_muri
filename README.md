# Tirupati Puffed Rice Mill — Management System

A cloud-based business management web application for a puffed rice (muri) mill. This release
includes authentication, the application shell, the dashboard, business settings, the product
master, fast retail billing with printable thermal receipts, a ledger-based Muri stock module,
wholesale invoicing with A4 invoices, complete party ledgers with credit limits, payment
receipts, accounts receivable and WhatsApp payment reminders, expense management, a daily cash
book with cash in hand, physical cash counts and adjustments, and multi-account bank management
with transaction ledgers and account-to-account transfers. Production, staff, loans and reports
are represented by clearly marked "Coming Soon" pages and will be added in later phases.

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
│       ├── controllers/   # auth, settings, product, sale, stock, party, payment, invoice, expense, cash book and bank account handlers
│       ├── middleware/    # JWT auth, error handling
│       ├── models/        # User, BusinessSettings, Product, Sale, Counter, ProductStock, StockTransaction, Party, PartyPayment, WholesaleInvoice, ExpenseCategory, Expense, CashAdjustment, CashCount, BankAccount, BankTransaction
│       ├── routes/        # /api/auth, /api/settings, /api/products, /api/sales, /api/stock, /api/parties, /api/invoices, /api/expenses, /api/cash-book, /api/bank-accounts
│       ├── services/      # token signing, product and category seeds, sales, wholesale invoices, party ledger, stock, expenses, cash book, bank accounts, bill numbers
│       ├── utils/         # async wrapper, HTTP errors, validators, stock types, local-date helpers
│       ├── app.js         # Express app
│       └── server.js      # startup entry point
└── frontend/
    └── src/
        ├── components/    # layout pieces, form fields, dialogs (expense, opening cash, physical cash, bank account, bank transaction, bank transfer), receipt, invoice sheet, payment dialog, icons
        ├── hooks/         # authentication and business-settings contexts
        ├── layouts/       # sidebar + header application shell
        ├── pages/         # login, dashboard, settings, products, retail billing, stock, wholesale, parties, party ledger, receivables, expenses, cash book, bank accounts, bank account ledger, placeholders
        ├── services/      # Axios instance and API calls
        └── utils/         # currency, dates, validation, billing, stock, invoice, WhatsApp reminder helpers and PDFs
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

The **Muri Stock** card on the dashboard shows the current balance and bag count from the same
stock service, and the dashboard warning links to the Stock page.

### Transaction types and future modules

The ledger already understands Opening Stock, Production, Retail Sale, Wholesale Sale, Wastage,
Adjustment and Purchase/Stock Addition. This release writes opening stock, purchases, wastage,
adjustments, retail sales and wholesale sales. **Production is not implemented yet**; when that
module is added it will call the same `applySignedMovement` service so the balance and ledger
stay consistent.

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

### Daily cash view

The page has **Previous day** / **Next day** / **Today** navigation and a date picker. The daily
view shows the required rows:

| Row                 | Source                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Opening cash        | Opening balance plus the net cash flow of all earlier days             |
| Cash sales          | Retail sales paid in cash and the paid portion of cash wholesale invoices |
| Party collections   | Cash payments received from parties (`PAY-...`)                        |
| Other income        | Cash count surplus adjustments (`ADJ-...`)                             |
| Expenses            | Cash operating expenses                                                |
| Staff payments      | Cash expenses in the **Salary** category                               |
| Loan payments       | Cash expenses in the **Loan Interest** category                        |
| Closing cash        | Opening plus cash in, minus cash out                                   |

Each cash expense is counted once: Salary goes to **Staff payments**, Loan Interest to
**Loan payments**, and every other cash expense to **Expenses**. UPI and bank expenses are
excluded entirely. **Other cash outflows** holds cash count shortages.

The **Cash transactions** table lists every cash movement for the selected date with reference,
description, cash in, cash out and running balance. The running balance starts at the opening
cash and ends at the closing cash.

### Credit sales are not cash

A credit transaction raises sales and receivables but never cash. A ₹20,000 credit invoice
produces **Sales ₹20,000**, **Cash ₹0** and **Receivable ₹20,000**; it does not appear in the
cash book. Wholesale invoices with `paymentMethod: cash` contribute only their **paid** amount,
never the unpaid due.

### Physical cash count

**Physical count** (or **Count again**) compares the expected closing cash with the cash
actually counted for the selected date. The dialog shows the expected amount, the physical
amount, the live **Difference**, and a history of the latest count.

- With **Adjust cash book to match** unticked, the count is stored for comparison only.
- With it ticked, the difference is written as a numbered adjustment (`ADJ-000001`, ...).
  A surplus becomes **Other cash income**; a shortage becomes **Other cash outflows**.
- A **reason** is required whenever the cash book is adjusted for a non-zero difference.
  A matched count creates no adjustment and needs no reason.

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

The **Today's Expenses** card shows the total of every expense dated today (with the cash
portion) and **Cash in Hand** shows today's closing cash from the cash book service. Both are
derived from actual transactions, never stored totals.

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
opens its ledger.

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

Only the **paid** portion of a wholesale invoice is credited; the unpaid due is not. Cash
transactions never touch a bank account. The bank account selector appears on those forms when
the method is UPI or Bank, listing active accounts with masked numbers and current balances,
and is required when money is actually moving. If the bank movement fails, the invoice,
payment or expense is rolled back (and stock reservations are released for invoices), so the
source record and the bank ledger never disagree.

### Worked example

1. Add **SBI Current Account** with opening balance **₹1,00,000**.
2. Record a **₹20,000 deposit**. Balance is **₹1,20,000**.
3. Record a **₹5,000 expense** paid from SBI. Balance is **₹1,15,000** — the expected result.
4. Add **HDFC Bank** with opening balance **₹50,000**.
5. Transfer **₹10,000** from SBI to HDFC. SBI shows **₹1,05,000**, HDFC **₹60,000**, and the
   total stays **₹1,65,000**.

### Dashboard

The **Bank Balance** card shows the combined balance of every bank account and how many accounts
are active, recalculated from the bank ledgers on every request.

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

Protected routes expect `Authorization: Bearer <token>`. Products are never deleted; use
`PUT /api/products/:id` with `{ "active": false }` to retire one.

`POST /api/stock/opening` accepts `{ product, quantity, notes? }`. A second opening for the
same product returns `409`; use an adjustment instead. `POST /api/stock/movements` accepts
`{ product, type, quantity, notes? }` where `type` is `purchase`, `wastage` or `adjustment`.
Purchase and wastage quantities must be positive (wastage is stored as a negative movement);
adjustments are signed and cannot take the balance below zero. Production movements are
rejected until that module is built; wholesale deductions are written only by
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

## What is included in this release

- Working MERN application with separate frontend and backend
- MongoDB connection through Mongoose
- Single-user authentication: bcrypt hashing, JWT, protected routes, logout
- First-time setup flow for the owner account
- Responsive sidebar/header layout with all 15 navigation entries
- Dashboard with real today's and monthly sales figures, Muri stock, total party receivable and combined bank balance
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
- Wholesale invoices with live total, paid and due calculation and cash/UPI/bank/credit payment
- Sequential invoice numbers (`INV-000001`, `INV-000002`, ...) that are not consumed by rejected invoices
- Invoice-level paid and due tracking with Paid, Partially Paid and Credit statuses
- Atomic wholesale stock deduction with ledger entries referencing the invoice number
- A4 invoice preview, browser printing and PDF download
- Invoice history with server-side search, inclusive date filters and filtered sales/received/due summaries
- Expense management with 11 seeded categories, custom categories, server-assigned `EXP-000001` numbers and cash/bank classification
- Daily cash book with opening cash, cash sales, party collections, other income, expenses, staff and loan payments, other outflows and closing cash
- Cash transactions with a running balance and credit sales excluded from cash in hand
- Physical cash counts comparing expected and physical cash, with reason-required `ADJ-` adjustments for surpluses and shortages
- Dashboard Today's Expenses and Cash in Hand driven by actual expense and cash book transactions
- Multiple bank accounts with bank/account name, unique normalised account number, opening balance and active status
- Account numbers masked in every API response and on screen; balances derived from transactions (`opening + inflow − outflow`)
- Per-account bank ledger with `BTX-000001` transactions, running balance and today's inflow/outflow
- Manual transaction types: deposit, withdrawal, sales collection, party payment, expense, loan receipt, loan repayment and other
- Account-to-account transfers (`TRF-000001`) that move money without changing the total business balance
- Automatic bank entries from wholesale UPI/bank receipts, party UPI/bank payments and UPI/bank expenses, with rollback on failure
- Bank Accounts page with account balances and today's inflow/outflow, plus a dashboard Bank Balance card
- "Coming Soon" placeholders for all future modules
- Server-side validation, consistent error responses, loading and empty states, toasts

## What is intentionally not included yet

Production, staff, loans and reports are not implemented yet. Bank accounts are tracked, but
there is no cheque management, reconciliation against bank statements or automatic import.
The cash book still tracks the single cash account separately from the bank accounts. Salary and
Loan Interest expenses feed the Staff payments and Loan payments rows, and the bank ledger has
loan receipt and loan repayment types, but there is no separate staff or loan module. WhatsApp
integration is limited to click-to-chat payment reminders; no paid WhatsApp Business API or
automatic server-side sending is used. Production stock deductions are not implemented; the
transaction type exists in the stock architecture for later use. No fake invoices, stock,
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
- Payment reminders open `https://wa.me/...` in a new tab. The message is generated in the
  browser and nothing is sent until the user presses Send in WhatsApp.
- Receipt and invoice PDFs use `Rs.` instead of `₹` because the built-in PDF fonts do not
  include the rupee glyph. On-screen and printed documents show `₹`.
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
