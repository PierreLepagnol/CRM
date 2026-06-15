#Requires -Version 7
$ErrorActionPreference = "Stop"

function Info  { param($msg) Write-Host "[setup] $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "[setup] $msg" -ForegroundColor Yellow }
function Abort { param($msg) Write-Host "[setup] $msg" -ForegroundColor Red; exit 1 }

function Refresh-Path {
  $env:PATH = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ── 1. Bun ────────────────────────────────────────────────────────────────────
if (Get-Command bun -ErrorAction SilentlyContinue) {
  Info "bun already installed ($(bun --version))"
} else {
  Info "Installing bun..."
  powershell -c "irm bun.sh/install.ps1 | iex"
  Refresh-Path
}

# ── 2. mkcert ─────────────────────────────────────────────────────────────────
if (Get-Command mkcert -ErrorAction SilentlyContinue) {
  Info "mkcert already installed"
} else {
  Info "Installing mkcert via winget..."
  winget install FiloSottile.mkcert --accept-source-agreements --accept-package-agreements
  Refresh-Path
}

# ── 3. Trust local CA (requires UAC) ─────────────────────────────────────────
Info "Trusting local CA — you may be prompted for UAC elevation..."
mkcert -install

# ── 4. Bootstrap .env.local ───────────────────────────────────────────────────
if (Test-Path ".env.local") {
  Info ".env.local already exists, skipping"
} else {
  Copy-Item ".env.example" ".env.local"
  Info "Created .env.local from .env.example"
}

# ── 5. Install dependencies ───────────────────────────────────────────────────
Info "Installing dependencies..."
bun install

# ── 6. Next steps ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  Next steps" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Fill in .env.local with real values:"
Write-Host "       CONVEX_DEPLOYMENT, CONVEX_URL, CONVEX_SITE_URL"
Write-Host "       APPLICATION_ID, DIRECTORY_ID, CLIENT_SECRET"
Write-Host ""
Write-Host "  2. Link the Convex backend (opens a browser to log in):"
Write-Host "       bun run dev:setup"
Write-Host ""
Write-Host "  3. Start the dev server:"
Write-Host "       bun run dev"
Write-Host ""
