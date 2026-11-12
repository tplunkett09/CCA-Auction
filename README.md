# Auction Check-in & Checkout

A free, real-time auction web app that runs on **GitHub Pages** with **Firebase** (free "Spark" plan) as the shared live database. Every staff screen updates instantly when anyone changes anything.

| Page | Who uses it | What it does |
|---|---|---|
| `signup.html` | Bidders (public, via QR code) | Register and get the next bid number |
| `qr.html` | Staff | Printable QR sign that links to sign-up |
| `bidders.html` | Check-in staff | Search bidders: bid #, name, phone, address; export CSV |
| `winners.html` | Recording staff | Enter item # → winning bid # + amount |
| `checkout.html` | Cashier | Look up a bid #, see balance, mark items paid (cash/check/card), print receipt |
| `pickup.html` | Pickup table | Look up a bid #, hand out **paid** items, mark picked up |
| `index.html` | Anyone on staff | Live totals: sales, collected, owed, picked up |

Only `signup.html` is public. All other pages require a staff login, and the database rules block the public from reading anyone's information.

---

## One-time setup (about 20 minutes)

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** (Google Analytics: off is fine).
2. **Build → Firestore Database → Create database** → choose a US location → *Start in production mode*.
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.

### 2. Get your web config
1. Project settings (gear icon) → **General** → *Your apps* → click the **`</>`** (Web) icon → register an app (no hosting needed).
2. Copy the `firebaseConfig` values into **`js/config.js`**. Set `EVENT_NAME` and `FIRST_BID_NUMBER` there too.

> The Firebase API key is not a secret — it's meant to be in web pages. Security comes from the rules in step 5.

### 3. Put it on GitHub Pages
1. Create a new GitHub repository and upload all the files in this folder (keep the `js/` and `css/` folders).
2. Repo **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save.
3. Your site will be at `https://<your-username>.github.io/<repo-name>/`.

### 4. Allow your site to use Firebase login
Firebase console → **Authentication → Settings → Authorized domains → Add domain** → `<your-username>.github.io`

### 5. Create staff logins and lock down the data
1. **Authentication → Users → Add user** for each volunteer (email + password). Shared station logins like `checkout@yourorg.org` work fine.
2. Open **`firestore.rules`**, replace the example emails in the `isStaff()` list with your staff emails (lowercase).
3. Firestore Database → **Rules** → paste the whole file → **Publish**.

### 6. Open registration
Visit your site's home page and sign in once with a staff account. That creates the bid-number counter (starting at `FIRST_BID_NUMBER`). Then open **QR sign** and print it.

---

## Event-day flow
1. **Arrival** – bidder scans the QR sign, fills out the form, gets a big bid number on screen (they screenshot it). Staff can register walk-ups with *+ Add bidder*.
2. **Close of bidding** – recorders open **Winners** on a phone/laptop and type item #, bid #, amount. The winner's name shows as you type the bid # so mistakes are obvious.
3. **Checkout** – cashier types the bid #, sees every item and total, picks payment method, taps **Mark all paid**. *Bidders with a balance due* lists who still owes.
4. **Pickup** – volunteer types the bid #; only paid items can be marked picked up. *Paid and waiting for pickup* shows what's left to hand out.

## Good to know
- **Test first:** register a few fake bidders, run them through every station, then delete them in Firebase console → Firestore → `bidders` / `items`, and set `counters/bidders.next` back to your starting number.
- **After the event:** Export CSV from the Bidders page for your records. Firestore → items can be exported from the console too.
- **Free tier limits** (50k reads / 20k writes per day) are far more than a typical auction uses.
- Item numbers can be anything (`12`, `A-4`, `Silent-31`) but can't contain `/`.
- Bid numbers are assigned in a database transaction, so two people signing up at the same moment never get the same number.
