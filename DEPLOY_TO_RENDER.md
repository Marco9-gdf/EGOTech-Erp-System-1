# Deploy Egotech to Render (Full-Stack: Frontend + Database) 🚀

Render is an ideal hosting platform for Egotech because it runs both the **React Frontend** and the **Node.js Express Backend with Database** together on a single URL for free!

---

### Step 1: Open Render
1. Go to: **[https://dashboard.render.com](https://dashboard.render.com)** (Sign in or sign up with your GitHub account).
2. Click the blue **"New +"** button at the top right.
3. Select **"Web Service"**.

---

### Step 2: Connect Your GitHub Repository
1. Choose **"Build and deploy from a Git repository"** and click **Next**.
2. Select your repository: **`Marco9-gdf/EGOTech-Erp-System`**.

---

### Step 3: Configure Settings (Takes 30 seconds)
Render will ask for a few simple fields:

* **Name:** `egotech-erp` (or any name you like)
* **Language / Runtime:** `Node`
* **Region:** (Leave default, e.g. Oregon or Frankfurt)
* **Branch:** `main`
* **Build Command:** `npm run build:render`
* **Start Command:** `node --experimental-sqlite server/src/index.js` (or simply `npm start`)
* **Instance Type:** `Free`

*(Render auto-detects `render.yaml` if you use Blueprint, or you can fill in the fields above).*

---

### Step 4: Click "Deploy Web Service"
1. Click the blue **"Deploy Web Service"** button at the bottom.
2. Render will build the frontend and launch your server.
3. In about 2–3 minutes, you will get your official live URL:
   `https://egotech-erp.onrender.com`
4. Open the link, log in with your credentials:
   * **Owner Account:** `khiladiharsh786@gmail.com` | Password: `826999`
   * **Admin Account:** `admin@egotech.com` | Password: `826999`
   * **HR Account:** `hr@company.com` | Password: `826999`
   * **Staff Account:** `john.doe@company.com` | Password: `826999`
5. **Everything works 100%** — including database persistence, live API calls, and Indian Rupee (₹ INR) payroll!
