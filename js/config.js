// DEMO MODE: true = no database; test data lives in this browser only (10 sample items, 6 bidders).
// false = live Firebase database shared by every device.
export const DEMO_MODE = false;

// Firebase web app config for project "cca-auction"
export const firebaseConfig = {
  apiKey: "AIzaSyCIRNQgVjeto9jS7YGY-v6BkxGTmha6gEU",
  authDomain: "cca-auction.firebaseapp.com",
  projectId: "cca-auction",
  storageBucket: "cca-auction.firebasestorage.app",
  messagingSenderId: "689978457446",
  appId: "1:689978457446:web:18fff05318f6f99b35dca7"
};

// Your event name — shown in page headers, the signup page and the QR sign.
export const EVENT_NAME = "CCA Auction";

// Text at the bottom of every PDF receipt (e.g. your nonprofit name and EIN).
export const RECEIPT_FOOTER = "Thank you for supporting CCA! Please keep this receipt for your records.";

// ---- Photo uploads to ImageKit (see README, "Phone camera photos") ----
// Public key: ImageKit dashboard → Developer options → API keys → Public key (safe to publish).
export const IMAGEKIT_PUBLIC_KEY = "public_8d0D0oeKDiSg2PIotqUhX1vMRko=";
// Your Cloudflare Worker link, e.g. "https://cca-auction-photos.yourname.workers.dev"
export const IMAGEKIT_SIGNER_URL = "https://cca-auction-photos.2009buckshot.workers.dev";
// Folder in your ImageKit media library where item photos are saved.
export const IMAGEKIT_FOLDER = "/cca-auction";

// Fund-a-Need (paddle raise) giving levels, in dollars, in the order the buttons appear.
export const FUND_LEVELS = [50, 100, 500, 1000, 5000];

// Item categories, in the order item numbers are assigned (Food first, then Gift Cards, ...).
export const CATEGORIES = ["Food", "Gift Cards", "Kitchen", "Home Decor", "Apparel", "Kids",
  "Accessories", "Hunting/Outdoor", "Automotive", "Farm"];

// Item numbers start here when you press "Assign item numbers".
export const FIRST_ITEM_NUMBER = 125;

// The first bid number handed out. Numbers count up from here.
export const FIRST_BID_NUMBER = 1;
