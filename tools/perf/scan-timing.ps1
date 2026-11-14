# Cronometra a varredura completa (SPEC-0007 NFR-002 / SPEC-0008 AC-25): roda `node src/cli-scan.js` N vezes,
# sem janela, e imprime os tempos reportados pelo proprio scan e a mediana. Escreve so no banco do repositorio.
param([int]$Runs = 3, [string]$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)
$times = @()
Push-Location $Repo
try {
  for ($i = 1; $i -le $Runs; $i++) {
    $out = & node src/cli-scan.js 2>&1 | Out-String
    if ($out -match 'conclu[^\d]*?(\d+)ms') { $times += [int]$Matches[1]; Write-Output "run $i : $($Matches[1]) ms" }
    else { Write-Output "run $i : tempo nao encontrado na saida" }
  }
} finally { Pop-Location }
if ($times.Count -gt 0) {
  $s = $times | Sort-Object
  $m = if ($s.Count % 2) { $s[[int][math]::Floor($s.Count / 2)] } else { ($s[$s.Count / 2 - 1] + $s[$s.Count / 2]) / 2 }
  Write-Output "mediana: $m ms ($($s -join ', '))"
}
