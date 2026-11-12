// Builds a one-page PDF receipt in the browser (no server) and shares or downloads it.
// Needs jsPDF loaded on the page: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js">
import * as cfg from "./config.js";
import { fullName, address, phoneFmt } from "./firebase.js";

const EVENT_NAME = cfg.EVENT_NAME || "Auction";
const FOOTER = cfg.RECEIPT_FOOTER ||
  "Thank you for supporting our auction! Please keep this receipt for your records.";

// The built-in PDF font only knows basic Latin characters, so swap fancy punctuation.
const latin = (s) => String(s ?? "")
  .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x00-\xFF]/g, "");
const usd = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildReceipt(bidNumber, bidder, items) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const L = 54, R = 558;
  let y = 64;
  const newPageIfNeeded = (need = 40) => { if (y + need > 730) { pdf.addPage(); y = 64; } };

  pdf.setFont("helvetica", "bold").setFontSize(22).text(latin(EVENT_NAME), L, y);
  y += 22;
  pdf.setFont("helvetica", "normal").setFontSize(12).setTextColor(90);
  pdf.text("Receipt", L, y);
  pdf.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), R, y, { align: "right" });
  pdf.setDrawColor(200).line(L, y + 12, R, y + 12);

  y += 40;
  pdf.setTextColor(0).setFont("helvetica", "bold").setFontSize(14);
  pdf.text(latin(`Bidder #${bidNumber}   ${fullName(bidder)}`), L, y);
  pdf.setFont("helvetica", "normal").setFontSize(11).setTextColor(70);
  if (bidder) {
    for (const ln of [phoneFmt(bidder.phone), address(bidder), bidder.email].filter(Boolean)) { y += 16; pdf.text(latin(ln), L, y); }
  }

  // table
  y += 34;
  const col = { item: L, desc: L + 60, retail: 440, paid: R };
  const header = () => {
    pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(90);
    pdf.text("ITEM #", col.item, y); pdf.text("DESCRIPTION", col.desc, y);
    pdf.text("RETAIL VALUE", col.retail, y, { align: "right" }); pdf.text("PRICE PAID", col.paid, y, { align: "right" });
    pdf.setDrawColor(200).line(L, y + 6, R, y + 6);
    y += 22;
  };
  header();
  pdf.setTextColor(0);
  let total = 0, paid = 0, retail = 0;
  const methods = new Set();
  for (const i of items) {
    const desc = pdf.setFont("helvetica", "normal").setFontSize(11).splitTextToSize(latin(i.description || ""), 250);
    newPageIfNeeded(desc.length * 14 + 10);
    if (y === 64) header();
    pdf.setFont("helvetica", "bold").text(latin(i.itemNumber), col.item, y);
    pdf.setFont("helvetica", "normal").text(desc, col.desc, y);
    pdf.text(i.retailValue != null ? usd(i.retailValue) : "-", col.retail, y, { align: "right" });
    pdf.text(usd(i.amount), col.paid, y, { align: "right" });
    if (!i.paid) { pdf.setTextColor(180, 30, 30).setFontSize(9).text("UNPAID", col.paid, y + 12, { align: "right" }).setTextColor(0).setFontSize(11); }
    y += Math.max(desc.length, i.paid ? 1 : 2) * 14 + 8;
    total += Number(i.amount) || 0;
    if (i.paid) { paid += Number(i.amount) || 0; if (i.paidMethod) methods.add(i.paidMethod); }
    retail += Number(i.retailValue) || 0;
  }

  // totals
  newPageIfNeeded(120);
  pdf.setDrawColor(200).line(L, y - 4, R, y - 4);
  y += 14;
  const row = (label, val, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 13 : 11);
    pdf.text(label, col.retail, y, { align: "right" }); pdf.text(val, col.paid, y, { align: "right" }); y += 18;
  };
  row("Total", usd(total));
  row("Paid" + (methods.size ? ` (${[...methods].join(", ")})` : ""), usd(paid));
  row("Balance due", usd(total - paid), true);
  if (retail > 0) {
    y += 6;
    pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(90);
    pdf.text(`Total retail value of items received: ${usd(retail)}`, L, y);
    y += 14;
    pdf.text(`Amount paid above retail value: ${usd(Math.max(0, paid - retail))}`, L, y);
    pdf.setTextColor(0);
  }

  // footer
  y += 36; newPageIfNeeded(60);
  pdf.setFont("helvetica", "italic").setFontSize(10).setTextColor(90);
  pdf.text(pdf.splitTextToSize(latin(FOOTER), R - L), L, y);

  return pdf.output("blob");
}

// On phones this opens the share sheet (Messages, email, AirDrop...). Elsewhere it downloads.
export async function shareReceipt(bidNumber, bidder, items) {
  const blob = buildReceipt(bidNumber, bidder, items);
  const name = `${EVENT_NAME.replace(/[^\w]+/g, "-")}-Receipt-${bidNumber}.pdf`;
  const file = new File([blob], name, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${EVENT_NAME} receipt`, text: `Your ${EVENT_NAME} receipt (bidder #${bidNumber})` });
      return "shared";
    } catch (e) { if (e.name === "AbortError") return "cancelled"; }
  }
  downloadReceipt(blob, name);
  return "downloaded";
}
export function downloadReceipt(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
