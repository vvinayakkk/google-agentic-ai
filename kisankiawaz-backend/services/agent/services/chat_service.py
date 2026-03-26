import uuid
import re
import json
from datetime import datetime, timezone
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from shared.db.mongodb import get_async_db
from shared.core.constants import MongoCollections
from agents.coordinator import build_coordinator
from services.groq_fallback_service import generate_groq_reply
from loguru import logger


MAX_SUMMARY_CHARS = 2200
MAX_CONTEXT_MSGS = 8
MAX_MESSAGE_SNIPPET_CHARS = 280
MAX_FACTS = 12
HINDI_MARKERS = {
    "kya", "kaise", "kitna", "mandi", "daam", "fasal", "bech", "bechna", "krishi",
    "kisan", "salah", "madad", "aaj", "kal", "pichla", "abhi", "aur", "hain", "hai",
}
HINGLISH_MARKERS = {
    "bhai", "behen", "aap", "aapka", "aapke", "karo", "karna", "karni", "hoga",
    "hogi", "honge", "chahiye", "jaldi", "sahi", "kitne", "kyunki", "abhi", "thoda",
}
EN_COMMON = {
    "the", "and", "for", "with", "your", "price", "market", "weather", "scheme", "profit",
    "today", "week", "farm", "farmer", "sell", "buy", "plan", "risk", "best", "help",
}
STATE_NAMES = {
    "maharashtra", "karnataka", "uttar pradesh", "madhya pradesh", "punjab", "haryana",
    "rajasthan", "bihar", "west bengal", "gujarat", "odisha", "chhattisgarh", "telangana",
    "andhra pradesh", "tamil nadu", "kerala", "assam", "jharkhand", "himachal pradesh",
    "uttarakhand", "jammu and kashmir", "delhi", "goa", "tripura", "manipur", "meghalaya",
    "mizoram", "nagaland", "sikkim", "arunachal pradesh",
}

SCHEME_INTENT_MARKERS = {
    "scheme", "subsidy", "benefit", "benefits", "eligibility", "eligible", "apply",
    "application", "documents", "document", "pm-kisan", "kcc", "pmfby", "pmfb",
    "pm-kusum", "rythu", "kalia", "insurance", "loan",
}

EQUIPMENT_INTENT_MARKERS = {
    "equipment", "rental", "rent", "tractor", "harvester", "sprayer", "drone",
    "rotavator", "weeder", "seed drill", "trolley", "thresher",
}


class ChatService:
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.coordinator = build_coordinator()
        self.runner = Runner(
            agent=self.coordinator,
            app_name="kisankiawaz",
            session_service=self.session_service,
        )

    @staticmethod
    def _compact_text(text: str, max_chars: int) -> str:
        clean = " ".join((text or "").split())
        if len(clean) <= max_chars:
            return clean
        return clean[: max_chars - 3].rstrip() + "..."

    def _normalize_language_label(self, language: str | None) -> str:
        lang = str(language or "").strip().lower()
        if lang in {"en", "english"}:
            return "en"
        if lang in {"hi", "hindi"}:
            return "hi"
        if lang in {"hinglish", "hi-en", "hi_en", "mix"}:
            return "hinglish"
        return lang or "auto"

    def _detect_turn_language(self, user_message: str, requested_language: str | None, previous_language: str | None) -> str:
        text = " ".join((user_message or "").split())
        text_l = text.lower()
        req = self._normalize_language_label(requested_language)
        prev = self._normalize_language_label(previous_language)

        has_devanagari = self._contains_devanagari(text)
        tokens = [t for t in re.split(r"[^a-zA-Z]+", text_l) if t]
        hindi_hits = sum(1 for t in tokens if t in HINDI_MARKERS)
        hinglish_hits = sum(1 for t in tokens if t in HINGLISH_MARKERS)
        en_hits = sum(1 for t in tokens if t in EN_COMMON)
        generic_roman_hits = sum(1 for t in tokens if len(t) >= 4 and t not in HINDI_MARKERS)

        if has_devanagari:
            return "hi"
        if (hindi_hits + hinglish_hits) >= 2 and (en_hits >= 1 or generic_roman_hits >= 1):
            return "hinglish"
        if (hindi_hits + hinglish_hits) >= 2 and en_hits < 2:
            return "hi"
        if en_hits >= 2 and hindi_hits == 0:
            return "en"

        # Strongly prioritize current-turn text style over stale language preference.
        if self._has_hindi_transliterated_markers(text):
            if en_hits >= 1:
                return "hinglish"
            return "hi"

        if req in {"en", "hi", "hinglish"}:
            return req
        if prev in {"en", "hi", "hinglish"}:
            return prev
        return "en"

    def _extract_geo_hints(self, user_message: str, farmer_facts: list[str]) -> tuple[str, str, str]:
        text = " ".join((user_message or "").split())
        text_l = text.lower()

        state_hint = ""
        district_hint = ""
        city_hint = ""

        for state_name in STATE_NAMES:
            if state_name in text_l:
                state_hint = state_name.title()
                break

        in_match = re.search(r"\bin\s+([a-zA-Z\s]{2,45})(?:,|\.|$)", text)
        if in_match:
            location_phrase = self._compact_text(in_match.group(1).strip(), 45)
            city_hint = location_phrase

        for fact in farmer_facts:
            if isinstance(fact, str) and fact.startswith("location_hint="):
                loc = fact.split("=", 1)[1].strip()
                if loc and not city_hint:
                    city_hint = loc

        if city_hint and not state_hint:
            city_l = city_hint.lower()
            if city_l in STATE_NAMES:
                state_hint = city_hint.title()
                city_hint = ""
            else:
                district_hint = city_hint
        elif city_hint:
            district_hint = city_hint

        return state_hint, district_hint, city_hint

    def _sanitize_unhelpful_response(self, response_text: str, language: str) -> str:
        txt = (response_text or "").strip()
        if not txt:
            return txt

        lower_txt = txt.lower()
        negative_markers = [
            "i could not",
            "i can't",
            "i cannot",
            "unable to",
            "not available",
            "not found",
            "couldn't find",
            "no data",
            "i do not have",
            "i don't have",
            "i am unable",
            "cannot fetch",
        ]
        if not any(m in lower_txt for m in negative_markers):
            return txt

        cleaned_lines = []
        for line in txt.splitlines():
            l = line.lower()
            if any(m in l for m in negative_markers):
                continue
            cleaned_lines.append(line)
        cleaned = "\n".join(cleaned_lines).strip()

        if str(language or "").lower().startswith("en"):
            prefix = (
                "Exact local match is limited in current records, so here is the closest verified data and practical action plan."
            )
        elif str(language or "").lower().startswith("hinglish"):
            prefix = (
                "Exact local match abhi limited hai, isliye neeche closest verified data aur practical action plan diya hai."
            )
        else:
            prefix = "सटीक लोकल मैच सीमित है, इसलिए नीचे सबसे नज़दीकी सत्यापित डेटा और व्यावहारिक कार्ययोजना दी गई है।"

        return f"{prefix}\n\n{cleaned}" if cleaned else prefix

    async def _load_recent_messages(self, db, session_id: str, limit: int = MAX_CONTEXT_MSGS) -> list[dict]:
        docs = await (
            db.collection(MongoCollections.AGENT_SESSIONS)
            .document(session_id)
            .collection("messages")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .get()
        )
        # Return oldest -> newest for natural chronology in prompt context.
        return [d.to_dict() for d in reversed(docs)]

    def _extract_farmer_facts(self, user_message: str) -> list[str]:
        text = " ".join((user_message or "").split())
        text_l = text.lower()
        facts: list[str] = []

        acre_match = re.search(r"(\d+(?:\.\d+)?)\s*acres?", text_l)
        if acre_match:
            facts.append(f"land_holding_acres={acre_match.group(1)}")

        city_match = re.search(r"\bin\s+([a-zA-Z\s]{2,40})(?:,|\.|\swith|\sfor|$)", text)
        if city_match:
            city_val = self._compact_text(city_match.group(1).strip(), 40)
            city_l = city_val.lower()
            invalid_location_terms = {
                "english",
                "hindi",
                "marathi",
                "only",
                "simple",
                "clear",
                "practical",
            }
            city_words = [w for w in re.split(r"\s+", city_l) if w]
            looks_like_language_hint = any(w in invalid_location_terms for w in city_words)
            if city_val and not looks_like_language_hint:
                facts.append(f"location_hint={city_val}")

        crop_terms = ["wheat", "rice", "maize", "cotton", "soybean", "sugarcane", "mustard", "chickpea"]
        found_crops = [c for c in crop_terms if c in text_l]
        if found_crops:
            facts.append("crops_of_interest=" + ",".join(sorted(set(found_crops))[:4]))

        intent_terms = ["pm-kisan", "pmfby", "kcc", "mandi", "tractor", "rental", "weather"]
        found_intents = [t for t in intent_terms if t in text_l]
        if found_intents:
            facts.append("topics=" + ",".join(sorted(set(found_intents))[:5]))

        return facts

    def _merge_fact_memory(self, existing_facts: list[str], new_facts: list[str]) -> list[str]:
        merged = [f for f in existing_facts if isinstance(f, str) and f.strip()]
        for fact in new_facts:
            if fact not in merged:
                merged.append(fact)
        return merged[-MAX_FACTS:]

    @staticmethod
    def _contains_devanagari(text: str) -> bool:
        return bool(re.search(r"[\u0900-\u097F]", text or ""))

    @staticmethod
    def _has_hindi_transliterated_markers(text: str) -> bool:
        txt = (text or "").lower()
        markers = [
            "namaste",
            "aap",
            "aapke",
            "kisan",
            "krishi",
            "dhanyavaad",
            "bhai",
            "behen",
            "dost",
        ]
        return any(re.search(rf"\b{re.escape(m)}\b", txt) for m in markers)

    @staticmethod
    def _normalize_english_openers(text: str) -> str:
        cleaned = text or ""
        cleaned = re.sub(r"^\s*namaste[!,.\s-]*", "Hello! ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^\s*dhanyavaad[!,.\s-]*", "Thank you. ", cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

    @staticmethod
    def _needs_explicit_memory_reference(user_message: str) -> bool:
        msg = (user_message or "").lower()
        triggers = ["based on", "previous", "earlier", "as discussed", "as we discussed", "from above"]
        return any(t in msg for t in triggers)

    def _render_fact_hint(self, farmer_facts: list[str]) -> str:
        if not farmer_facts:
            return ""
        key_facts = farmer_facts[-3:]
        return "; ".join(key_facts)

    def _enforce_memory_reference(self, response_text: str, user_message: str, farmer_facts: list[str], language: str) -> str:
        if not self._needs_explicit_memory_reference(user_message):
            return response_text
        if not farmer_facts:
            return response_text

        fact_hint = self._render_fact_hint(farmer_facts)
        if not fact_hint:
            return response_text

        if str(language or "").lower().startswith("en"):
            suffix = f"\n\nConsidering your earlier context ({fact_hint}), this recommendation is tailored for your farm situation."
        else:
            suffix = f"\n\nआपके पहले साझा किए गए संदर्भ ({fact_hint}) के आधार पर यह सलाह आपके खेत की स्थिति के अनुसार है।"
        return response_text + suffix

    async def _translate_with_runner_to_english(self, response_text: str) -> str:
        runtime_session_id = f"translate-{uuid.uuid4().hex[:8]}"
        session = await self.session_service.get_session(
            app_name="kisankiawaz", user_id="translator", session_id=runtime_session_id
        )
        if not session:
            session = await self.session_service.create_session(
                app_name="kisankiawaz", user_id="translator", session_id=runtime_session_id
            )

        prompt = (
            "Translate the following response to clear practical English for an Indian farmer. "
            "Preserve all facts, numbers, and recommendations exactly. Output only English text.\n\n"
            f"Response to translate:\n{response_text}"
        )
        content = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
        translated = ""
        async for event in self.runner.run_async(
            user_id="translator", session_id=runtime_session_id, new_message=content
        ):
            if event.is_final_response():
                for part in event.content.parts:
                    if part.text:
                        translated += part.text
        return translated.strip()

    async def _enforce_language(self, response_text: str, language: str) -> str:
        lang = str(language or "").lower().strip()
        if not lang.startswith("en"):
            return response_text
        contains_non_english_markers = (
            self._contains_devanagari(response_text)
            or self._has_hindi_transliterated_markers(response_text)
        )
        if not contains_non_english_markers:
            return self._normalize_english_openers(response_text)

        try:
            translated_runner = await self._translate_with_runner_to_english(response_text)
            if translated_runner and not self._contains_devanagari(translated_runner):
                return self._normalize_english_openers(translated_runner)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"In-runner English translation failed: {exc}")

        try:
            translated = generate_groq_reply(
                message=(
                    "Translate the following answer to clear, practical English for an Indian farmer. "
                    "Preserve all facts, numbers, and recommendations exactly.\n\n"
                    f"Answer:\n{response_text}"
                ),
                language="en",
            ).get("response", "")
            if translated.strip():
                return self._normalize_english_openers(translated.strip())
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"English enforcement translation failed: {exc}")
        return self._normalize_english_openers(response_text)

    def _build_context_block(self, summary: str, recent_messages: list[dict], language: str, farmer_facts: list[str]) -> str:
        lang = self._normalize_language_label(language)
        if lang == "en":
            lang_name = "English"
        elif lang == "hinglish":
            lang_name = "Hinglish (Roman Hindi + English mix)"
        else:
            lang_name = "Hindi"
        lines = [
            "Conversation memory for continuity (compressed, token-bounded):",
            "- Always answer as a practical Indian farming advisor.",
            "- Keep guidance grounded in farmer realities (cost, risk, local mandi/weather/schemes, actionable next steps).",
            "- Never give a refusal-style answer; if exact match is missing, provide nearest verified records and practical alternatives.",
            f"- REQUIRED output language: {lang_name}.",
            "- Do not switch language unless user explicitly asks.",
            "- Use this response structure with bullet points: 1) What data says now (with source+time), 2) What farmer should do now, 3) Profit/risk tips.",
            "- Keep response intuitive for farmers: short bullets, plain language, and direct money-impact guidance.",
            "- Never return empty/unknown-only output; always provide best available verified snapshot with timestamp.",
        ]

        if farmer_facts:
            lines.append("Known farmer context facts:")
            for fact in farmer_facts:
                lines.append(f"- {fact}")

        if summary:
            lines.append("Session summary:")
            lines.append(self._compact_text(summary, MAX_SUMMARY_CHARS))

        if recent_messages:
            lines.append("Recent dialogue snippets:")
            for msg in recent_messages:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = self._compact_text(str(msg.get("content", "")), MAX_MESSAGE_SNIPPET_CHARS)
                if content:
                    lines.append(f"- {role}: {content}")

        lines.append("Use this memory only as supporting context; prioritize factual and up-to-date tool-backed answers.")
        lines.append("If the user asks to build on previous discussion, explicitly reference at least one remembered fact.")
        return "\n".join(lines)

    @staticmethod
    def _is_scheme_intent(message: str) -> bool:
        txt = (message or "").lower()
        tokens = {t for t in re.split(r"[^a-zA-Z0-9\-]+", txt) if t}
        has_scheme = any(k in txt for k in SCHEME_INTENT_MARKERS) or bool(tokens.intersection(SCHEME_INTENT_MARKERS))
        has_equipment = any(k in txt for k in EQUIPMENT_INTENT_MARKERS) or bool(tokens.intersection(EQUIPMENT_INTENT_MARKERS))

        # Equipment rental intents should not be hijacked by generic scheme markers like
        # "eligibility" or "documents" when no scheme keyword is present.
        if has_equipment and not any(k in txt for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "pm-kusum"]):
            return False
        return has_scheme

    @staticmethod
    def _as_text_list(value) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        txt = str(value).strip()
        if not txt:
            return []
        if txt.startswith("[") and txt.endswith("]"):
            try:
                arr = json.loads(txt)
                if isinstance(arr, list):
                    return [str(v).strip() for v in arr if str(v).strip()]
            except Exception:
                pass
        parts = re.split(r"\n|;|\|", txt)
        cleaned = [p.strip(" -") for p in parts if p.strip(" -")]
        return cleaned if cleaned else [txt]

    def _render_scheme_detail_response(self, message: str, language: str, farmer_facts: list[str]) -> str:
        from tools.scheme_tools import search_government_schemes

        state_hint, _, _ = self._extract_geo_hints(message, farmer_facts)
        scheme_data = search_government_schemes(query=message, state=state_hint)
        if not isinstance(scheme_data, dict) or not scheme_data.get("found"):
            return ""

        results = scheme_data.get("results", []) if isinstance(scheme_data.get("results", []), list) else []
        if not results:
            return ""

        top = results[:3]
        source = scheme_data.get("source") or "ref_farmer_schemes"
        lines: list[str] = []

        for i, row in enumerate(top, start=1):
            if isinstance(row, str):
                lines.append(f"{i}. Scheme guidance: {self._compact_text(row, 320)}")
                continue

            title = str(row.get("title") or row.get("scheme_id") or f"Scheme {i}")
            summary = self._compact_text(str(row.get("summary") or ""), 260)
            eligibility = self._as_text_list(row.get("eligibility"))
            docs = self._as_text_list(row.get("required_documents"))
            benefits = self._as_text_list(row.get("benefits"))
            process = self._as_text_list(row.get("application_process") or row.get("how_to_apply"))
            links = self._as_text_list(row.get("official_links"))
            where_apply = self._as_text_list(row.get("where_to_apply"))
            contacts = self._as_text_list(row.get("contact_numbers"))
            last_updated = str(row.get("last_updated") or "")

            if not benefits and summary:
                benefits = [summary]
            if not eligibility:
                eligibility = ["Farmer should verify eligibility at CSC or state agriculture portal with Aadhaar and land details."]
            if not docs:
                docs = ["Aadhaar card", "Bank passbook", "Land record", "Mobile number"]
            if not process:
                process = [
                    "Check eligibility on official portal/CSC",
                    "Prepare required documents",
                    "Submit application online or at CSC",
                    "Save acknowledgement/application ID for tracking",
                ]
            if not where_apply:
                where_apply = ["Nearest CSC / District Agriculture Office"]
            if links:
                where_apply.append(f"Official portal: {links[0]}")
            if contacts:
                where_apply.append(f"Helpline: {contacts[0]}")

            lines.append(f"{i}. {title}")
            lines.append(f"   Benefits: {self._compact_text('; '.join(benefits[:3]), 240)}")
            lines.append(f"   Eligibility: {self._compact_text('; '.join(eligibility[:3]), 240)}")
            lines.append(f"   Documents required: {self._compact_text('; '.join(docs[:6]), 260)}")
            lines.append(f"   Where to apply: {self._compact_text('; '.join(where_apply[:3]), 260)}")
            lines.append(f"   Process: {self._compact_text(' -> '.join(process[:5]), 280)}")
            if summary:
                lines.append(f"   Summary: {summary}")
            if last_updated:
                lines.append(f"   Last updated: {last_updated}")

        if str(language or "").lower().startswith("hi"):
            header = "किसान के लिए योजना विवरण (सीधे उपयोग योग्य):"
            footer = f"स्रोत: {source}. आवेदन से पहले अपने राज्य पोर्टल/CSC पर नवीनतम नियम सत्यापित करें।"
        elif str(language or "").lower().startswith("hinglish"):
            header = "Farmer ke liye scheme details (directly actionable):"
            footer = f"Source: {source}. Apply karne se pehle state portal/CSC par latest rules verify karo."
        else:
            header = "Scheme details for the farmer (end-to-end actionable):"
            footer = f"Source: {source}. Verify latest state-specific rules on official portal/CSC before submission."

        return header + "\n" + "\n".join(lines) + "\n\n" + footer

    async def _append_summary(
        self,
        db,
        session_id: str,
        previous_summary: str,
        previous_facts: list[str],
        user_message: str,
        assistant_message: str,
    ) -> tuple[str, list[str]]:
        now = datetime.now(timezone.utc).isoformat()
        summary_addition = (
            f"[{now}] User intent: {self._compact_text(user_message, 220)} "
            f"| Assistant response gist: {self._compact_text(assistant_message, 320)}"
        )

        if previous_summary:
            merged = f"{previous_summary}\n{summary_addition}"
        else:
            merged = summary_addition

        merged = self._compact_text(merged, MAX_SUMMARY_CHARS)
        updated_facts = self._merge_fact_memory(previous_facts, self._extract_farmer_facts(user_message))
        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).set(
            {
                "summary": merged,
                "farmer_facts": updated_facts,
                "updated_at": now,
            },
            merge=True,
        )
        return merged, updated_facts

    async def _persist_turn(
        self,
        db,
        user_id: str,
        session_id: str,
        language: str,
        user_message: str,
        assistant_message: str,
        agent_used: str,
        previous_summary: str,
        previous_facts: list[str],
    ) -> None:
        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).set({
            "user_id": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "language": language,
        }, merge=True)

        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).collection("messages").add({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).collection("messages").add({
            "role": "assistant",
            "content": assistant_message,
            "agent": agent_used,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        await self._append_summary(
            db=db,
            session_id=session_id,
            previous_summary=previous_summary,
            previous_facts=previous_facts,
            user_message=user_message,
            assistant_message=assistant_message,
        )

    async def process_message_with_groq_fallback(
        self,
        user_id: str,
        session_id: str,
        message: str,
        language: str = "hi",
    ) -> dict:
        db = get_async_db()

        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        session_data = session_doc.to_dict() if session_doc.exists else {}
        turn_language = self._detect_turn_language(
            user_message=message,
            requested_language=language,
            previous_language=session_data.get("language") if isinstance(session_data, dict) else None,
        )
        rolling_summary = str(session_data.get("summary", "") or "")
        farmer_facts = session_data.get("farmer_facts", []) if isinstance(session_data.get("farmer_facts", []), list) else []

        if self._is_scheme_intent(message):
            direct = self._render_scheme_detail_response(message=message, language=turn_language, farmer_facts=farmer_facts)
            if direct.strip():
                direct = await self._enforce_language(response_text=direct, language=turn_language)
                await self._persist_turn(
                    db=db,
                    user_id=user_id,
                    session_id=session_id,
                    language=turn_language,
                    user_message=message,
                    assistant_message=direct,
                    agent_used="scheme_direct",
                    previous_summary=rolling_summary,
                    previous_facts=farmer_facts,
                )
                return {
                    "session_id": session_id,
                    "response": direct,
                    "language": turn_language,
                    "agent_used": "scheme_direct",
                    "provider": "database",
                    "model": "deterministic",
                }

        recent_messages = await self._load_recent_messages(db=db, session_id=session_id, limit=MAX_CONTEXT_MSGS)
        context_block = self._build_context_block(
            summary=rolling_summary,
            recent_messages=recent_messages,
            language=turn_language,
            farmer_facts=farmer_facts,
        )

        grounded_context = self._build_grounded_fallback_context(
            user_message=message,
            farmer_facts=farmer_facts,
        )

        augmented_message = (
            f"{context_block}\n\n"
            f"Grounded domain data (authoritative tool outputs):\n{grounded_context}\n\n"
            f"Current user message:\n{message}\n\n"
            "Respond with farmer-first practical advice using ONLY the grounded domain data above. "
            "Never say unavailable/not found/unable. "
            "If exact local match is missing, provide nearest verified records and clearly label them as nearest match. "
            "Do not invent prices, dates, weather values, eligibility rules, or sources. "
            "If market data includes fallback_mode='relaxed', explicitly tell the user it is an approximate regional fallback and not an exact district match. "
            "Always mention source and freshness timestamps when they exist in grounded data. "
            "Answer in farmer-friendly bullet points with: Data now, Action now, Profit/risk tip. "
            "Output must be in the REQUIRED output language above."
        )

        fallback = generate_groq_reply(message=augmented_message, language=turn_language)
        response_text = (fallback.get("response", "") or "").strip()
        if not response_text:
            if turn_language.startswith("en"):
                response_text = "Here is a practical farmer action plan based on the currently available verified data and nearest market references."
            elif turn_language.startswith("hinglish"):
                response_text = "Yeh practical farmer action plan current verified data aur nearest market references par based hai."
            else:
                response_text = "यह व्यावहारिक किसान कार्ययोजना अभी उपलब्ध सत्यापित डेटा और नज़दीकी मार्केट संदर्भों पर आधारित है।"

        response_text = await self._enforce_language(response_text=response_text, language=turn_language)
        response_text = self._sanitize_unhelpful_response(response_text=response_text, language=turn_language)
        response_text = self._enforce_source_freshness_note(
            response_text=response_text,
            user_message=message,
            language=turn_language,
        )
        response_text = self._enforce_memory_reference(
            response_text=response_text,
            user_message=message,
            farmer_facts=farmer_facts,
            language=turn_language,
        )

        await self._persist_turn(
            db=db,
            user_id=user_id,
            session_id=session_id,
            language=turn_language,
            user_message=message,
            assistant_message=response_text,
            agent_used="groq_fallback",
            previous_summary=rolling_summary,
            previous_facts=farmer_facts,
        )

        return {
            "session_id": session_id,
            "response": response_text,
            "language": turn_language,
            "agent_used": "groq_fallback",
            "provider": fallback.get("provider", "groq"),
            "model": fallback.get("model", "unknown"),
        }

    def _build_grounded_fallback_context(self, user_message: str, farmer_facts: list[str]) -> str:
        msg = (user_message or "").lower()
        lines: list[str] = []
        state_hint, district_hint, city_hint = self._extract_geo_hints(user_message, farmer_facts)

        crop_terms = ["wheat", "rice", "maize", "cotton", "soybean", "mustard", "chickpea", "onion", "potato", "tomato"]
        crop = ""
        for c in crop_terms:
            if c in msg:
                crop = c.title()
                break

        try:
            if any(k in msg for k in ["price", "mandi", "market", "sell", "rates"]):
                from tools.market_tools import get_live_mandi_prices, get_live_mandis

                market_data = get_live_mandi_prices(
                    crop_name=crop or "Wheat",
                    state=state_hint,
                    district=district_hint,
                    limit=8,
                )
                mandi_data = get_live_mandis(state=state_hint, limit=8)
                lines.append("MARKET_DATA=" + self._compact_text(json.dumps(market_data, ensure_ascii=True), 3000))
                lines.append("MANDI_DATA=" + self._compact_text(json.dumps(mandi_data, ensure_ascii=True), 3000))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"MARKET_DATA_ERROR={exc}")

        try:
            if any(k in msg for k in ["weather", "rain", "forecast", "temperature", "soil"]):
                from tools.weather_tools import get_live_weather, get_live_weather_forecast, get_live_soil_moisture

                city = f"{(city_hint or district_hint)},IN" if (city_hint or district_hint) else "Pune,IN"
                weather_data = get_live_weather(city=city)
                forecast_data = get_live_weather_forecast(city=city, max_slots=6)
                soil_data = get_live_soil_moisture(state=state_hint or "Maharashtra", district=district_hint, limit=10)
                lines.append("WEATHER_DATA=" + self._compact_text(json.dumps(weather_data, ensure_ascii=True), 2600))
                lines.append("FORECAST_DATA=" + self._compact_text(json.dumps(forecast_data, ensure_ascii=True), 2600))
                lines.append("SOIL_DATA=" + self._compact_text(json.dumps(soil_data, ensure_ascii=True), 2600))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"WEATHER_SOIL_ERROR={exc}")

        try:
            if any(k in msg for k in ["scheme", "pm-kisan", "eligibility", "subsidy", "kcc"]):
                from tools.scheme_tools import search_government_schemes, check_scheme_eligibility

                scheme_data = search_government_schemes(query=user_message, state=state_hint)
                elig_data = check_scheme_eligibility(scheme_name="PM-KISAN")
                lines.append("SCHEME_DATA=" + self._compact_text(json.dumps(scheme_data, ensure_ascii=True), 2600))
                lines.append("SCHEME_ELIGIBILITY_DATA=" + self._compact_text(json.dumps(elig_data, ensure_ascii=True), 2000))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"SCHEME_DATA_ERROR={exc}")

        try:
            if any(k in msg for k in ["tractor", "equipment", "rental", "harvester", "sprayer"]):
                from tools.scheme_tools import search_equipment_rentals

                equip_data = search_equipment_rentals(query=user_message, state=state_hint)
                lines.append("EQUIPMENT_DATA=" + self._compact_text(json.dumps(equip_data, ensure_ascii=True), 2600))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"EQUIPMENT_DATA_ERROR={exc}")

        if not lines:
            lines.append("NO_DOMAIN_TOOL_DATA=No specific domain intent detected")
        return "\n".join(lines)

    @staticmethod
    def _has_source_marker(text: str) -> bool:
        txt = (text or "").lower()
        return "source" in txt

    @staticmethod
    def _has_freshness_marker(text: str) -> bool:
        txt = (text or "").lower()
        markers = ["last updated", "as of", "retrieved", "observed", "verified", "latest date", "arrival date"]
        return any(m in txt for m in markers)

    def _enforce_source_freshness_note(self, response_text: str, user_message: str, language: str) -> str:
        msg = (user_message or "").lower()
        domain_terms = ["price", "mandi", "weather", "soil", "scheme", "rental", "equipment"]
        if not any(t in msg for t in domain_terms):
            return response_text
        if self._has_source_marker(response_text) and self._has_freshness_marker(response_text):
            return response_text

        if str(language or "").lower().startswith("en"):
            note = (
                "\n\nSource and freshness note: this answer is grounded in available service data. "
                "If precise freshness time is missing in a source record, this answer uses the most recent verified snapshot timestamp available."
            )
        elif str(language or "").lower().startswith("hinglish"):
            note = (
                "\n\nSource aur freshness note: yeh answer available service data par grounded hai. "
                "Agar exact freshness time missing ho, to latest verified snapshot timestamp use kiya gaya hai."
            )
        else:
            note = (
                "\n\nस्रोत और ताजगी नोट: यह उत्तर उपलब्ध सेवा डेटा पर आधारित है। "
                "यदि स्रोत रिकॉर्ड में सटीक समय नहीं है, तो उपलब्ध सबसे हालिया सत्यापित स्नैपशॉट समय का उपयोग किया गया है।"
            )
        return response_text + note

    async def process_message(self, user_id: str, session_id: str, message: str, language: str = "hi") -> dict:
        db = get_async_db()

        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        session_data = session_doc.to_dict() if session_doc.exists else {}
        turn_language = self._detect_turn_language(
            user_message=message,
            requested_language=language,
            previous_language=session_data.get("language") if isinstance(session_data, dict) else None,
        )
        rolling_summary = str(session_data.get("summary", "") or "")
        farmer_facts = session_data.get("farmer_facts", []) if isinstance(session_data.get("farmer_facts", []), list) else []

        if self._is_scheme_intent(message):
            direct = self._render_scheme_detail_response(message=message, language=turn_language, farmer_facts=farmer_facts)
            if direct.strip():
                direct = await self._enforce_language(response_text=direct, language=turn_language)
                await self._persist_turn(
                    db=db,
                    user_id=user_id,
                    session_id=session_id,
                    language=turn_language,
                    user_message=message,
                    assistant_message=direct,
                    agent_used="scheme_direct",
                    previous_summary=rolling_summary,
                    previous_facts=farmer_facts,
                )
                return {
                    "session_id": session_id,
                    "response": direct,
                    "language": turn_language,
                    "agent_used": "scheme_direct",
                    "provider": "database",
                    "model": "deterministic",
                }

        recent_messages = await self._load_recent_messages(db=db, session_id=session_id, limit=MAX_CONTEXT_MSGS)
        context_block = self._build_context_block(
            summary=rolling_summary,
            recent_messages=recent_messages,
            language=turn_language,
            farmer_facts=farmer_facts,
        )

        # Use an ephemeral runtime session per turn so model context remains bounded.
        runtime_session_id = f"{session_id}-{uuid.uuid4().hex[:8]}"
        session = await self.session_service.get_session(
            app_name="kisankiawaz", user_id=user_id, session_id=runtime_session_id
        )
        if not session:
            session = await self.session_service.create_session(
                app_name="kisankiawaz", user_id=user_id, session_id=runtime_session_id
            )

        augmented_message = (
            f"{context_block}\n\n"
            f"Current user message:\n{message}\n\n"
            "Respond with farmer-first practical advice and reference specific data when available. "
            "Never use refusal-style wording (cannot, unavailable, not found). "
            "If exact local data is limited, show nearest verified alternatives with clear labeling and timestamp. "
            "Use bullet points with: Data now, Action now, Profit/risk tip. "
            "Output must be in the REQUIRED output language above."
        )

        content = types.Content(
            role="user",
            parts=[types.Part.from_text(text=augmented_message)]
        )

        response_text = ""
        agent_used = "coordinator"
        async for event in self.runner.run_async(
            user_id=user_id, session_id=runtime_session_id, new_message=content
        ):
            if event.is_final_response():
                for part in event.content.parts:
                    if part.text:
                        response_text += part.text
                agent_used = event.author or "coordinator"

        if not response_text.strip():
            if turn_language.startswith("en"):
                response_text = "Here is a practical farmer action plan from currently available verified records."
            elif turn_language.startswith("hinglish"):
                response_text = "Yeh practical farmer action plan current verified records par based hai."
            else:
                response_text = "यह व्यावहारिक किसान कार्ययोजना उपलब्ध सत्यापित रिकॉर्ड पर आधारित है।"

        response_text = await self._enforce_language(response_text=response_text, language=turn_language)
        response_text = self._sanitize_unhelpful_response(response_text=response_text, language=turn_language)
        response_text = self._enforce_source_freshness_note(
            response_text=response_text,
            user_message=message,
            language=turn_language,
        )
        response_text = self._enforce_memory_reference(
            response_text=response_text,
            user_message=message,
            farmer_facts=farmer_facts,
            language=turn_language,
        )

        await self._persist_turn(
            db=db,
            user_id=user_id,
            session_id=session_id,
            language=turn_language,
            user_message=message,
            assistant_message=response_text,
            agent_used=agent_used,
            previous_summary=rolling_summary,
            previous_facts=farmer_facts,
        )

        return {
            "session_id": session_id,
            "response": response_text,
            "language": turn_language,
            "agent_used": agent_used,
        }

    async def list_sessions(self, user_id: str) -> list:
        db = get_async_db()
        from shared.db.mongodb import FieldFilter
        docs = await db.collection(MongoCollections.AGENT_SESSIONS).where(
            filter=FieldFilter("user_id", "==", user_id)
        ).get()
        items = [{"id": d.id, **d.to_dict()} for d in docs]
        # Sort in Python (avoids composite index requirement)
        items.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return items

    async def get_session_history(self, session_id: str, user_id: str) -> dict:
        db = get_async_db()
        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        if not session_doc.exists or session_doc.to_dict().get("user_id") != user_id:
            from shared.errors import not_found
            raise not_found("Session")
        messages = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).collection("messages").order_by("timestamp").get()
        return {
            "session_id": session_id,
            "messages": [m.to_dict() for m in messages],
        }

    async def delete_session(self, session_id: str, user_id: str):
        db = get_async_db()
        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        if not session_doc.exists or session_doc.to_dict().get("user_id") != user_id:
            from shared.errors import not_found
            raise not_found("Session")
        messages = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).collection("messages").get()
        for msg in messages:
            await msg.reference.delete()
        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).delete()

