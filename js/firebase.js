// Shared setup for every page: Firebase, staff login, header/nav, and small helpers.
import { firebaseConfig, EVENT_NAME, FIRST_BID_NUMBER, DEMO_MODE } from "./config.js";

// Load either the real Firebase SDK or the in-browser demo stand-in (same function names).
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
let fs, au, db, auth, resetDemo = null;
if (DEMO_MODE) {
  const demo = await import("./demo.js");
  fs = au = demo; db = demo.db; auth = demo.auth; resetDemo = demo.resetDemo;
} else {
  const { initializeApp } = await import(FB + "firebase-app.js");
  fs = await import(FB + "firebase-firestore.js");
  au = await import(FB + "firebase-auth.js");
  const app = initializeApp(firebaseConfig);
  db = fs.getFirestore(app);
  auth = au.getAuth(app);
}
export { db, auth, resetDemo, EVENT_NAME, FIRST_BID_NUMBER, DEMO_MODE };
export const {
  collection, doc, onSnapshot, runTransaction, setDoc, updateDoc,
  deleteDoc, getDoc, getDocs, writeBatch, serverTimestamp
} = fs;
const { onAuthStateChanged, signInWithEmailAndPassword, signOut } = au;
export const { sendPasswordResetEmail } = au;

if (DEMO_MODE) {
  const flag = () => {
    const d = document.createElement("div");
    d.className = "demo-flag";
    d.textContent = "DEMO MODE — test data in this browser only";
    document.body.prepend(d);
  };
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", flag) : flag();
}

// ---------- helpers ----------
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = (n) => (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
export const fullName = (b) => (b ? `${b.firstName || ""} ${b.lastName || ""}`.trim() : "");
export const address = (b) => {
  if (!b) return "";
  const cityLine = [b.city, b.state].filter(Boolean).join(", ") + (b.zip ? " " + b.zip : "");
  return [b.street, cityLine.trim()].filter(Boolean).join(", ");
};
export const phoneFmt = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p || "";
};
export const timeFmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
export const staffName = (email) => String(email || "").split("@")[0];
// Same donor typed slightly differently ("Smith Hardware" vs "smith  hardware ") counts as one donor.
export const donorKey = (name) => String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
export const naturalSort = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });

export function toast(msg, kind = "ok") {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), kind === "err" ? 6000 : 3000);
}

export function friendlyError(e) {
  const code = e?.code || "";
  if (code.includes("permission-denied")) return "Permission denied — this login doesn't have access to that. Ask an organizer to check your access on the Staff page.";
  if (code.includes("unavailable")) return "Can't reach the database — check the internet connection.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("too-many-requests")) return "Too many attempts — wait a minute and try again.";
  return e?.message || String(e);
}

// ---------- live data ----------
// Auctions are small (hundreds of bidders/items), so each staff page keeps the whole
// list live in memory. Every change anyone makes shows up on every open screen instantly.
// If a live connection is ever refused (e.g. rules still publishing, login changed),
// show why and keep retrying every few seconds, so a station never silently freezes.
function liveCollection(name, onData) {
  let unsub = null;
  const start = () => {
    unsub = onSnapshot(collection(db, name), (snap) => { clearBanner(name); onData(snap); }, (e) => {
      showBanner(name, friendlyError(e) + " Retrying…");
      setTimeout(start, 5000);
    });
  };
  start();
  return () => unsub && unsub();
}
export function listenBidders(cb) {
  return liveCollection("bidders", (snap) => {
    const map = new Map();
    snap.forEach((d) => map.set(Number(d.data().bidNumber), { id: d.id, ...d.data() }));
    cb(map);
  });
}
export function listenItems(cb) {
  return liveCollection("items", (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => naturalSort(a.itemNumber, b.itemNumber));
    cb(list);
  });
}

const bannerMsgs = new Map();
function showBanner(key, msg) { bannerMsgs.set(key, msg); paintBanner(); }
function clearBanner(key) { if (bannerMsgs.delete(key)) paintBanner(); }
function paintBanner() {
  let b = document.getElementById("banner");
  if (!bannerMsgs.size) { b?.remove(); return; }
  if (!b) {
    b = document.createElement("div");
    b.id = "banner";
    document.querySelector("main")?.prepend(b);
  }
  b.textContent = [...new Set(bannerMsgs.values())].join(" ");
}

// ---------- staff pages & who can see them ----------
// Each staff login has a record in the "staff" collection (managed on the Staff page) listing
// the pages it may use. Owners (named in the Firestore rules) and admins can use every page.
export const PAGES = [
  // file,           key,        menu label, description (shown on the Staff page)
  ["index.html",    "home",     "Home",     "Live totals"],
  ["items.html",    "items",    "Items",    "Add/edit items, descriptions, photos"],
  ["bidders.html",  "bidders",  "Bidders",  "Bidder names, phones, addresses"],
  ["winners.html",  "winners",  "Winners",  "Enter winning bids"],
  ["checkout.html", "checkout", "Checkout", "Take payments, receipts"],
  ["pickup.html",   "pickup",   "Pickup",   "Hand out items"],
  ["qr.html",       "qr",       "QR sign",  "Print the sign-up QR code"],
  ["reports.html",  "reports",  "Reports",  "Donor reports"],
];
const ADMIN_PAGES = [["access.html", "Staff"], ["test.html", "Test"]];
const ALL_KEYS = PAGES.map((p) => p[1]);
export let currentAccess = null;

async function loadAccess(user) {
  const email = String(user.email || "").toLowerCase();
  if (DEMO_MODE && email === "demo@local") return { admin: true, owner: true, pages: ALL_KEYS };
  const me = await getDoc(doc(db, "staff", email));
  if (me.exists()) {
    const d = me.data();
    return d.admin ? { admin: true, pages: ALL_KEYS, name: d.name }
                   : { admin: false, pages: (d.pages || []).filter((k) => ALL_KEYS.includes(k)), name: d.name };
  }
  if (DEMO_MODE) return { admin: false, pages: [] };
  // No staff record: owners are allowed to list the staff collection, everyone else isn't.
  try { await getDocs(collection(db, "staff")); return { admin: true, owner: true, pages: ALL_KEYS }; }
  catch (e) { if (String(e.code).includes("permission")) return { admin: false, pages: [] }; throw e; }
}

export function staffPage(title, onReady) {
  document.title = `${title} · ${EVENT_NAME}`;
  const here = location.pathname.split("/").pop() || "index.html";
  const header = document.createElement("header");
  header.innerHTML = `
    <div class="bar">
      <a class="brand" href="index.html">${esc(EVENT_NAME)}</a>
      <span class="who" id="who"></span>
    </div>
    <nav hidden></nav>`;
  document.body.prepend(header);
  const nav = header.querySelector("nav");
  const main = document.querySelector("main");
  const content = main.innerHTML;
  main.innerHTML = `<p class="muted">Loading…</p>`;

  let started = false;
  onAuthStateChanged(auth, async (user) => {
    if (!user) { nav.hidden = true; renderLogin(main); return; }
    document.getElementById("who").innerHTML =
      `${esc(user.email)} <button class="link" id="signout">Sign out</button>`;
    document.getElementById("signout").onclick = () => signOut(auth).then(() => location.reload());
    if (started) return;
    started = true;
    main.innerHTML = `<p class="muted">Checking your access…</p>`;

    let access;
    try { access = await loadAccess(user); }
    catch (e) {
      main.innerHTML = `<div class="card narrow"><h1>Can't check access</h1><p>${esc(friendlyError(e))}</p>
        <button class="primary" onclick="location.reload()">Try again</button></div>`;
      return;
    }
    currentAccess = access;

    const allowed = PAGES.filter(([, key]) => access.pages.includes(key)).map(([href, , label]) => [href, label]);
    if (access.admin) allowed.push(ADMIN_PAGES[0]);
    if (!allowed.length) {
      main.innerHTML = `<div class="card narrow"><h1>No access yet</h1>
        <p>You're signed in as <b>${esc(user.email)}</b>, but this login hasn't been given any staff pages.</p>
        <p class="muted">Ask an organizer to add you on the Staff page, then reload.</p>
        <button class="primary" onclick="location.reload()">Reload</button></div>`;
      return;
    }
    const pageKey = PAGES.find(([href]) => href === here)?.[1];
    const canSee = access.admin || (pageKey && access.pages.includes(pageKey));
    if (!canSee) { location.replace(allowed[0][0]); return; }   // send them to a page they can use

    nav.innerHTML = allowed.map(([href, label]) =>
      `<a href="${href}" class="${href === here ? "active" : ""}">${label}</a>`).join("");
    nav.hidden = false;
    main.innerHTML = content;
    onReady(user, access);
  });
}

// Creates a sign-in for a new staff member without signing the organizer out
// (uses a separate, temporary Firebase connection).
export async function createStaffLogin(email, password) {
  if (DEMO_MODE) return "created";
  const { initializeApp, deleteApp } = await import(FB + "firebase-app.js");
  const tmp = initializeApp(firebaseConfig, "staff-setup-" + Date.now());
  try {
    const tmpAuth = au.getAuth(tmp);
    await au.createUserWithEmailAndPassword(tmpAuth, email, password);
    await au.signOut(tmpAuth);
    return "created";
  } catch (e) {
    if (String(e.code).includes("email-already-in-use")) return "exists";
    throw e;
  } finally { await deleteApp(tmp); }
}

function renderLogin(main) {
  main.innerHTML = `
    <form class="card narrow" id="login">
      <h1>Staff sign in</h1>
      <label>Email <input type="email" name="email" autocomplete="username" required></label>
      <label>Password <input type="password" name="password" autocomplete="current-password" required></label>
      <button class="primary big" type="submit">Sign in</button>
      <button class="link" type="button" id="forgot">Forgot password?</button>
      <p class="err" id="loginErr"></p>
    </form>`;
  const f = document.getElementById("login");
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value); }
    catch (err) { document.getElementById("loginErr").textContent = friendlyError(err); }
  };
  document.getElementById("forgot").onclick = async () => {
    const email = f.email.value.trim();
    if (!email) return (document.getElementById("loginErr").textContent = "Type your email first.");
    try { await sendPasswordResetEmail(auth, email); toast("Password reset email sent."); }
    catch (err) { document.getElementById("loginErr").textContent = friendlyError(err); }
  };
}

// Used by the public signup page and the staff "add bidder" button.
// Atomically takes the next bid number so two people can never get the same one.
export async function registerBidder(data) {
  const counterRef = doc(db, "counters", "bidders");
  return runTransaction(db, async (tx) => {
    const c = await tx.get(counterRef);
    if (!c.exists()) throw new Error("Registration isn't open yet — a staff member needs to sign in to the Home page once.");
    const bidNumber = c.data().next;
    tx.update(counterRef, { next: bidNumber + 1 });
    tx.set(doc(db, "bidders", String(bidNumber)), { ...data, bidNumber, createdAt: serverTimestamp() });
    return bidNumber;
  });
}
