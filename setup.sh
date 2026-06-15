#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
abort() { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }

OS="$(uname -s)"

# ── 1. Bun ────────────────────────────────────────────────────────────────────
if command -v bun &>/dev/null; then
  info "bun already installed ($(bun --version))"
else
  info "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# ── 2. mkcert ─────────────────────────────────────────────────────────────────
if command -v mkcert &>/dev/null; then
  info "mkcert already installed"
else
  if [[ "$OS" == "Darwin" ]]; then
    if ! command -v brew &>/dev/null; then
      abort "Homebrew not found. Install it from https://brew.sh then re-run this script."
    fi
    info "Installing mkcert via Homebrew..."
    brew install mkcert
  elif [[ "$OS" == "Linux" ]]; then
    info "Installing mkcert binary..."
    MKCERT_TAG=$(curl -fsSL "https://api.github.com/repos/FiloSottile/mkcert/releases/latest" \
      | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
    mkdir -p "$HOME/.local/bin"
    curl -fsSL "https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_TAG}/mkcert-${MKCERT_TAG}-linux-amd64" \
      -o "$HOME/.local/bin/mkcert"
    chmod +x "$HOME/.local/bin/mkcert"
    export PATH="$HOME/.local/bin:$PATH"
  else
    abort "Unsupported OS: $OS"
  fi
fi

# ── 3. Trust local CA (requires sudo) ────────────────────────────────────────
info "Trusting local CA — you may be prompted for your password..."
mkcert -install

# ── 4. Bootstrap .env.local ───────────────────────────────────────────────────
if [[ -f ".env.local" ]]; then
  info ".env.local already exists, skipping"
else
  cp .env.example .env.local
  info "Created .env.local from .env.example"
fi

# ── 5. Install dependencies ───────────────────────────────────────────────────
info "Installing dependencies..."
bun install

# ── 6. Next steps ─────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Next steps${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════${NC}"
echo ""
echo "  1. Fill in .env.local with real values:"
echo "       CONVEX_DEPLOYMENT, CONVEX_URL, CONVEX_SITE_URL"
echo "       APPLICATION_ID, DIRECTORY_ID, CLIENT_SECRET"
echo ""
echo "  2. Link the Convex backend (opens a browser to log in):"
echo "       bun run dev:setup"
echo ""
echo "  3. Start the dev server:"
echo "       bun run dev"
echo ""
