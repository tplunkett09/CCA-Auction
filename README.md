# Auction Check-in & Checkout

A free, real-time auction web app that runs on **GitHub Pages** with **Firebase** (free "Spark" plan) as the shared live database. Every staff screen updates instantly when anyone changes anything.

| Page | Who uses it | What it does |
|---|---|---|
| `signup.html` | Bidders (public, via QR code) | Register and get the next bid number |
| `access.html` | Admins | Add staff and choose which pages each can use |
| `qr.html` | Staff | Printable QR sign that links to sign-up |
| `bidders.html` | Check-in staff | Search bidders: bid #, name, phone, address; export CSV |
| `winners.html` | Recording staff | Enter item # → winning bid # + amount |
| `checkout.html` | Cashier | Look up a bid #, see balance, mark items paid (cash/check/card), print receipt |
| `pickup.html` | Pickup table | Look up a bid #, hand out **paid** items, mark picked up |
| `index.html` | Staff | Staff home: live totals, bid number controls, links to every station |

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

### 5. Lock down the data and add staff
1. Firestore Database → **Rules** → paste the whole `firestore.rules` file → **Publish**. The two **owners** named at the top of that file always have every page.
2. Sign in as an owner and open the **Staff** page. Add each volunteer's email, optionally set a password (this creates their sign-in), and tick the pages they can use. Tick **Admin** for organizers who should see everything and manage staff.
3. Volunteers only see the pages they were given; opening any other page sends them to one they can use.

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

---

## Phone camera photos (ImageKit)

Staff can tap **📷 Take photo** on the Items page (or **📷 Photo** on any item in the list) and the picture is
shrunk on the phone, uploaded to your ImageKit media library, and linked to the item automatically.

ImageKit requires each upload to be signed with your **private** key, which must never be put in this public site.
A free Cloudflare Worker does the signing, and only for signed-in staff. One-time setup (about 10 minutes):

1. **ImageKit keys:** ImageKit dashboard → **Developer options** → **API keys**. Note the **Public key** and **Private key**.
2. **Create the Worker:** sign up free at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Create Worker** → name it e.g. `cca-auction-photos` → **Deploy** → **Edit code** → delete the sample,
   paste all of `imagekit-signer.js` → **Deploy**.
3. **Worker settings:** the Worker's **Settings → Variables and Secrets → Add**:
   - `IMAGEKIT_PRIVATE_KEY` — type **Secret** — your ImageKit private key
   - `FIREBASE_PROJECT_ID` — type Text — `cca-auction`
   - `ALLOWED_ORIGIN` — type Text — `https://tplunkett09.github.io`
   Then **Deploy** again.
4. **Copy the Worker link** shown on its overview page (like `https://cca-auction-photos.yourname.workers.dev`).
5. **Edit `js/config.js`** in the repo: paste the public key into `IMAGEKIT_PUBLIC_KEY` and the Worker link into
   `IMAGEKIT_SIGNER_URL`. Optionally change `IMAGEKIT_FOLDER`. Commit.

Photos land in that folder of your ImageKit media library.
