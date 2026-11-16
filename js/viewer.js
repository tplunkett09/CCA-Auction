// Full-screen item photo viewer, built for phones. Used by Pickup and Checkout.
//   openItemViewer({ itemNumber, description, imageUrl, details: ["line", ...] }, buttonThatOpenedIt)
// Closes with the X, the phone's Back button/gesture, a tap on the dark area, or Esc.

const CSS = `
.viewer { position: fixed; inset: 0; z-index: 100; background: #0b0d10; color: #fff;
  display: flex; flex-direction: column; overscroll-behavior: contain; }
.viewer[hidden] { display: none; }
.v-close { position: absolute; z-index: 2; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right));
  width: 48px; height: 48px; border-radius: 50%; border: none; padding: 0;
  background: rgba(255, 255, 255, .92); color: #111; font-size: 30px; line-height: 48px; font-weight: 300;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .4); cursor: pointer; }
.v-close:focus-visible { outline: 3px solid #5ea7dc; outline-offset: 2px; }
.v-img { flex: 1 1 0; min-height: 0; display: flex; align-items: center; justify-content: center;
  padding: 72px 8px 8px; position: relative; overflow: hidden; }
.v-img img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;
  border-radius: 6px; opacity: 0; transition: opacity .2s; }
.v-img img.loaded { opacity: 1; }
.v-msg { position: absolute; color: #bbb; font-size: .95rem; text-align: center; padding: 0 24px; }
.v-info { padding: 14px 18px max(18px, env(safe-area-inset-bottom)); background: rgba(0, 0, 0, .35); }
.v-num { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #aab; }
.v-title { font-size: 1.25rem; font-weight: 700; margin: 2px 0 6px; }
.v-meta { color: #ccd; font-size: .95rem; }
.v-info a { color: #9fd0ff; display: inline-block; margin-top: 10px; padding: 6px 0; }
@media (min-width: 900px) { .v-img { padding: 72px 72px 16px; } .v-info { text-align: center; } }`;

let el = null, img, msg, closeBtn, returnFocus = null;

function build() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  el = document.createElement("div");
  el.className = "viewer"; el.hidden = true;
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "vTitle");
  el.innerHTML = `
    <button class="v-close" type="button" aria-label="Close">&times;</button>
    <div class="v-img"><div class="v-msg"></div><img alt=""></div>
    <div class="v-info">
      <div class="v-num"></div><div class="v-title" id="vTitle"></div><div class="v-meta"></div>
      <a target="_blank" rel="noopener">Open full-size photo ↗</a>
    </div>`;
  document.body.appendChild(el);
  img = el.querySelector("img"); msg = el.querySelector(".v-msg"); closeBtn = el.querySelector(".v-close");
  closeBtn.onclick = closeViewer;
  el.querySelector(".v-img").onclick = (e) => { if (e.target !== img) closeViewer(); };   // tap around the photo
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.hidden) closeViewer(); });
  addEventListener("popstate", () => { if (!el.hidden) hide(); });                        // phone Back button
}

// ImageKit can resize on the fly: ask for a phone-sharp version (max 1200px wide, never enlarged)
// instead of the original camera file. Other image hosts get the original link.
export function largeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("imagekit.io") && !u.searchParams.has("tr") && !u.pathname.includes("/tr:")) {
      u.searchParams.set("tr", "w-1200,h-1600,c-at_max");
    }
    return u.href;
  } catch { return url; }
}

export function openItemViewer(item, fromBtn) {
  if (!item?.imageUrl) return;
  if (!el) build();
  returnFocus = fromBtn || null;
  const hasNum = item.itemNumber != null && String(item.itemNumber).trim() !== "";
  el.querySelector(".v-num").textContent = hasNum ? `Item #${item.itemNumber}` : "Item (not numbered yet)";
  el.querySelector(".v-title").textContent = item.description || "";
  el.querySelector(".v-meta").textContent = (item.details || []).filter(Boolean).join(" · ");
  el.querySelector(".v-info a").href = item.imageUrl;
  img.className = ""; img.alt = item.description || `Item ${item.itemNumber}`;
  msg.textContent = "Loading photo…"; msg.hidden = false;
  img.onload = () => { img.className = "loaded"; msg.hidden = true; };
  img.onerror = () => { msg.textContent = "Couldn't load this photo. Check the image link on the Items page."; };
  img.src = largeUrl(item.imageUrl);
  el.hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState({ viewer: true }, "");   // so the phone's Back button closes the photo, not the page
  closeBtn.focus();
}

function hide() {
  el.hidden = true;
  document.body.style.overflow = "";
  img.removeAttribute("src");
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}
export function closeViewer() { if (history.state?.viewer) history.back(); else hide(); }
