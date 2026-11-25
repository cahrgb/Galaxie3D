#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${1:-8000}"
URL="http://localhost:${PORT}/portail_3d_page_d_accueil_interactive.html"

echo "Starting local server at ${URL}"
echo "Press Ctrl+C to stop."

# Open the browser shortly after the server starts
(
  sleep 1
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v gio >/dev/null 2>&1; then
    gio open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 || true
  fi
) &

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
elif command -v php >/dev/null 2>&1; then
  exec php -S "localhost:${PORT}"
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -l "$PORT" .
elif command -v nix-shell >/dev/null 2>&1; then
  exec nix-shell -p python3 --run "python3 -m http.server ${PORT}"
elif command -v nix >/dev/null 2>&1; then
  exec nix --extra-experimental-features "nix-command flakes" run nixpkgs#python3 -- -m http.server "$PORT"
else
  echo "Error: No HTTP server found (install python3, php, Node.js, or Nix)." >&2
  exit 1
fi
