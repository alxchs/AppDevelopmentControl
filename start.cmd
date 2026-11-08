@echo off
rem Uso manual pelo Alexandre. IA NUNCA usa este script: abre console e deixa o foco instavel. IA usa start-silent.ps1.
title AppDevelopmentControl - Executive LAN Dashboard
cd /d "%~dp0"
echo =======================================================
echo   Iniciando AppDevelopmentControl (Executive Dashboard)
echo   Abra http://localhost:3333 no navegador.
echo =======================================================
node src/server.js
pause
