#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"

info() { printf "[stop] %s\n" "$*"; }
warn() { printf "[stop][warn] %s\n" "$*"; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

choose_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

stop_pid_process() {
  local label="$1" pid_file="$2"
  if [ ! -f "$pid_file" ]; then
    warn "$label not running (no pid file)."
    return
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [ -z "$pid" ]; then
    warn "$label pid file empty; removing."
    rm -f "$pid_file"
    return
  fi
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping $label (pid $pid)..."
    kill "$pid" 2>/dev/null || warn "Failed to send SIGTERM to $label."
  else
    warn "$label pid $pid not running."
  fi
  rm -f "$pid_file"
}

stop_backend() {
  if ! command_exists docker; then
    warn "Docker not installed; skipping backend stop."
    return
  fi
  local compose_cmd
  compose_cmd="$(choose_compose)"
  if [ -z "$compose_cmd" ]; then
    warn "Docker Compose not found; skipping backend stop."
    return
  fi
  info "Stopping Docker stack..."
  (cd "$ROOT" && $compose_cmd down) || warn "Compose down reported an error."
}

main() {
  info "Workspace: $ROOT"
  mkdir -p "$LOG_DIR"

  stop_backend
  stop_pid_process "Admin dashboard" "$LOG_DIR/admin-dashboard.pid"
  stop_pid_process "Tunnel" "$LOG_DIR/tunnel.pid"
  stop_pid_process "Farmer app" "$LOG_DIR/farmer-app.pid"
  rm -f "$LOG_DIR/tunnel-url.txt"

  info "Stop complete. Logs remain in $LOG_DIR."
}

main "$@"
