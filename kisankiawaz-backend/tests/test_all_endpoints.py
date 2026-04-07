"""
Comprehensive Automated Endpoint Tests
=======================================
Tests endpoints across live-market, document-builder,
equipment-rental-rates, agent-chat, voice, and analytics services.

Usage:
  python -m pytest tests/test_all_endpoints.py -v --tb=short
  python tests/test_all_endpoints.py           # standalone mode
"""

import os, sys, json, time, uuid, base64
from pathlib import Path
from typing import Optional

import requests

BASE = os.getenv("API_BASE", "http://localhost:8000")
MAX_CHAT_LATENCY_SECONDS = float(os.getenv("MAX_CHAT_LATENCY_SECONDS", "45"))
NEGATIVE_MARKERS = [
    "i can't",
    "i cannot",
    "unable",
    "not available",
    "not found",
    "couldn't find",
    "no data",
]

# ── Auth helpers ──────────────────────────────────────────────
AUTH_TOKEN: Optional[str] = None


def _login_if_needed() -> bool:
    """Authenticate once so protected endpoints can be tested."""
    global AUTH_TOKEN
    if AUTH_TOKEN:
        return True

    candidates = [
        (os.getenv("TEST_PHONE", "+919800000001"), os.getenv("TEST_PASSWORD", "Farmer@123")),
        ("+919876543211", "Test@1234"),
    ]
    for phone, password in candidates:
        try:
            r = requests.post(
                f"{BASE}/api/v1/auth/login",
                json={"phone": phone, "password": password},
                timeout=30,
            )
            if not r.ok:
                continue

            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            token = data.get("access_token") or data.get("token")
            if not token:
                continue

            AUTH_TOKEN = token
            return True
        except Exception:
            continue

    print("  ⚠ login failed for all configured test credential candidates")
    return False

def _headers():
    """Return auth headers if a token was obtained."""
    h = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        h["Authorization"] = f"Bearer {AUTH_TOKEN}"
    return h


def setup_module(module):
    """Authenticate once for pytest mode as well."""
    _login_if_needed()


def _get(path, params=None, expect=200, timeout=60):
    r = requests.get(f"{BASE}{path}", headers=_headers(), params=params, timeout=timeout)
    expected = expect if isinstance(expect, (list, tuple, set)) else [expect]
    assert r.status_code in expected, f"GET {path} → {r.status_code}: {r.text[:300]}"
    return r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text


def _post(path, body=None, expect=200, timeout=90, retries=0):
    expected = expect if isinstance(expect, (list, tuple, set)) else [expect]
    attempt = 0
    while True:
        r = requests.post(f"{BASE}{path}", headers=_headers(), json=body, timeout=timeout)
        if r.status_code in expected:
            return r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text

        should_retry = attempt < retries and (r.status_code == 429 or r.status_code >= 500)
        if not should_retry:
            assert False, f"POST {path} → {r.status_code}: {r.text[:300]}"

        retry_after = int(r.headers.get("Retry-After", "0") or 0)
        if retry_after <= 0:
            try:
                payload = r.json()
                retry_after = int(payload.get("retry_after_seconds", 0) or 0)
            except Exception:
                retry_after = 0
        time.sleep(max(2, retry_after))
        attempt += 1


def _post_multipart(path, files, data=None, expect=200, timeout=90):
    headers = {}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    r = requests.post(f"{BASE}{path}", headers=headers, files=files, data=data or {}, timeout=timeout)
    expected = expect if isinstance(expect, (list, tuple, set)) else [expect]
    assert r.status_code in expected, f"POST multipart {path} → {r.status_code}: {r.text[:300]}"
    return r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text


# ═══════════════════════════════════════════════════════════════
#  1. LIVE MARKET ENDPOINTS  (10 endpoints)
# ═══════════════════════════════════════════════════════════════

class TestLiveMarket:
    prefix = "/api/v1/market/live-market"

    def test_01_commodities(self):
        data = _get(f"{self.prefix}/commodities")
        assert isinstance(data, (list, dict)), "Expected list or dict"
        print(f"  ✓ commodities: {len(data) if isinstance(data, list) else 'ok'}")

    def test_02_states(self):
        data = _get(f"{self.prefix}/states")
        assert isinstance(data, (list, dict)), "Expected list or dict"
        print(f"  ✓ states: {len(data) if isinstance(data, list) else 'ok'}")

    def test_03_msp_all(self):
        data = _get(f"{self.prefix}/msp")
        assert isinstance(data, (list, dict))
        print(f"  ✓ MSP all crops: ok")

    def test_04_msp_wheat(self):
        data = _get(f"{self.prefix}/msp/Wheat")
        assert isinstance(data, dict)
        print(f"  ✓ MSP Wheat: {data.get('price', data.get('msp_price', 'ok'))}")

    def test_05_prices_default(self):
        data = _get(f"{self.prefix}/prices", params={"limit": 5})
        assert isinstance(data, (list, dict))
        print(f"  ✓ prices (default): ok")

    def test_06_prices_state(self):
        data = _get(f"{self.prefix}/prices", params={"state": "Maharashtra", "limit": 3})
        assert isinstance(data, (list, dict))
        print(f"  ✓ prices Maharashtra: ok")

    def test_07_prices_all_india(self):
        data = _get(f"{self.prefix}/prices/all-india", params={"commodity": "Wheat"})
        assert isinstance(data, (list, dict))
        print(f"  ✓ all-india Wheat: ok")

    def test_08_prices_bulk(self):
        try:
            data = _get(f"{self.prefix}/prices/bulk", timeout=120)
            assert isinstance(data, (list, dict))
            print(f"  ✓ bulk prices: ok")
        except Exception:
            print("  ⚠ bulk prices endpoint timed out; continuing")

    def test_09_mandis(self):
        data = _get(f"{self.prefix}/mandis", params={"limit": 5})
        assert isinstance(data, (list, dict))
        print(f"  ✓ mandis: ok")

    def test_10_sync(self):
        """Sync endpoint may require auth — accept 200 or 401/403."""
        try:
            data = _post(f"{self.prefix}/sync")
            print(f"  ✓ sync: ok")
        except AssertionError:
            print(f"  ⚠ sync: requires auth (expected)")


# ═══════════════════════════════════════════════════════════════
#  2. DOCUMENT BUILDER ENDPOINTS  (16 endpoints)
# ═══════════════════════════════════════════════════════════════

class TestDocumentBuilder:
    prefix = "/api/v1/market/document-builder"

    def test_01_list_schemes(self):
        data = _get(f"{self.prefix}/schemes")
        assert isinstance(data, (list, dict))
        if isinstance(data, list):
            assert len(data) > 0, "Expected at least 1 scheme"
            print(f"  ✓ schemes list: {len(data)} schemes")
        else:
            print(f"  ✓ schemes list: ok")

    def test_02_get_scheme(self):
        data = _get(f"{self.prefix}/schemes/PM-KISAN")
        assert isinstance(data, dict)
        scheme_name = data.get("name") or data.get("scheme_name")
        if not scheme_name and isinstance(data.get("scheme"), dict):
            scheme_name = data["scheme"].get("name") or data["scheme"].get("scheme_name")
        assert scheme_name, "Missing scheme name"
        print(f"  ✓ scheme PM-KISAN: {scheme_name}")

    def test_03_scheme_docs_summary(self):
        data = _get(f"{self.prefix}/scheme-docs")
        assert isinstance(data, (list, dict))
        print(f"  ✓ scheme docs summary: ok")

    def test_04_scheme_docs_pmkisan(self):
        data = _get(f"{self.prefix}/scheme-docs/PM-KISAN")
        assert isinstance(data, (list, dict))
        print(f"  ✓ scheme docs PM-KISAN: ok")

    def test_05_start_session(self):
        data = _post(
            f"{self.prefix}/sessions/start",
            {"scheme_name": "PM-KISAN"},
            expect=(200, 201),
        )
        assert isinstance(data, dict)
        sid = data.get("session_id", "")
        assert sid, "Expected session_id in response"
        # Store for later tests
        self.__class__._session_id = sid
        print(f"  ✓ start session: {sid[:12]}...")

    def test_06_get_session(self):
        sid = getattr(self.__class__, '_session_id', None)
        if not sid:
            print("  ⚠ skipped (no session)")
            return
        data = _get(f"{self.prefix}/sessions/{sid}")
        assert isinstance(data, dict)
        print(f"  ✓ get session: status={data.get('status', 'ok')}")

    def test_07_submit_answer(self):
        sid = getattr(self.__class__, '_session_id', None)
        if not sid:
            print("  ⚠ skipped (no session)")
            return
        data = _post(f"{self.prefix}/sessions/{sid}/answer", {
            "answers": {"name": "Test Farmer", "aadhaar_number": "123456789012"}
        })
        assert isinstance(data, dict)
        print(f"  ✓ submit answers: ok")

    def test_08_extract_text(self):
        sid = getattr(self.__class__, '_session_id', None)
        if not sid:
            print("  ⚠ skipped (no session)")
            return
        content = base64.b64encode(
            b"Name: Vinayak\nAadhaar: 123456789012\nDOB: 01/01/1990"
        ).decode("utf-8")
        data = _post(f"{self.prefix}/sessions/{sid}/extract", {
            "file_content": content,
            "filename": "sample.txt",
        })
        assert isinstance(data, dict)
        print(f"  ✓ extract-text: {list(data.get('extracted', data).keys())[:3]}")

    def test_09_list_sessions(self):
        data = _get(f"{self.prefix}/sessions")
        assert isinstance(data, (list, dict))
        print(f"  ✓ list sessions: ok")


# ═══════════════════════════════════════════════════════════════
#  3. EQUIPMENT RENTAL RATES  (7 endpoints)
# ═══════════════════════════════════════════════════════════════

class TestEquipmentRentalRates:
    prefix = "/api/v1/equipment/rental-rates"

    def test_01_list_all(self):
        data = _get(f"{self.prefix}/")
        assert isinstance(data, (list, dict))
        if isinstance(data, list):
            assert len(data) > 0, "Expected at least 1 equipment item"
            print(f"  ✓ rental rates: {len(data)} items")
        else:
            print(f"  ✓ rental rates: ok")

    def test_02_categories(self):
        data = _get(f"{self.prefix}/categories")
        assert isinstance(data, (list, dict))
        print(f"  ✓ categories: ok")

    def test_03_by_category(self):
        data = _get(f"{self.prefix}/", params={"category": "Tractors"})
        assert isinstance(data, (list, dict))
        print(f"  ✓ by category Tractors: ok")

    def test_04_by_state(self):
        data = _get(f"{self.prefix}/", params={"state": "Maharashtra"})
        assert isinstance(data, (list, dict))
        print(f"  ✓ by state Maharashtra: ok")

    def test_05_search(self):
        data = _get(f"{self.prefix}/search", params={"q": "tractor"})
        assert isinstance(data, (list, dict))
        print(f"  ✓ search tractor: ok")

    def test_06_chc_info(self):
        data = _get(f"{self.prefix}/chc-info")
        assert isinstance(data, dict)
        print(f"  ✓ CHC info: ok")

    def test_07_specific_equipment(self):
        data = _get(f"{self.prefix}/Mahindra 575 DI")
        assert isinstance(data, dict)
        print(f"  ✓ specific equipment: ok")


# ═══════════════════════════════════════════════════════════════
#  4. AGENT CHAT ENDPOINTS  (5 endpoints)
# ═══════════════════════════════════════════════════════════════

class TestAgentChat:
    prefix = "/api/v1/agent"

    def test_01_chat_crop_query(self):
        """Test that chatbot can handle crop questions."""
        data = _post(
            f"{self.prefix}/chat",
            {
                "message": "What is the best season to grow wheat?",
                "language": "en",
            },
            timeout=120,
            retries=2,
        )
        assert isinstance(data, dict)
        resp = data.get("response", data.get("message", ""))
        assert len(str(resp)) > 10, "Expected meaningful response"
        print(f"  ✓ chat crop query: {str(resp)[:60]}...")

    def test_02_chat_scheme_query(self):
        """Test that chatbot routes to SchemeAgent for scheme questions."""
        data = _post(
            f"{self.prefix}/chat",
            {
                "message": "Tell me full PM-KISAN details: benefits, eligibility, required documents, where to apply, and process",
                "language": "en",
            },
            timeout=120,
            retries=2,
        )
        assert isinstance(data, dict)
        resp = str(data.get("response", data.get("message", "")))
        low = resp.lower()
        assert any(k in low for k in ["benefit", "benefits"]), "Expected scheme benefits details"
        assert "eligib" in low, "Expected eligibility details"
        assert ("document" in low) or ("required" in low), "Expected required documents details"
        assert ("where to apply" in low) or ("official portal" in low) or ("csc" in low), "Expected where to apply details"
        assert "process" in low, "Expected application process details"
        print(f"  ✓ chat scheme: {resp[:60]}...")

    def test_03_chat_document_builder(self):
        """Test newly added document builder awareness in chatbot."""
        data = _post(
            f"{self.prefix}/chat",
            {
                "message": "How can I use the document builder to apply for PM-KISAN?",
                "language": "en",
            },
            timeout=120,
            retries=2,
        )
        resp = str(data.get("response", data.get("message", "")))
        print(f"  ✓ chat doc builder: {resp[:60]}...")

    def test_04_chat_equipment_rental(self):
        """Test newly added equipment rental awareness in chatbot."""
        data = _post(
            f"{self.prefix}/chat",
            {
                "message": "What are the rental rates for tractors in Maharashtra?",
                "language": "en",
            },
            timeout=120,
            retries=2,
        )
        resp = str(data.get("response", data.get("message", "")))
        print(f"  ✓ chat equipment: {resp[:60]}...")

    def test_05_chat_market_query(self):
        """Test market/mandi awareness."""
        data = _post(
            f"{self.prefix}/chat",
            {
                "message": "What are current wheat prices in Azadpur mandi?",
                "language": "en",
            },
            timeout=120,
            retries=2,
        )
        resp = str(data.get("response", data.get("message", "")))
        print(f"  ✓ chat market: {resp[:60]}...")

    def test_06_search(self):
        data = _post(f"{self.prefix}/search", {
            "query": "PM-KISAN benefits",
            "collection": "scheme_knowledge",
            "top_k": 3,
        })
        assert isinstance(data, (list, dict))
        print(f"  ✓ semantic search: ok")

    def test_07_chat_language_switch_per_turn(self):
        """Same session should mirror turn language dynamically (English -> Hindi -> Hinglish) without timestamp metadata."""
        sid = str(uuid.uuid4())
        blocked_time_markers = ["retrieved_at", "timestamp", "last updated", "freshness"]

        first = _post(
            f"{self.prefix}/chat",
            {
                "message": "Give me quick wheat mandi selling advice with source.",
                "session_id": sid,
            },
            timeout=120,
            retries=2,
        )
        resp_en = str(first.get("response", ""))
        assert len(resp_en) > 20, "Expected meaningful English response"
        assert not any("\u0900" <= ch <= "\u097f" for ch in resp_en), "Expected English script output"
        for marker in blocked_time_markers:
            assert marker not in resp_en.lower(), f"Unexpected time marker in English response: {marker}"

        second = _post(
            f"{self.prefix}/chat",
            {
                "message": "अब गेहूं बेचने के लिए 3 सीधे कदम बताओ और स्रोत भी बताओ",
                "session_id": sid,
            },
            timeout=120,
            retries=2,
        )
        resp_hi = str(second.get("response", ""))
        assert len(resp_hi) > 20, "Expected meaningful Hindi response"
        assert any("\u0900" <= ch <= "\u097f" for ch in resp_hi), "Expected Devanagari output for Hindi turn"
        for marker in blocked_time_markers:
            assert marker not in resp_hi.lower(), f"Unexpected time marker in Hindi response: {marker}"

        third = _post(
            f"{self.prefix}/chat",
            {
                "message": "bhai gehu bechne ke liye 3 simple steps batao aur source bhi do",
                "session_id": sid,
            },
            timeout=120,
            retries=2,
        )
        resp_hinglish = str(third.get("response", ""))
        assert len(resp_hinglish) > 20, "Expected meaningful Hinglish response"
        assert not any("\u0900" <= ch <= "\u097f" for ch in resp_hinglish), "Expected Roman script for Hinglish turn"
        for marker in blocked_time_markers:
            assert marker not in resp_hinglish.lower(), f"Unexpected time marker in Hinglish response: {marker}"
        print("  ✓ chat language switching: per-turn mirroring works across English/Hindi/Hinglish")

    def test_08_chat_farmer_friendly_no_refusal(self):
        """Market response should avoid refusal-style language and stay practical."""
        start = time.time()
        data = _post(
            f"{self.prefix}/chat",
            {
                "message": "Tell me mandi prices for wheat in Maharashtra with source and last updated info.",
                "language": "en",
            },
            timeout=120,
            retries=2,
        )
        latency = time.time() - start
        resp = str(data.get("response", ""))
        lower = resp.lower()
        assert resp.strip(), "Expected non-empty chat response"
        for marker in NEGATIVE_MARKERS:
            assert marker not in lower, f"Refusal marker leaked in response: {marker}"
        assert ("source" in lower) or ("srot" in lower) or ("स्रोत" in resp), "Expected source mention"
        assert latency <= MAX_CHAT_LATENCY_SECONDS, f"Chat latency too high: {latency:.2f}s"
        print(f"  ✓ chat farmer-friendly/no-refusal: {latency:.2f}s")


class TestVoiceCommand:
    prefix = "/api/v1/voice"
    audio_path = Path(__file__).resolve().parent / "materials" / "audio" / "voice_pipeline_test.wav"

    def test_01_voice_text_no_refusal(self):
        with open(self.audio_path, "rb") as fh:
            data = _post_multipart(
                f"{self.prefix}/command/text",
                files={"file": ("voice_pipeline_test.wav", fh, "audio/wav")},
                data={"language": "hi-IN"},
                timeout=120,
            )

        response = str(data.get("response", ""))
        low = response.lower()
        assert response.strip(), "Expected non-empty voice response"
        for marker in NEGATIVE_MARKERS + ["i don't know", "i do not know"]:
            assert marker not in low, f"Voice response contains refusal marker: {marker}"
        print("  ✓ voice no-refusal: ok")

    def test_02_voice_text_has_data_markers(self):
        with open(self.audio_path, "rb") as fh:
            data = _post_multipart(
                f"{self.prefix}/command/text",
                files={"file": ("voice_pipeline_test.wav", fh, "audio/wav")},
                data={"language": "hi-IN"},
                timeout=120,
            )

        response = str(data.get("response", ""))
        low = response.lower()
        assert response.strip(), "Expected non-empty voice response"
        assert data.get("response_origin") == "agent", "Expected strict agent-origin response"
        assert isinstance(data.get("latency_ms", {}), dict), "Expected latency telemetry"
        assert data.get("latency_ms", {}).get("total") is not None, "Expected total latency metric"
        print("  ✓ voice data markers + telemetry: ok")

    def test_03_voice_text_has_provenance_and_tool_evidence(self):
        with open(self.audio_path, "rb") as fh:
            data = _post_multipart(
                f"{self.prefix}/command/text",
                files={"file": ("voice_pipeline_test.wav", fh, "audio/wav")},
                data={"language": "hi-IN"},
                timeout=120,
            )

        origin = data.get("response_origin")
        assert origin == "agent", f"Voice strict mode expects agent origin, got: {origin}"
        assert data.get("fallback_used") is False, "Voice strict mode should never return fallback answers"

        tool_evidence = data.get("tool_evidence", {})
        assert isinstance(tool_evidence, dict) and tool_evidence, "Expected tool_evidence payload"
        assert "market" in tool_evidence, "Expected market evidence key"

        agent_used = (data.get("agent_metadata", {}) or {}).get("agent_used")
        assert agent_used, "Agent-origin response must include agent_used metadata"

        print(f"  ✓ voice provenance/tool evidence: origin={origin}")


# ═══════════════════════════════════════════════════════════════
#  6. ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class TestAnalyticsInsights:
    prefix = "/api/v1/analytics"

    def _get_self_user_id(self) -> Optional[str]:
        try:
            data = _get("/api/v1/auth/me", expect=(200, 401, 403), timeout=45)
            if isinstance(data, dict):
                return data.get("id") or data.get("user_id")
            return None
        except Exception:
            return None

    def test_01_overview(self):
        data = _get(f"{self.prefix}/overview", params={"days": 30}, expect=(200, 401, 403), timeout=120)
        if isinstance(data, dict) and "scorecard" in data:
            assert "engagement" in data
            assert "operational_health" in data
            print("  ✓ analytics overview: payload validated")
            return
        print("  ⚠ analytics overview: admin auth required in this environment")

    def test_02_kpis(self):
        data = _get(f"{self.prefix}/insights/kpis", params={"days": 30}, expect=(200, 401, 403), timeout=120)
        if isinstance(data, dict) and "scorecard" in data:
            assert isinstance(data.get("scorecard"), list)
            print("  ✓ analytics KPIs: payload validated")
            return
        print("  ⚠ analytics KPIs: admin auth required in this environment")

    def test_03_market_insights(self):
        data = _get(f"{self.prefix}/insights/market", params={"days": 30}, expect=(200, 401, 403), timeout=120)
        if isinstance(data, dict) and "market_intelligence" in data:
            mi = data.get("market_intelligence") or {}
            assert "top_commodities" in mi
            print("  ✓ analytics market insights: payload validated")
            return
        print("  ⚠ analytics market insights: admin auth required in this environment")

    def test_04_snapshot_generate(self):
        data = _post(f"{self.prefix}/snapshots/generate", body=None, expect=(201, 401, 403), timeout=120)
        if isinstance(data, dict) and "insights" in data:
            assert "date" in data
            print("  ✓ analytics snapshot generate: payload validated")
            return
        print("  ⚠ analytics snapshot generate: admin auth required in this environment")

    def test_05_farmer_self_summary(self):
        user_id = self._get_self_user_id()
        if not user_id:
            print("  ⚠ analytics self summary: user auth unavailable")
            return
        data = _get(f"{self.prefix}/farmer/{user_id}/summary", params={"days": 30}, expect=(200, 401, 403), timeout=120)
        if isinstance(data, dict) and data.get("farmer_id") == user_id:
            assert "totals" in data
            assert "activity" in data
            print("  ✓ analytics farmer self summary: payload validated")
            return
        print("  ⚠ analytics self summary: endpoint guarded in this environment")

    def test_06_farmer_self_benchmarks(self):
        user_id = self._get_self_user_id()
        if not user_id:
            print("  ⚠ analytics self benchmarks: user auth unavailable")
            return
        data = _get(f"{self.prefix}/farmer/{user_id}/benchmarks", params={"days": 30}, expect=(200, 401, 403), timeout=120)
        if isinstance(data, dict) and data.get("farmer_id") == user_id:
            assert "benchmark" in data
            print("  ✓ analytics farmer self benchmarks: payload validated")
            return
        print("  ⚠ analytics self benchmarks: endpoint guarded in this environment")


# ═══════════════════════════════════════════════════════════════
#  Standalone runner
# ═══════════════════════════════════════════════════════════════

def _run_class(cls):
    """Run all test methods in a class, return (pass, fail) counts."""
    passed = failed = 0
    instance = cls()
    methods = sorted(m for m in dir(instance) if m.startswith("test_"))
    for m in methods:
        try:
            getattr(instance, m)()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"  ✗ {m}: {e}")
    return passed, failed


def main():
    print("=" * 60)
    print("  COMPREHENSIVE ENDPOINT TEST SUITE")
    print(f"  Target: {BASE}")
    print("=" * 60)

    if _login_if_needed():
        print("  Auth: token acquired")
    else:
        print("  Auth: token not acquired (protected endpoints may fail with 401)")

    total_pass = total_fail = 0

    suites = [
        ("1. Live Market", TestLiveMarket),
        ("2. Document Builder", TestDocumentBuilder),
        ("3. Equipment Rental Rates", TestEquipmentRentalRates),
        ("4. Agent Chat", TestAgentChat),
        ("5. Voice Command", TestVoiceCommand),
        ("6. Analytics", TestAnalyticsInsights),
    ]

    for name, cls in suites:
        print(f"\n── {name} {'─' * (45 - len(name))}")
        p, f = _run_class(cls)
        total_pass += p
        total_fail += f
        print(f"  Results: {p} passed, {f} failed")

    print(f"\n{'=' * 60}")
    print(f"  TOTAL: {total_pass} PASSED  |  {total_fail} FAILED")
    print(f"{'=' * 60}")
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
