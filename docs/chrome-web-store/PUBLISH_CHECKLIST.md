# Chrome Web Store — complete publish checklist

Use this after your dashboard is deployed (so `/privacy-policy` is live).

---

## 1. Privacy policy URL (required)

- [ ] Deploy the **frontend** so this URL returns 200:  
  **https://prodlytics.vercel.app/privacy-policy**  
  (or your custom domain + `/privacy-policy`.)
- [ ] In [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → your item → **Privacy practices**, paste that **exact** HTTPS URL.
- [ ] In Vercel (or your host) set **`NEXT_PUBLIC_SUPPORT_EMAIL`** to a real inbox you monitor (e.g. `you@domain.com`). Redeploy. Reload the privacy page and confirm the email shows and the mailto link works.
- [ ] Optional: set **`NEXT_PUBLIC_DATA_REGION`** (e.g. where MongoDB / API run) so section 3 reads clearly for reviewers.

`frontend/.env.example` lists these variables.

---

## 2. Markdown mirror (optional)

`docs/chrome-web-store/PRIVACY_POLICY.md` is for GitHub / lawyers / backups. The **store** only needs the **live URL** above. You do **not** have to host the Markdown file separately if the Next.js page is live.

See `GITHUB_PAGES.md` only if you want a second copy on GitHub Pages.

---

## 3. Screenshots (required)

Chrome needs at least **one** screenshot; more help users understand the product.

| Spec | Recommendation |
|------|------------------|
| Size | **1280×800** or **640×400** (or same aspect ratio) |
| Content | Popup + one line of what it does; optional second: dashboard with charts |

**How to capture**

1. Set Chrome window to roughly the target size (or capture larger and crop to 1280×800).
2. Open the extension **popup** (`chrome://extensions` → ProdLytics → pin → click icon). Screenshot the popup; optionally include a bit of toolbar.
3. Optional: screenshot **https://prodlytics.vercel.app** logged in (Overview or Goals) for a second image.
4. Save as PNG or JPEG. No borders required.

---

## 4. Extension package (zip)

From the **`extension`** folder:

```bash
npm install
npm run build
npm run zip:store
```

This writes **`extension/prodlytics-extension-store.zip`** with **`dist/` contents at the zip root** (not nested in a folder). Upload **that zip** in the developer dashboard.

---

## 5. Developer account

- [ ] Pay the [Chrome Web Store developer registration fee](https://developer.chrome.com/docs/webstore/register) if you have not already (one-time).

---

## 6. Privacy / data disclosure (dashboard form)

Answer **honestly** based on your actual build. Align with `STORE_LISTING.md` → *Data disclosure checklist* and the live privacy policy. Typical mapping for ProdLytics:

| Topic | Likely answer |
|-------|----------------|
| Personally identifiable information | **Yes** (email if Google sign-in; anonymous id otherwise) |
| Health / financial | **No** (unless you added such features) |
| Location | **No** (unless you collect GPS, etc.) |
| Web history | **Yes** (domains, time on sites — as described in policy) |
| User activity | **Yes** (time on sites, engagement signals you collect) |
| Website content | **Limited** (e.g. page titles; not full page text for ads) |

If any answer differs in your code, **change the policy and the form** to match.

---

## 7. Icons

- [ ] Open `extension/icons/icon.png` at **128×128** zoom in an image viewer. If it is blurry, export dedicated **16**, **48**, and **128** PNGs from a vector source and update `manifest.json` paths if you split files.

---

## 8. Listing text

Copy from **`STORE_LISTING.md`** into the store fields: name, short description, full description, single purpose, permission justifications (`<all_urls>`, content scripts, etc.).

---

## 9. After submit

- Reviewers may email or flag **broad host access** — your justifications in `STORE_LISTING.md` are there for that.
- Keep **`NEXT_PUBLIC_SUPPORT_EMAIL`** monitored for user and Google support mail.

---

## Quick links

- Policy (live): `https://prodlytics.vercel.app/privacy-policy`
- Store console: https://chrome.google.com/webstore/devconsole
- Registration: https://developer.chrome.com/docs/webstore/register
