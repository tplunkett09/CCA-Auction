// Take or choose a photo on a phone, shrink it, and upload it to your ImageKit media library.
// Uploads are signed by a small Cloudflare Worker (see imagekit-signer.js / README) so the
// ImageKit private key never appears in this public website.
import * as cfg from "./config.js";

const PUBLIC_KEY = cfg.IMAGEKIT_PUBLIC_KEY || "";
const SIGNER_URL = cfg.IMAGEKIT_SIGNER_URL || "";
const FOLDER = cfg.IMAGEKIT_FOLDER || "/auction-items";
const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export const photosReady = () => !!(PUBLIC_KEY && SIGNER_URL);
export const notReadyMessage =
  "Photo uploads aren't set up yet — add your ImageKit public key and upload-signer link to js/config.js (see README).";

// Opens the camera (capture = true) or the photo library. Must be called straight from a tap.
export function pickPhoto(capture, onFile) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  if (capture) input.setAttribute("capture", "environment");   // rear camera
  input.style.display = "none";
  input.onchange = () => { const f = input.files?.[0]; input.remove(); if (f) onFile(f); };
  document.body.appendChild(input);
  input.click();
}

// Phone photos are often 4–12 MB. Shrink to max 1600px JPEG (~300–500 KB) so uploads are quick on event Wi-Fi.
async function shrink(file, max = 1600, quality = 0.85) {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;            // couldn't read it in the browser — upload the original as-is
  } finally { URL.revokeObjectURL(src); }
}

async function getSignature(user) {
  const idToken = await user.getIdToken();
  let r;
  try { r = await fetch(SIGNER_URL, { headers: { Authorization: "Bearer " + idToken } }); }
  catch { throw new Error("Couldn't reach the photo upload service — check the internet connection."); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Photo upload service refused (${r.status}).`);
  return j;   // { token, expire, signature }
}

function send(blob, fileName, auth, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", blob, fileName);
    fd.append("fileName", fileName);
    fd.append("publicKey", PUBLIC_KEY);
    fd.append("signature", auth.signature);
    fd.append("expire", String(auth.expire));
    fd.append("token", auth.token);
    fd.append("folder", FOLDER);
    fd.append("useUniqueFileName", "true");
    const x = new XMLHttpRequest();
    x.open("POST", UPLOAD_URL);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    x.onload = () => {
      let j = null; try { j = JSON.parse(x.responseText); } catch {}
      if (x.status < 300 && j?.url) resolve(j);
      else reject(new Error(j?.message ? `ImageKit: ${j.message}` : `Upload failed (${x.status}).`));
    };
    x.onerror = () => reject(new Error("Upload failed — check the internet connection."));
    x.send(fd);
  });
}

// Returns the new image's ImageKit URL.
export async function uploadPhoto(file, { user, name = "item", onProgress } = {}) {
  if (!photosReady()) throw new Error(notReadyMessage);
  onProgress?.(0, "Preparing photo…");
  const blob = await shrink(file);
  const auth = await getSignature(user);
  const safe = String(name).replace(/[^A-Za-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";
  const res = await send(blob, `${safe}.jpg`, auth, (p) => onProgress?.(p, `Uploading… ${Math.round(p * 100)}%`));
  return res.url;
}
