# Deploy Egotech to Netlify 🚀

This folder has been prepared specifically for seamless, one-click deployment on Netlify without needing to upload files one by one.

---

## Method 1: Netlify Drop (Instant Drag & Drop — No Git Required)

This is the fastest method (takes ~10 seconds):

1. Open your browser and go to: **[https://app.netlify.com/drop](https://app.netlify.com/drop)** (Sign in to your free Netlify account).
2. Open your File Explorer and navigate to:
   `C:\Users\HARSH\Downloads\egotech\netlify-drop-ready`
3. Drag the entire **`netlify-drop-ready`** folder and drop it into the upload box on Netlify.
4. **Done!** Netlify will publish your Egotech platform immediately with a public URL (e.g. `https://egotech-xxxx.netlify.app`) and free SSL.

> **Note:** The `_redirects` file is pre-configured so that all React pages (`/dashboard`, `/employees`, `/payroll`, `/attendance`) route cleanly without 404 errors when refreshed.

---

## Method 2: Git / GitHub to Netlify (Continuous Deployment)

If you prefer connecting your code repository:

1. Push this `egotech` folder to your GitHub account (or initialize a git repo here).
2. Go to **[https://app.netlify.com](https://app.netlify.com)** and click **"Add new site"** → **"Import an existing project"**.
3. Select your GitHub repository.
4. Netlify will automatically detect the included `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
5. Click **"Deploy Egotech"**!

---

## Backend API Configuration

If you want the deployed frontend on Netlify to connect to a cloud backend:
1. In your Netlify Site Configuration, go to **Site configuration → Environment variables**.
2. Add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-api-url.com`
3. Netlify will automatically route all requests to your remote server!
