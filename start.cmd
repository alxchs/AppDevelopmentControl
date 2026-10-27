@echo off
title AppDevelopmentControl - Executive LAN Dashboard
cd /d "%~dp0"
echo =======================================================
echo   Iniciando AppDevelopmentControl (Executive Dashboard)
echo =======================================================
node src/server.js
pause

