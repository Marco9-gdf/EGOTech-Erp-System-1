================================================================================
   EGOTECH ERP & PAYROLL PLATFORM - CLEAN CODEBASE FOR RENDER & GITHUB
================================================================================

Folder: C:\Users\HARSH\Downloads\EGOTCH erp ren

ALL BUGS RESOLVED & VERIFIED:
--------------------------------------------------------------------------------
1. White Screen Fixed:
   - Added GlobalErrorBoundary in React to prevent blank crashes.
   - Built offline fallback adapter in api.js for instant preview without 404s.
   - Fixed Netlify 404s with _redirects and netlify.toml rewrite rules (/* -> /index.html 200).
   - Pre-compiled client/dist included and ready.

2. Render Yarn Workspaces Error Fixed:
   - Added "private": true in package.json to prevent Render Yarn crash:
     "error Workspaces can only be enabled in private projects."
   - Added render.yaml with Node 22.12.0 and unified build command.

3. Master Credentials (Password: 826999):
   - Platform Owner: khiladiharsh786@gmail.com   Password: 826999
   - Egotech Admin:  admin@egotech.com           Password: 826999
   - HR Manager:     hr@company.com              Password: 826999
   - Employee:       john.doe@company.com        Password: 826999
   - One-Click Quick Login buttons on the login page are updated with 826999.
   - SQLite database (server/data/payroll.db) has been updated with 826999.

================================================================================
HOW TO UPLOAD TO A NEW GITHUB REPOSITORY:
================================================================================
Method 1 (Super Simple - Recommended):
  1. Go to https://github.com/new and create a new repository (e.g., egotech-erp-ren).
  2. Copy the repository URL (e.g., https://github.com/YOUR_USERNAME/egotech-erp-ren.git).
  3. Double-click "upload_to_new_github_repo.bat" in this folder.
  4. Paste your new GitHub repo URL and press ENTER.
  5. The script automatically clears old cached credentials, commits, and pushes cleanly!

Method 2 (Manual Git Commands):
  cd "C:\Users\HARSH\Downloads\EGOTCH erp ren"
  git init -b main
  git add .
  git commit -m "Initial commit: Egotech Cloud ERP & Payroll Platform"
  git remote add origin YOUR_NEW_REPO_URL
  git push -u origin main --force

================================================================================
HOW TO DEPLOY ON RENDER (Full-Stack Backend + Database + React):
================================================================================
1. Open https://dashboard.render.com
2. Click "New +" -> "Web Service".
3. Select your newly created GitHub repository.
4. Set the following:
   - Name: egotech-erp
   - Runtime: Node
   - Build Command: npm run build:render
   - Start Command: node server/src/index.js
   - Plan: Free
5. Click "Deploy Web Service"!
   In 2-3 minutes your live site is up and running with live database!

================================================================================
HOW TO DEPLOY ON NETLIFY (Instant Frontend Drag & Drop):
================================================================================
1. Open https://app.netlify.com/drop
2. Drag and drop the folder "netlify-drop-ready" from this directory into the browser.
3. Your site will be live instantly!
================================================================================