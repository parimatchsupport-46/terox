#!/usr/bin/env bash
# One-command preview for the Chatter demo.
# The agent sandbox does not keep background processes between turns, so if the
# live preview panel ever goes blank, run this again (or just open the URL).
set -e
PORT="${PORT:-5173}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/"; then
  echo "already serving on :${PORT} -> http://localhost:${PORT}"
  exit 0
fi

echo "serving ${DIR} on http://localhost:${PORT}  (Ctrl+C to stop)"
exec python3 -m http.server "${PORT}" --bind 0.0.0.0 --directory "${DIR}"
