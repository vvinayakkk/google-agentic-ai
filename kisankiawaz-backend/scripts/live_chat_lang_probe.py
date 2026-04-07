from __future__ import annotations

import json
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def request(method: str, path: str, payload: dict | None = None, token: str | None = None, timeout: int = 90):
    url = f"{BASE}{path}"
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(body) if body else {}
            return int(resp.status), parsed
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
        except Exception:
            parsed = {"raw": body}
        return int(exc.code), parsed
    except Exception as exc:  # noqa: BLE001
        return 599, {"error": "network_or_timeout", "detail": str(exc)}


def login() -> str:
    for phone, password in [("+919800000001", "Farmer@123"), ("+919876543211", "Test@1234")]:
        code, data = request("POST", "/api/v1/auth/login", {"phone": phone, "password": password}, timeout=20)
        if code == 200 and isinstance(data, dict) and data.get("access_token"):
            return str(data["access_token"])
    raise RuntimeError("login failed")


def snippet(text: str, n: int = 220) -> str:
    t = (text or "").replace("\r", " ").replace("\n", " ")
    return t[:n]


def main() -> None:
    print("[probe] login", flush=True)
    token = login()

    cases = [
        {
            "id": "generic_en",
            "payload": {
                "message": "Hi, what can you do for me as a farmer?",
                "language": "en",
                "agent_type": "general",
                "response_mode": "brief",
            },
        },
        {
            "id": "outscope_en",
            "payload": {
                "message": "Explain E=mc2 in detail",
                "language": "en",
                "agent_type": "general",
                "response_mode": "brief",
            },
        },
        {
            "id": "weather_kn",
            "payload": {
                "message": "ಇವತ್ತಿನ ಹವಾಮಾನ ಮಾಹಿತಿ ಹೇಳಿ",
                "language": "kn",
                "agent_type": "weather",
                "response_mode": "brief",
            },
        },
        {
            "id": "generic_es",
            "payload": {
                "message": "Hola, que puedes hacer para agricultores?",
                "language": "es",
                "agent_type": "general",
                "response_mode": "brief",
            },
        },
        {
            "id": "outscope_es",
            "payload": {
                "message": "Explica E=mc2 en detalle",
                "language": "es",
                "agent_type": "general",
                "response_mode": "brief",
            },
        },
        {
            "id": "market_en",
            "payload": {
                "message": "Tomato market price in Pune today",
                "language": "en",
                "agent_type": "market",
                "response_mode": "brief",
            },
        },
    ]

    for case in cases:
        print(f"[probe] chat case={case['id']}", flush=True)
        code, data = request("POST", "/api/v1/agent/chat", case["payload"], token=token, timeout=120)
        if code != 200:
            print(f"CHAT id={case['id']} status={code} body={data}")
            continue
        assert isinstance(data, dict)
        print(
            "CHAT "
            f"id={case['id']} "
            f"language={data.get('language')} "
            f"agent_used={data.get('agent_used')} "
            f"ui_redirect_tag={data.get('ui_redirect_tag')}"
        )
        print(f"SNIP={snippet(str(data.get('response') or ''))}")

    staged = [
        {
            "id": "staged_weather",
            "payload": {
                "message": "Weather update and rain risk for my area",
                "language": "en",
                "agent_type": "weather",
                "response_mode": "brief",
            },
        },
        {
            "id": "staged_market",
            "payload": {
                "message": "Today mandi price and where to sell tomato",
                "language": "en",
                "agent_type": "market",
                "response_mode": "brief",
            },
        },
    ]

    for case in staged:
        print(f"[probe] staged case={case['id']} prepare", flush=True)
        code, prep = request("POST", "/api/v1/agent/chat/prepare", case["payload"], token=token, timeout=60)
        if code != 200 or not isinstance(prep, dict):
            print(f"STAGED id={case['id']} prepare_status={code} body={prep}")
            continue
        rid = str(prep.get("request_id") or "")
        status = "pending"
        final = {}
        for _ in range(12):
            print(f"[probe] staged case={case['id']} finalize poll", flush=True)
            fcode, fdata = request(
                "POST",
                "/api/v1/agent/chat/finalize",
                {"request_id": rid, "timeout_seconds": 2},
                token=token,
                timeout=60,
            )
            if fcode != 200 or not isinstance(fdata, dict):
                status = f"finalize_error_{fcode}"
                final = fdata if isinstance(fdata, dict) else {}
                break
            final = fdata
            status = str(fdata.get("status") or "pending")
            if status in {"completed", "failed"}:
                break
        result = final.get("result") if isinstance(final, dict) else None
        tag = ""
        if isinstance(result, dict):
            tag = str(result.get("ui_redirect_tag") or "")
        print(f"STAGED id={case['id']} status={status} tag={tag}")


if __name__ == "__main__":
    main()
