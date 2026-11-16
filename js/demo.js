// DEMO MODE: a stand-in for Firebase that keeps data in this browser (localStorage).
// Same function names as the Firebase SDK, so the pages don't know the difference.
// Real-time works between tabs/windows of the SAME browser on the SAME device.

const KEY = "auctionDemoDB_v2";

const SEED = () => ({
  counters: { bidders: { next: 7 } },
  bidders: Object.fromEntries([
    [1, "Mary", "Johnson", "6155550100", "mary@example.com", "12 Oak St", "Franklin", "TN", "37064"],
    [2, "James", "Smith", "6155550101", "", "88 Maple Ave", "Franklin", "TN", "37067"],
    [3, "Linda", "Garcia", "6155550102", "linda@example.com", "4 Elm Ct", "Brentwood", "TN", "37027"],
    [4, "Robert", "Brown", "6155550103", "", "230 Pine Rd", "Nashville", "TN", "37215"],
    [5, "Patricia", "Miller", "6155550104", "pmiller@example.com", "9 Cedar Ln", "Franklin", "TN", "37069"],
    [6, "Michael", "Davis", "6155550105", "", "71 Birch Dr", "Spring Hill", "TN", "37174"],
  ].map(([bidNumber, firstName, lastName, phone, email, street, city, state, zip]) =>
    [String(bidNumber), { bidNumber, firstName, lastName, phone, email, street, city, state, zip, createdAt: { __ts: Date.now() } }])),
  items: Object.fromEntries([
    ["1", "Wine & cheese gift basket", 1, 85, true, true],
    ["2", "Weekend cabin stay", 1, 450, true, false],
    ["3", "Signed football", 2, 120, false, false],
    ["4", "Spa day package", 3, 200, true, false],
    ["5", "Handmade quilt", 4, 175, false, false],
    ["6", "$100 restaurant gift card", 4, 90, false, false],
    ["7", "Kids bike", null, null, false, false],
    ["8", "Golf foursome", null, null, false, false],
    ["9", "Pottery class for two", null, null, false, false],
    ["10", '50" smart TV', null, null, false, false],
  ].map(([itemNumber, description, bidNumber, amount, paid, pickedUp], k) => [itemNumber, {
    itemNumber, description, bidNumber, amount, paid, pickedUp,
    retailValue: [120, 600, 150, 250, 300, 100, 180, 400, 90, 450][k],
    ...(paid ? { paidAt: { __ts: Date.now() }, paidMethod: "Card", paidBy: "demo@local" } : {}),
    ...(pickedUp ? { pickedUpAt: { __ts: Date.now() }, pickedUpBy: "demo@local" } : {}),
  }])),
});

let store = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.bidders) return s; } catch {}
  const s = SEED(); save(s); return s;
}
function save(s = store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function resetDemo() { store = SEED(); save(); notifyAll(); }

// Timestamps are stored as {__ts: ms} and handed to pages as objects with toDate(), like Firestore.
const revive = (v) => (v && typeof v === "object" && "__ts" in v) ? { toDate: () => new Date(v.__ts) } : v;
const reviveDoc = (d) => d && Object.fromEntries(Object.entries(d).map(([k, v]) => [k, revive(v)]));
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- Firestore look-alikes ----------
export const db = { demo: true };
export const collection = (_db, name) => ({ kind: "col", name });
export const doc = (_db, col, id) => ({ kind: "doc", col, id: String(id) });
export const serverTimestamp = () => ({ __ts: Date.now() });

const snapDoc = (ref) => {
  const d = store[ref.col]?.[ref.id];
  return { id: ref.id, exists: () => !!d, data: () => reviveDoc(clone(d || {})) };
};

const listeners = new Set();
export function onSnapshot(ref, next) {
  const l = { name: ref.name, next };
  listeners.add(l);
  queueMicrotask(() => fire(l));
  return () => listeners.delete(l);
}
function fire(l) {
  const docs = Object.keys(store[l.name] || {}).map((id) => snapDoc({ col: l.name, id }));
  l.next({ forEach: (cb) => docs.forEach(cb), size: docs.length });
}
function notify(cols) { listeners.forEach((l) => cols.has(l.name) && fire(l)); }
function notifyAll() { listeners.forEach(fire); }
// Changes made in another tab of this browser
addEventListener("storage", (e) => { if (e.key === KEY) { store = load(); notifyAll(); } });

const delay = () => new Promise((r) => setTimeout(r, 60)); // feel like a network call

function apply(ops) {
  const touched = new Set();
  for (const { type, ref, data, merge } of ops) {
    store[ref.col] ??= {};
    const cur = store[ref.col][ref.id];
    if (type === "delete") delete store[ref.col][ref.id];
    else if (type === "update") {
      if (!cur) throw Object.assign(new Error(`No document ${ref.col}/${ref.id}`), { code: "not-found" });
      store[ref.col][ref.id] = { ...cur, ...clone(data) };
    } else store[ref.col][ref.id] = merge ? { ...(cur || {}), ...clone(data) } : clone(data);
    touched.add(ref.col);
  }
  save(); notify(touched);
}

export async function getDoc(ref) { await delay(); return snapDoc(ref); }
export async function getDocs(ref) {
  await delay();
  const docs = Object.keys(store[ref.name] || {}).map((id) => snapDoc({ col: ref.name, id }));
  return { forEach: (cb) => docs.forEach(cb), size: docs.length, docs };
}
export async function setDoc(ref, data, opts = {}) { await delay(); apply([{ type: "set", ref, data, merge: opts.merge }]); }
export async function updateDoc(ref, data) { await delay(); apply([{ type: "update", ref, data }]); }
export async function deleteDoc(ref) { await delay(); apply([{ type: "delete", ref }]); }
export function writeBatch() {
  const ops = [];
  return {
    set: (ref, data, o = {}) => ops.push({ type: "set", ref, data, merge: o.merge }),
    update: (ref, data) => ops.push({ type: "update", ref, data }),
    delete: (ref) => ops.push({ type: "delete", ref }),
    commit: async () => { await delay(); apply(ops); },
  };
}
export async function runTransaction(_db, fn) {
  await delay();
  store = load(); // pick up the latest from other tabs first
  const ops = [];
  const tx = {
    get: async (ref) => snapDoc(ref),
    set: (ref, data, o = {}) => ops.push({ type: "set", ref, data, merge: o.merge }),
    update: (ref, data) => ops.push({ type: "update", ref, data }),
    delete: (ref) => ops.push({ type: "delete", ref }),
  };
  const result = await fn(tx);
  apply(ops);
  return result;
}

// ---------- Auth look-alikes: everyone is signed in as a demo staff member ----------
export const auth = { demo: true };
// In demo mode you're signed in as the owner "demo@local". To try what a volunteer sees, add them
// on the Staff page, then run  localStorage.demoEmail = "their@email"  in the browser console and reload.
const demoEmail = () => { try { return localStorage.getItem("demoEmail") || "demo@local"; } catch { return "demo@local"; } };
export function onAuthStateChanged(_auth, cb) {
  queueMicrotask(() => cb({ email: demoEmail(), getIdToken: async () => "demo-token" })); return () => {};
}
export const signInWithEmailAndPassword = async () => ({ user: { email: "demo@local" } });
export const signOut = async () => { try { localStorage.removeItem("demoEmail"); } catch {} };
export const sendPasswordResetEmail = async () => {};
