$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Output '1/3 Validando trava de versao e commit limpo...'
node tools/check-version-bump.mjs --require-clean
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output '2/3 Reiniciando servidor local em segundo plano...'
& "$root\start-silent.ps1" -Restart
Start-Sleep -Milliseconds 900

Write-Output '3/3 Verificando /api/status...'
$status = Invoke-RestMethod -Uri 'http://localhost:3333/api/status' -TimeoutSec 5
Write-Output ("Publicado com sucesso: BE v{0} | lastScanAt={1}" -f $status.backendVersion, $status.lastScanAt)
