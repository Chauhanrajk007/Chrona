@echo off
cd /d "%~dp0"
echo ==============================================
echo Fixing Git Submodule and Pushing to GitHub
echo ==============================================
echo.

echo 1. Removing stuck frontend submodule from cache...
git rm -r --cached frontend

echo.
echo 2. Adding the new Royal Peach UI files...
git add .

echo.
echo 3. Committing changes...
git commit -m "fix: removed frontend submodule and tracked new Royal Peach UI files"

echo.
echo 4. Pushing to GitHub (This will trigger Vercel!)...
git push origin main

echo.
echo ==============================================
echo DONE! Check your GitHub repo and Vercel dashboard.
echo ==============================================
pause
