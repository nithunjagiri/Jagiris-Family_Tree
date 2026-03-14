#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

trap 'echo "Stopping backend..."; kill $BACKEND_PID 2>/dev/null; exit' INT TERM

echo "Starting backend..."
(cd backend && npm start) &
BACKEND_PID=$!

sleep 2
echo "Starting frontend..."
(cd frontend && npm run dev)

kill $BACKEND_PID 2>/dev/null
