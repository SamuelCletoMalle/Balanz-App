# Nexo Pay · control de gastos personales
# Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
#
# Activa la conexión con bancos en TU Supabase: guarda los secretos de Enable Banking, publica la función `banco` y te
# deja el SQL listo para pegar. La clave privada se lee del archivo .pem en tu ordenador y viaja directa a Supabase:
# no se escribe en pantalla ni se guarda en ningún archivo del proyecto.
#
# Uso (desde la carpeta del proyecto):  powershell -ExecutionPolicy Bypass -File scripts\activar-bancos.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

# 1) Referencia del proyecto de Supabase (sale de la dirección del .env; no es secreta).
$env_ = Get-Content .env -Raw
if ($env_ -notmatch 'https://([a-z0-9]+)\.supabase\.co') { throw 'No encuentro EXPO_PUBLIC_SUPABASE_URL en .env' }
$ref = $Matches[1]
Write-Host "Proyecto de Supabase: $ref"

# 2) Datos de Enable Banking.
$appId = (Read-Host 'Application ID de Enable Banking (el UUID)').Trim()
if ($appId -notmatch '^[0-9a-fA-F-]{36}$') { throw 'Ese Application ID no parece un UUID.' }
$ruta = (Read-Host 'Ruta del archivo .pem de la clave privada (puedes arrastrarlo aquí)').Trim('"', ' ')
if (-not (Test-Path $ruta)) { throw "No encuentro el archivo: $ruta" }
$pem = Get-Content $ruta -Raw
if ($pem -notmatch 'PRIVATE KEY') { throw 'Ese archivo no parece una clave privada (.pem).' }
$pemUnaLinea = ($pem.Trim() -replace "`r?`n", '\n')

# 3) Entrar en Supabase (se abre el navegador una vez).
Write-Host "`nInicia sesión en Supabase cuando se abra el navegador..."
npx supabase login
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar sesión en Supabase.' }

# 4) Secretos y función.
npx supabase secrets set "EB_APP_ID=$appId" "EB_PRIVATE_KEY=$pemUnaLinea" --project-ref $ref
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron guardar los secretos.' }
npx supabase functions deploy banco --project-ref $ref --use-api
if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar la función banco.' }

# 5) El SQL se pega en el editor de Supabase (una sola vez): lo dejo en el portapapeles y abro la página.
Get-Content supabase\bancos.sql -Raw | Set-Clipboard
Start-Process "https://supabase.com/dashboard/project/$ref/sql/new"
Write-Host "`nListo. Falta un paso: en la página que se ha abierto, pega (Ctrl+V) y pulsa Run. El SQL ya está copiado."
Write-Host 'Después, en la app: Más > Bancos > Conectar un banco.'
