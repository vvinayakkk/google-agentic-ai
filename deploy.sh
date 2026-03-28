#!/usr/bin/env bash
set -euo pipefail

# One-shot launcher for backend (Docker), admin dashboard (Vite), and Flutter app.
# Installs project dependencies when missing and writes background logs under .logs/.

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

info() { printf "[deploy] %s\n" "$*"; }
fail() { printf "[deploy][error] %s\n" "$*" >&2; exit 1; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

choose_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    echo "docker-compose"
  else
    fail "Docker Compose is required. Install Docker Desktop or docker-compose."
  fi
}

ensure_env_file() {
  local src="$1" dest="$2"
  if [ ! -f "$dest" ] && [ -f "$src" ]; then
    cp "$src" "$dest"
    info "Created $(basename "$dest") from template."
  fi
}

ensure_base_image() {
  local image_name="kisan-base:latest"
  if ! docker image inspect "$image_name" >/dev/null 2>&1; then
    info "Building base image ($image_name)..."
    docker build -f "$ROOT/Dockerfile.base" -t "$image_name" "$ROOT"
  fi
}

start_backend() {
  local compose_cmd="$1"
  ensure_env_file "$ROOT/kisankiawaz-backend/.env.example" "$ROOT/kisankiawaz-backend/.env"
  ensure_base_image
  info "Starting Docker stack (nginx + 12 services + infra)..."
  (cd "$ROOT" && $compose_cmd up -d --build)
}

start_admin_dashboard() {
  if ! command_exists npm; then fail "npm is required for admin dashboard."; fi
  local host="${ADMIN_HOST:-0.0.0.0}" port="${ADMIN_PORT:-5173}"
  ensure_env_file "$ROOT/admin-dashboard/.env.example" "$ROOT/admin-dashboard/.env.local"
  if [ ! -d "$ROOT/admin-dashboard/node_modules" ]; then
    info "Installing admin dashboard dependencies..."
    (cd "$ROOT/admin-dashboard" && npm install)
  fi
  local pid_file="$LOG_DIR/admin-dashboard.pid"
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    info "Admin dashboard already running (pid $(cat "$pid_file")). Skipping start."
  else
    info "Starting admin dashboard on ${host}:${port}..."
    (cd "$ROOT/admin-dashboard" && nohup npm run dev -- --host "$host" --port "$port" > "$LOG_DIR/admin-dashboard.log" 2>&1 & echo $! > "$pid_file")
  fi
}

start_flutter_app() {
  if ! command_exists flutter; then
    info "Flutter SDK not found; skipping farmer app launch. Install Flutter to enable."
    return
  fi
  local host="${FLUTTER_HOST:-0.0.0.0}" port="${FLUTTER_PORT:-5175}" device="${FLUTTER_DEVICE_ID:-}"
  info "Ensuring Flutter dependencies..."
  (cd "$ROOT/farmer_app" && flutter pub get)
  if [ -z "$device" ]; then
    if flutter devices | grep -qi "chrome"; then
      device="chrome"
    elif flutter devices | grep -qi "web-server"; then
      device="web-server"
    fi
  fi
  if [ -z "$device" ]; then
    info "No Flutter web-capable device found; skipping farmer app launch. Set FLUTTER_DEVICE_ID to override."
    return
  fi
  local pid_file="$LOG_DIR/farmer-app.pid"
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    info "Farmer app already running (pid $(cat "$pid_file")). Skipping start."
    return
  fi
  info "Starting farmer app on device ${device} (host ${host}, port ${port})..."
  if [ "$device" = "chrome" ] || [ "$device" = "web-server" ]; then
    (cd "$ROOT/farmer_app" && nohup flutter run -d "$device" --web-hostname "$host" --web-port "$port" --web-renderer html > "$LOG_DIR/farmer-app.log" 2>&1 & echo $! > "$pid_file")
  else
    (cd "$ROOT/farmer_app" && nohup flutter run -d "$device" > "$LOG_DIR/farmer-app.log" 2>&1 & echo $! > "$pid_file")
  fi
}

main() {
  info "Workspace: $ROOT"
  command_exists docker || fail "Docker is required. Install Docker Desktop."
  local compose_cmd
  compose_cmd="$(choose_compose)"

  start_backend "$compose_cmd"
  start_admin_dashboard
  start_flutter_app

  info "Backend gateway: http://localhost:8000"
  info "Admin dashboard: http://localhost:${ADMIN_PORT:-5173} (logs: $LOG_DIR/admin-dashboard.log)"
  info "Farmer app: http://localhost:${FLUTTER_PORT:-5175} (logs: $LOG_DIR/farmer-app.log)"
  info "To stop: $compose_cmd down, kill \$(cat $LOG_DIR/admin-dashboard.pid), kill \$(cat $LOG_DIR/farmer-app.pid)"
}

main "$@"
