# Optional: mirror the privacy policy on GitHub Pages

**Primary policy URL for the Chrome Web Store:** deploy the Next.js app and use  
**`https://prodlytics.vercel.app/privacy-policy`** (see `frontend/src/app/privacy-policy/page.jsx`).  
You only need GitHub Pages if you want a second copy at `*.github.io`.

1. In your GitHub repo, use the file **`docs/chrome-web-store/PRIVACY_POLICY.md`** (or copy its contents).  
2. Enable **GitHub Pages**:  
   **Settings → Pages → Build and deployment → Source**: Deploy from branch.  
   - Folder: **`/docs`** (if you move the policy to `docs/index.md` or configure Jekyll), **or** use **GitHub Actions** to publish a simple static site.  
3. **Simplest option without Jekyll:**  
   - Create a repo (or use `username.github.io`) with a single **`index.html`** — paste the privacy text as HTML or use a Markdown-to-HTML export.  
   - Or add **`docs/privacy.html`** and set Pages to serve from `/docs`.  
4. Your policy URL will look like:  
   `https://<username>.github.io/<repo>/privacy.html`  
5. Paste that URL into the Chrome Web Store **Privacy policy** field.

**Tip:** Replace every `[your-email@domain.com]` and deployment placeholders in `PRIVACY_POLICY.md` **before** going live.
