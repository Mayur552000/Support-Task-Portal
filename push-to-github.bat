@echo off
title Push CASCO IT Support Portal to GitHub
echo ===================================================
echo   Pushing CASCO IT Support Portal to GitHub...
echo   Repository: https://github.com/Mayur552000/Support-Task-Portal.git
echo ===================================================
echo.

set GIT_PATH=%~dp0..\mingit\cmd\git.exe
if not exist "%GIT_PATH%" set GIT_PATH=git

"%GIT_PATH%" push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Application code successfully pushed to GitHub!
) else (
    echo [NOTICE] If prompted for credentials, use your GitHub username and Personal Access Token (PAT).
)
pause
