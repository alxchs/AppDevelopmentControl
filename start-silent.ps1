param([switch]$Restart)
# Sobe o servidor da dashboard em segundo plano, SEM janela e SEM abrir navegador.
# Uso por qualquer IA: nunca rodar `node src/server.js` em terminal da IDE nem usar start.cmd.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $env:TEMP "claude\appdevcontrol-server"
New-Item -ItemType Directory -Force $logDir | Out-Null

$conn = Get-NetTCPConnection -LocalPort 3333 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  if ($Restart) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
  } else {
    Write-Output "Servidor ja esta no ar em http://localhost:3333 (PID $($conn.OwningProcess))."
    exit 0
  }
}

$p = Start-Process -FilePath node -ArgumentList 'src/server.js' -WorkingDirectory $root `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $logDir 'out.log') -RedirectStandardError (Join-Path $logDir 'err.log')
Write-Output "Servidor iniciado em segundo plano (PID $($p.Id)): http://localhost:3333 | logs em $logDir"
