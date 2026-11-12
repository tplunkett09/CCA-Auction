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

// The first bid number handed out. Numbers count up from here.
export const FIRST_BID_NUMBER = 1;
