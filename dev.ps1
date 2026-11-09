# Starts the Expo dev server with the portable Node 22 (Expo SDK 58 needs Node >= 22.13).
# Usage: .\dev.ps1            -> expo start (scan QR with Expo Go)
#        .\dev.ps1 web        -> expo start --web
#        .\dev.ps1 test       -> jest
$node = Join-Path $PSScriptRoot '..\tools\node-v22.14.0-win-x64'
if (-not (Test-Path (Join-Path $node 'node.exe'))) { Write-Error "Portable Node 22 not found at $node"; exit 1 }
$env:Path = (Resolve-Path $node).Path + ';' + $env:Path
Set-Location $PSScriptRoot
switch ($args[0]) {
  'web'  { npx expo start --web }
  'test' { npx jest }
  'lint' { npx expo lint }
  default { npx expo start }
}
