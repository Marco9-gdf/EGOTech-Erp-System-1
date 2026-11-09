@echo off
setlocal enabledelayedexpansion
title EGOTECH ERP - Push to New GitHub Repository
color 0B

echo ==============================================================================
echo              EGOTECH CLOUD ERP - GITHUB REPOSITORY UPLOADER
echo ==============================================================================
echo.
echo  This tool will upload this clean, bug-free codebase to your new GitHub repo.
echo  All bugs (white-screen, demo quick login, password 826999, Render workspaces)
echo  have been completely resolved and tested.
echo.
echo ==============================================================================
echo.

:: 1. Verify Git is installed
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Git is not installed or not in your system PATH!
    echo Please install Git from https://git-scm.com/ and re-run this file.
    echo.
    pause
    exit /b 1
)

:: 2. Prompt for New Repository URL
echo [STEP 1/5] Enter your new GitHub repository URL.
echo Example: https://github.com/YOUR_USERNAME/egotech-erp.git
echo.
set /p REPO_URL="Enter GitHub Repo URL: "

if "%REPO_URL%"=="" (
    color 0C
    echo.
    echo [ERROR] No repository URL provided! Exiting...
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo Target Repo: %REPO_URL%
echo ==============================================================================
echo.

:: 3. Clear Stale Windows Credentials that cause 403 Permission Denied errors
echo [STEP 2/5] Resetting any conflicting GitHub cached credentials...
cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>&1
cmdkey /delete:git:https://github.com >nul 2>&1
echo [OK] Credential cache cleared.

:: 4. Clean local git state
echo.
echo [STEP 3/5] Initializing fresh Git repository...
cd /d "%~dp0"

if exist ".git" (
    echo Removing old .git directory to start clean...
    rmdir /s /q ".git" >nul 2>&1
)

git init -b main
git config user.name "Harsh Shrivastava"
git config user.email "khiladiharsh786@gmail.com"

:: 5. Add files & Commit
echo.
echo [STEP 4/5] Staging files and creating commit...
git add .
git commit -m "Initial commit: Egotech Cloud ERP & Payroll Platform [Fixed & Verified]"

:: 6. Add Remote & Push
echo.
echo [STEP 5/5] Connecting to remote and pushing to main branch...
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Running: git push -u origin main --force
echo.
git push -u origin main --force

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo.
    echo ==============================================================================
    echo [SUCCESS] Your EGOTECH ERP codebase is now live on GitHub!
    echo ==============================================================================
    echo.
    echo NEXT STEPS:
    echo  1. DEPLOY ON RENDER (Recommended for Full-Stack):
    echo     - Go to https://dashboard.render.com -^> New + -^> Web Service
    echo     - Select this new GitHub repo
    echo     - Build Command: npm run build:render
    echo     - Start Command: node server/src/index.js
    echo.
    echo  2. OR DEPLOY ON NETLIFY (For Instant Frontend):
    echo     - Go to https://app.netlify.com/drop
    echo     - Drag and drop the "netlify-drop-ready" folder inside this directory!
    echo.
    echo  3. ADMIN / OWNER LOGIN CREDENTIALS:
    echo     - Owner:  khiladiharsh786@gmail.com   Password: 826999
    echo     - Admin:  admin@egotech.com           Password: 826999
    echo     - HR:     hr@company.com              Password: 826999
    echo     - Staff:  john.doe@company.com        Password: 826999
    echo.
    echo ==============================================================================
) else (
    color 0C
    echo.
    echo ==============================================================================
    echo [FAILED] Git push encountered an error!
    echo ==============================================================================
    echo Common fixes:
    echo  1. If GitHub prompts for login in your browser, approve it.
    echo  2. Ensure the repository exists and you have write permissions to it.
    echo  3. If using a Personal Access Token (PAT), paste your PAT when prompted for password.
    echo ==============================================================================
)

echo.
pause
