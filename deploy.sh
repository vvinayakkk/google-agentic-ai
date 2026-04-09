#!/usr/bin/env bash
set -euo pipefail

# One-shot launcher for backend (Docker), admin dashboard (Vite), Flutter app,
# and an optional public tunnel for Twilio/local webhooks.

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

info() { printf "[deploy] %s\n" "$*"; }
warn() { printf "[deploy][warn] %s\n" "$*"; }
fail() { printf "[deploy][error] %s\n" "$*" >&2; exit 1; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

is_port_listening() {
  local port="$1"
  if command_exists lsof; then
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
    return $?
  fi
  if command_exists ss; then
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${port}$"
    return $?
  fi
  if command_exists netstat; then
    netstat -an 2>/dev/null | grep -E "[\.:]${port}[[:space:]].*LISTEN" >/dev/null
    return $?
  fi
  return 1
}

TUNNEL_URL=""

load_backend_env() {
  local env_file="$ROOT/kisankiawaz-backend/.env"
  if [ -f "$env_file" ]; then
    # shellcheck disable=SC1090
    set -a; . "$env_file"; set +a
    info "Loaded backend environment from kisankiawaz-backend/.env"
  fi
}

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

  local all_services=() running_services=() missing_services=() stopped_services=()
  local svc container_id

  mapfile -t all_services < <(cd "$ROOT" && $compose_cmd config --services)
  mapfile -t running_services < <(cd "$ROOT" && $compose_cmd ps --services --status running 2>/dev/null || true)

  for svc in "${all_services[@]}"; do
    if printf '%s\n' "${running_services[@]}" | grep -Fxq "$svc"; then
      continue
    fi

    container_id="$(cd "$ROOT" && $compose_cmd ps -aq "$svc" 2>/dev/null | head -n 1 || true)"
    if [ -n "$container_id" ]; then
      stopped_services+=("$svc")
    else
      missing_services+=("$svc")
    fi
  done

  if [ "${#missing_services[@]}" -eq 0 ] && [ "${#stopped_services[@]}" -eq 0 ]; then
    info "Docker stack already running. Skipping backend recreate/rebuild."
    return
  fi

  if [ "${#missing_services[@]}" -gt 0 ]; then
    info "Creating missing backend services (no forced rebuild): ${missing_services[*]}"
    (cd "$ROOT" && $compose_cmd up -d "${missing_services[@]}")
  fi

  if [ "${#stopped_services[@]}" -gt 0 ]; then
    info "Starting existing stopped backend services: ${stopped_services[*]}"
    (cd "$ROOT" && $compose_cmd start "${stopped_services[@]}")
  fi
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
  elif is_port_listening "$port"; then
    info "Admin dashboard appears to be running on port ${port}. Skipping start."
  else
    info "Starting admin dashboard on ${host}:${port}..."
    (cd "$ROOT/admin-dashboard" && nohup npm run dev -- --host "$host" --port "$port" > "$LOG_DIR/admin-dashboard.log" 2>&1 & echo $! > "$pid_file")
  fi
}

wait_for_tunnel_url() {
  local log_file="$1" domain_pattern="$2" timeout_s="${3:-25}"
  local i=0
  while [ "$i" -lt "$timeout_s" ]; do
    if [ -f "$log_file" ]; then
      local detected
      detected="$(grep -Eo "https://[a-zA-Z0-9.-]+${domain_pattern}" "$log_file" | head -n 1 || true)"
      if [ -n "$detected" ]; then
        printf "%s" "$detected"
        return 0
      fi
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

start_tunnel() {
  local enabled="${ENABLE_TUNNEL:-1}"
  if [ "$enabled" = "0" ] || [ "$enabled" = "false" ] || [ "$enabled" = "False" ]; then
    info "Tunnel disabled (ENABLE_TUNNEL=${enabled})."
    return
  fi

  local provider="${TUNNEL_PROVIDER:-auto}"
  local port="${TUNNEL_PORT:-8000}"
  local pid_file="$LOG_DIR/tunnel.pid"
  local log_file="$LOG_DIR/tunnel.log"
  local url_file="$LOG_DIR/tunnel-url.txt"

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    info "Tunnel already running (pid $(cat "$pid_file"))."
    if [ -f "$url_file" ]; then
      TUNNEL_URL="$(cat "$url_file")"
    fi
    return
  fi

  rm -f "$pid_file" "$url_file" "$log_file"

  if [ "$provider" = "auto" ]; then
    if command_exists ngrok && [ -n "${NGROK_AUTHTOKEN:-}" ]; then
      provider="ngrok"
    else
      provider="localtunnel"
    fi
  fi

  if [ "$provider" = "ngrok" ]; then
    if ! command_exists ngrok; then
      warn "ngrok not found; falling back to localtunnel."
      provider="localtunnel"
    elif [ -z "${NGROK_AUTHTOKEN:-}" ]; then
      warn "NGROK_AUTHTOKEN missing; falling back to localtunnel."
      provider="localtunnel"
    else
      local cfg="$LOG_DIR/ngrok.yml"
      {
        echo "version: '2'"
        echo "authtoken: ${NGROK_AUTHTOKEN}"
      } > "$cfg"
      info "Starting ngrok tunnel on port ${port}..."
      nohup ngrok http "$port" --config "$cfg" --log stdout > "$log_file" 2>&1 & echo $! > "$pid_file"
      if TUNNEL_URL="$(wait_for_tunnel_url "$log_file" 'ngrok\.[a-z]+' 25)"; then
        printf "%s" "$TUNNEL_URL" > "$url_file"
      else
        warn "ngrok did not produce a public URL; stopping tunnel process."
        kill "$(cat "$pid_file")" 2>/dev/null || true
        rm -f "$pid_file"
        provider="localtunnel"
      fi
    fi
  fi

  if [ "$provider" = "localtunnel" ]; then
    if ! command_exists npx; then
      warn "npx not found; tunnel will not start."
      return
    fi
    info "Starting localtunnel on port ${port}..."
    nohup npx -y localtunnel --port "$port" > "$log_file" 2>&1 & echo $! > "$pid_file"
    if TUNNEL_URL="$(wait_for_tunnel_url "$log_file" '\.loca\.lt' 25)"; then
      printf "%s" "$TUNNEL_URL" > "$url_file"
    else
      warn "localtunnel did not return a URL in time. Check $log_file"
      TUNNEL_URL=""
    fi
  fi

  if [ -n "$TUNNEL_URL" ]; then
    local webhook_path="${TWILIO_WEBHOOK_PATH:-/api/v1/notifications/whatsapp/twilio/webhook}"
    info "Public tunnel URL: ${TUNNEL_URL}"
    info "Twilio webhook URL: ${TUNNEL_URL}${webhook_path}"
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
  load_backend_env
  command_exists docker || fail "Docker is required. Install Docker Desktop."
  local compose_cmd
  compose_cmd="$(choose_compose)"

  start_backend "$compose_cmd"
  start_admin_dashboard
  start_tunnel
  start_flutter_app

  info "Backend gateway: http://localhost:8000"
  info "Admin dashboard: http://localhost:${ADMIN_PORT:-5173} (logs: $LOG_DIR/admin-dashboard.log)"
  if [ -n "$TUNNEL_URL" ]; then
    info "Tunnel URL: $TUNNEL_URL (logs: $LOG_DIR/tunnel.log)"
  fi
  info "Farmer app: http://localhost:${FLUTTER_PORT:-5175} (logs: $LOG_DIR/farmer-app.log)"
  info "To stop everything: ./stop.sh"
}

main "$@"
