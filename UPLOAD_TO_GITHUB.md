# Upload Egotech to GitHub 🐙

The git repository in this folder is already initialized and committed on branch `main`!

Follow these 2 simple steps to upload it to your GitHub:

---

### Step 1: Create a Repository on GitHub
1. Go to: **[https://github.com/new](https://github.com/new)** (log in to your GitHub account).
2. Enter repository name: `egotech` (or any name you prefer).
3. Keep it **Public** or **Private** (your choice).
4. **IMPORTANT:** Leave *"Add a README file"*, *"Add .gitignore"*, and *"Choose a license"* **UNCHECKED** (because we already created them here).
5. Click **"Create repository"**.

---

### Step 2: Push to GitHub

#### Option A: Using the Terminal (PowerShell / Command Prompt)
Open PowerShell, navigate to this folder, and run (replace `<YOUR-REPO-URL>` with your new GitHub repository URL):

```bash
cd "C:\Users\HARSH\Downloads\egotech"
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

*(When prompted by GitHub, sign in using your browser or personal access token).*

---

#### Option B: Using GitHub Desktop (Visual & Click-Only)
If you have **GitHub Desktop** installed:
1. Open GitHub Desktop.
2. Click **File → Add Local Repository...** (or press `Ctrl + O`).
3. Browse and select: `C:\Users\HARSH\Downloads\egotech`.
4. Click **Add Repository**.
5. Click the blue **"Publish repository"** button in the top bar.
6. Done!
