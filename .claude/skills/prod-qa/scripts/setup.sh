#!/usr/bin/env bash
# One-time setup inside a Vercel Sandbox (node22 image). Installs headless
# Chromium + Playwright and the shared libraries/fonts Chromium needs there.
set -euo pipefail
mkdir -p /vercel/qa && cd /vercel/qa
[ -f package.json ] || npm init -y >/dev/null
npm i --no-audit --no-fund playwright-core@1.55.0 @sparticuz/chromium@138 >/dev/null 2>&1
node -e "import('@sparticuz/chromium').then(async m=>{await m.default.executablePath();const z=require('zlib'),fs=require('fs');fs.writeFileSync('/tmp/al.tar',z.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));})"
mkdir -p /tmp/al2023 && tar xf /tmp/al.tar -C /tmp/al2023
cat > env.sh <<'ENV'
export LD_LIBRARY_PATH=/tmp/al2023/lib
export FONTCONFIG_PATH=/tmp/fonts
export FONTCONFIG_FILE=/tmp/fonts/fonts.conf
ENV
echo "setup ok — now: cd /vercel/qa && . ./env.sh && node ui_crawl.mjs"
