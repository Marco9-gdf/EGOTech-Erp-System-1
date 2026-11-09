@echo off
title Push Egotech to GitHub
cls
echo ========================================================
echo        Upload Egotech to your GitHub Account
echo ========================================================
echo.
echo Make sure you have created an empty repository on GitHub:
echo https://github.com/new
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/egotech.git): "
if "%REPO_URL%"=="" (
    echo No URL entered. Exiting.
    pause
    exit /b
)

echo.
echo Linking repository to %REPO_URL%...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Pushing code to GitHub (branch: main)...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! Your Egotech platform is live on GitHub!
    echo ========================================================
) else (
    echo.
    echo PUSH FAILED: Please check your GitHub URL or login credentials.
)
echo.
pause
