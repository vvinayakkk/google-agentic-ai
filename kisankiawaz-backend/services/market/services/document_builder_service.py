"""
Document Builder Service for KisanKiAwaaz.
Interactive form-filling system that:
1. Takes a scheme → generates questions from form_fields
2. Asks farmer step-by-step
3. Validates answers
4. Generates filled application documents (PDF/HTML)
5. Supports document upload and extraction (OCR via Gemini)
"""

import uuid
import os
import json
import logging
import html
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from shared.core.constants import MongoCollections
from shared.errors import not_found, bad_request
from shared.services.api_key_allocator import get_api_key_allocator
from services.scheme_document_downloader import SchemeDocumentDownloader

logger = logging.getLogger(__name__)


class DocumentBuilderService:
    """Manages interactive document building workflow."""

    _SKIP_INPUT_TYPES = {
        "hidden",
        "submit",
        "button",
        "reset",
        "file",
        "image",
        "password",
    }

    _FIELD_ALIASES = {
        "farmer_name": {
            "full name",
            "farmer name",
            "name of farmer",
            "applicant name",
            "beneficiary name",
        },
        "applicant_name": {
            "applicant name",
            "name of applicant",
            "beneficiary name",
        },
        "father_name": {
            "father name",
            "father mother husband name",
            "father husband name",
            "husband name",
        },
        "mobile_number": {
            "mobile number",
            "mobile no",
            "phone number",
            "contact number",
            "registered mobile",
        },
        "aadhaar_number": {
            "aadhaar",
            "aadhar",
            "aadhaar number",
            "aadhar number",
            "uid",
            "uidai",
        },
        "pan_number": {
            "pan",
            "pan number",
        },
        "bank_name": {
            "bank",
            "bank name",
            "preferred bank",
        },
        "bank_account_number": {
            "bank account number",
            "account number",
            "existing account number",
        },
        "bank_account_holder_name": {
            "account holder name",
            "name as per bank",
            "bank account holder name",
        },
        "ifsc_code": {
            "ifsc",
            "ifsc code",
            "bank ifsc",
        },
        "date_of_birth": {
            "date of birth",
            "dob",
            "birth date",
        },
        "gender": {
            "gender",
            "sex",
        },
        "address": {
            "address",
            "residential address",
        },
        "state": {
            "state",
            "state name",
        },
        "district": {
            "district",
            "district name",
        },
        "sub_district": {
            "sub district",
            "sub-district",
            "taluka",
            "tehsil",
            "block",
        },
        "village": {
            "village",
            "village name",
        },
        "pin_code": {
            "pin code",
            "pincode",
            "postal code",
            "zip code",
        },
        "category": {
            "category",
            "caste category",
        },
        "land_area_acres": {
            "land area acres",
            "land area acre",
            "land size acres",
            "total land area",
            "area acres",
        },
        "land_area_hectares": {
            "land area hectares",
            "land area hectare",
            "area hectares",
            "area hectors",
        },
        "khasra_number": {
            "khasra number",
            "survey number",
            "land registration id",
        },
        "khatauni_number": {
            "khatauni number",
        },
        "crop_name": {
            "crop name",
            "name of crop",
        },
        "crop_grown": {
            "crop grown",
            "crops grown",
        },
        "irrigation_source": {
            "irrigation source",
            "irrigation type",
            "water source",
        },
    }

    @staticmethod
    def _clean_text(value: Any) -> str:
        if value is None:
            return ""
        text = str(value).strip()
        return text

    @staticmethod
    def _first_non_empty(*values: Any) -> str:
        for value in values:
            text = DocumentBuilderService._clean_text(value)
            if text:
                return text
        return ""

    @staticmethod
    def _compact_token(value: str) -> str:
        return re.sub(r"[^a-z0-9]", "", (value or "").lower())

    @staticmethod
    def _strip_html_tags(value: str) -> str:
        no_tags = re.sub(r"<[^>]+>", " ", value or "")
        return " ".join(html.unescape(no_tags).split())

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        try:
            if value is None or value == "":
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _format_number(value: float) -> str:
        if value.is_integer():
            return str(int(value))
        return f"{value:.4f}".rstrip("0").rstrip(".")

    @staticmethod
    def _build_profile_autofill_context(farmer_data: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, str]:
        context: Dict[str, str] = {}

        farmer_name = DocumentBuilderService._first_non_empty(
            farmer_data.get("name"),
            farmer_data.get("full_name"),
            user_data.get("name"),
            user_data.get("full_name"),
        )
        if farmer_name:
            context["farmer_name"] = farmer_name
            context["applicant_name"] = farmer_name
            context["beneficiary_name"] = farmer_name
            context["contact_person"] = farmer_name

        mobile = DocumentBuilderService._first_non_empty(
            farmer_data.get("phone"),
            farmer_data.get("mobile_number"),
            user_data.get("phone"),
        )
        if mobile:
            context["mobile_number"] = mobile

        alternate_mobile = DocumentBuilderService._first_non_empty(
            farmer_data.get("alternate_mobile_number"),
            farmer_data.get("alternate_phone"),
        )
        if alternate_mobile:
            context["alternate_mobile_number"] = alternate_mobile

        aadhaar = DocumentBuilderService._first_non_empty(
            farmer_data.get("aadhaar_number"),
            farmer_data.get("aadhar_number"),
        )
        if aadhaar:
            context["aadhaar_number"] = aadhaar

        pan = DocumentBuilderService._first_non_empty(farmer_data.get("pan_number"))
        if pan:
            context["pan_number"] = pan

        father_name = DocumentBuilderService._first_non_empty(
            farmer_data.get("father_name"),
            farmer_data.get("father_or_husband_name"),
            farmer_data.get("husband_name"),
        )
        if father_name:
            context["father_name"] = father_name

        dob = DocumentBuilderService._first_non_empty(
            farmer_data.get("date_of_birth"),
            farmer_data.get("dob"),
        )
        if dob:
            context["date_of_birth"] = dob

        gender = DocumentBuilderService._first_non_empty(farmer_data.get("gender"))
        if gender:
            context["gender"] = gender

        for key in (
            "state",
            "district",
            "village",
            "block",
            "sub_district",
            "pin_code",
            "address",
            "category",
            "soil_type",
            "khasra_number",
            "khatauni_number",
            "bank_name",
            "bank_account_number",
            "bank_account_holder_name",
        ):
            value = DocumentBuilderService._first_non_empty(farmer_data.get(key))
            if value:
                context[key] = value

        if "sub_district" not in context:
            sub_district = DocumentBuilderService._first_non_empty(
                farmer_data.get("tehsil"),
                farmer_data.get("taluka"),
            )
            if sub_district:
                context["sub_district"] = sub_district

        if "address" not in context:
            parts = [
                context.get("village", ""),
                context.get("sub_district", ""),
                context.get("district", ""),
                context.get("state", ""),
                context.get("pin_code", ""),
            ]
            address = ", ".join([p for p in parts if p])
            if address:
                context["address"] = address

        bank_ifsc = DocumentBuilderService._first_non_empty(
            farmer_data.get("ifsc_code"),
            farmer_data.get("bank_ifsc"),
        )
        if bank_ifsc:
            context["ifsc_code"] = bank_ifsc

        irrigation_source = DocumentBuilderService._first_non_empty(
            farmer_data.get("irrigation_source"),
            farmer_data.get("irrigation_type"),
        )
        if irrigation_source:
            context["irrigation_source"] = irrigation_source

        acres = DocumentBuilderService._to_float(
            DocumentBuilderService._first_non_empty(
                farmer_data.get("land_area_acres"),
                farmer_data.get("land_size_acres"),
            )
        )
        hectares = DocumentBuilderService._to_float(farmer_data.get("land_area_hectares"))

        if acres is not None:
            context["land_area_acres"] = DocumentBuilderService._format_number(acres)
            if hectares is None:
                hectares = acres * 0.40468564224

        if hectares is not None:
            context["land_area_hectares"] = DocumentBuilderService._format_number(hectares)

        if "bank_account_holder_name" not in context and "farmer_name" in context:
            context["bank_account_holder_name"] = context["farmer_name"]

        return context

    @staticmethod
    def _build_autofill_lookup(fields: Dict[str, Any], form_fields: Optional[List[dict]] = None) -> Dict[str, Tuple[str, str, int]]:
        lookup: Dict[str, Tuple[str, str, int]] = {}

        value_by_field: Dict[str, str] = {}
        for key, value in (fields or {}).items():
            if str(key).startswith("__meta_"):
                continue
            clean_value = DocumentBuilderService._clean_text(value)
            if clean_value:
                value_by_field[str(key)] = clean_value

        labels_by_field: Dict[str, List[str]] = {}
        for field_def in form_fields or []:
            field_name = str(field_def.get("field") or "").strip()
            if not field_name:
                continue
            labels = []
            for label_key in ("label", "hindi_label"):
                label_val = DocumentBuilderService._clean_text(field_def.get(label_key))
                if label_val:
                    labels.append(label_val)
            if labels:
                labels_by_field[field_name] = labels

        def register(alias: str, value: str, canonical_field: str, priority: int) -> None:
            token = DocumentBuilderService._compact_token(alias)
            if len(token) < 3:
                return
            existing = lookup.get(token)
            if existing is None or priority > existing[2]:
                lookup[token] = (value, canonical_field, priority)

        for field_name, value in value_by_field.items():
            register(field_name, value, field_name, 100)
            register(field_name.replace("_", " "), value, field_name, 95)

            for alias in DocumentBuilderService._FIELD_ALIASES.get(field_name, set()):
                register(alias, value, field_name, 90)

            for label in labels_by_field.get(field_name, []):
                register(label, value, field_name, 90)

        return lookup

    @staticmethod
    def _resolve_autofill_value(hints: List[str], lookup: Dict[str, Tuple[str, str, int]]) -> Tuple[str, str]:
        compact_hints = []
        seen = set()
        for hint in hints:
            token = DocumentBuilderService._compact_token(hint)
            if token and token not in seen:
                compact_hints.append(token)
                seen.add(token)

        for hint in compact_hints:
            if hint in lookup:
                value, canonical_field, _ = lookup[hint]
                return value, canonical_field

        lookup_keys = sorted(lookup.keys(), key=len, reverse=True)
        for hint in compact_hints:
            if len(hint) < 5:
                continue
            for key in lookup_keys:
                if len(key) < 5:
                    continue
                if key in hint or hint in key:
                    value, canonical_field, _ = lookup[key]
                    return value, canonical_field

        return "", ""

    @staticmethod
    def _parse_attrs(tag_html: str) -> Dict[str, str]:
        attrs: Dict[str, str] = {}
        pattern = re.compile(
            r"([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s\"'=<>()`]+)))?",
            flags=re.DOTALL,
        )
        for key, dq, sq, bare in pattern.findall(tag_html or ""):
            value = dq if dq != "" else sq if sq != "" else bare
            attrs[key.lower()] = html.unescape(value or "")
        return attrs

    @staticmethod
    def _set_attr(tag_html: str, attr_name: str, value: str) -> str:
        escaped = html.escape(value, quote=True)
        attr_rx = re.compile(
            rf"\s{re.escape(attr_name)}\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+)",
            flags=re.IGNORECASE,
        )
        if attr_rx.search(tag_html):
            return attr_rx.sub(f' {attr_name}="{escaped}"', tag_html, count=1)

        close = "/>" if tag_html.rstrip().endswith("/>") else ">"
        idx = tag_html.rfind(close)
        if idx == -1:
            return tag_html
        return f'{tag_html[:idx]} {attr_name}="{escaped}"{tag_html[idx:]}'

    @staticmethod
    def _set_boolean_attr(tag_html: str, attr_name: str, enabled: bool) -> str:
        cleaned = re.sub(
            rf"\s{re.escape(attr_name)}(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+))?",
            "",
            tag_html,
            flags=re.IGNORECASE,
        )
        if not enabled:
            return cleaned

        close = "/>" if cleaned.rstrip().endswith("/>") else ">"
        idx = cleaned.rfind(close)
        if idx == -1:
            return cleaned
        return f'{cleaned[:idx]} {attr_name}="{attr_name}"{cleaned[idx:]}'

    @staticmethod
    def _values_match(target: str, option: str) -> bool:
        target_token = DocumentBuilderService._compact_token(target)
        option_token = DocumentBuilderService._compact_token(option)
        if not target_token or not option_token:
            return False
        if target_token == option_token:
            return True
        if len(target_token) >= 5 and target_token in option_token:
            return True
        if len(option_token) >= 5 and option_token in target_token:
            return True
        return False

    @staticmethod
    def _coerce_for_input_type(value: str, input_type: str) -> str:
        clean = DocumentBuilderService._clean_text(value)
        kind = (input_type or "").lower()

        if kind == "date" and clean:
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
                try:
                    parsed = datetime.strptime(clean, fmt)
                    return parsed.strftime("%Y-%m-%d")
                except ValueError:
                    continue

        return clean

    @staticmethod
    def _fill_select_control(select_html: str, target_value: str) -> Tuple[str, bool]:
        match = re.match(r"(<select\b[^>]*>)(.*?)(</select>)", select_html, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return select_html, False

        opening, body, closing = match.groups()
        option_rx = re.compile(r"(<option\b[^>]*>)(.*?)(</option>)", flags=re.IGNORECASE | re.DOTALL)
        option_matches = list(option_rx.finditer(body))
        if not option_matches:
            return select_html, False

        selected_index = -1
        for idx, option_match in enumerate(option_matches):
            option_open, option_inner, _ = option_match.groups()
            option_attrs = DocumentBuilderService._parse_attrs(option_open)
            option_value = option_attrs.get("value") or DocumentBuilderService._strip_html_tags(option_inner)
            if DocumentBuilderService._values_match(target_value, option_value):
                selected_index = idx
                break

        if selected_index == -1:
            return select_html, False

        rebuilt = []
        cursor = 0
        for idx, option_match in enumerate(option_matches):
            rebuilt.append(body[cursor:option_match.start()])
            option_open, option_inner, option_close = option_match.groups()
            option_open = DocumentBuilderService._set_boolean_attr(option_open, "selected", idx == selected_index)
            rebuilt.append(f"{option_open}{option_inner}{option_close}")
            cursor = option_match.end()
        rebuilt.append(body[cursor:])

        return f"{opening}{''.join(rebuilt)}{closing}", True

    @staticmethod
    def _extract_nearby_label(source_html: str, control_start: int) -> str:
        window = source_html[max(0, control_start - 360):control_start]
        label_matches = list(
            re.finditer(r"<label\b[^>]*>(.*?)</label>", window, flags=re.IGNORECASE | re.DOTALL)
        )
        if label_matches:
            return DocumentBuilderService._strip_html_tags(label_matches[-1].group(1))

        heading_matches = list(
            re.finditer(r"<h[1-6]\b[^>]*>(.*?)</h[1-6]>", window, flags=re.IGNORECASE | re.DOTALL)
        )
        if heading_matches:
            return DocumentBuilderService._strip_html_tags(heading_matches[-1].group(1))

        return ""

    @staticmethod
    def _fill_single_control(
        control_html: str,
        lookup: Dict[str, Tuple[str, str, int]],
        label_hint: str,
        option_hint: str,
    ) -> Tuple[str, str]:
        lower = control_html.lower().lstrip()

        if lower.startswith("<input"):
            attrs = DocumentBuilderService._parse_attrs(control_html)
            input_type = (attrs.get("type") or "text").lower()
            if input_type in DocumentBuilderService._SKIP_INPUT_TYPES:
                return control_html, ""

            hints = [
                attrs.get("name", ""),
                attrs.get("id", ""),
                attrs.get("placeholder", ""),
                attrs.get("aria-label", ""),
                attrs.get("title", ""),
                attrs.get("data-label", ""),
                attrs.get("data-field", ""),
                label_hint,
            ]
            target_value, canonical_field = DocumentBuilderService._resolve_autofill_value(hints, lookup)
            if not target_value:
                return control_html, ""

            if input_type in {"radio", "checkbox"}:
                option_candidates = [attrs.get("value", ""), option_hint]
                should_check = any(
                    DocumentBuilderService._values_match(target_value, candidate)
                    for candidate in option_candidates
                    if candidate
                )
                if not option_candidates or all(not x for x in option_candidates):
                    should_check = target_value.lower() in {"true", "yes", "1", "checked"}

                updated = DocumentBuilderService._set_boolean_attr(control_html, "checked", should_check)
                if should_check and updated != control_html:
                    return updated, canonical_field
                return updated, ""

            coerced = DocumentBuilderService._coerce_for_input_type(target_value, input_type)
            updated = DocumentBuilderService._set_attr(control_html, "value", coerced)
            if updated != control_html:
                return updated, canonical_field
            return control_html, ""

        if lower.startswith("<textarea"):
            attrs = DocumentBuilderService._parse_attrs(control_html)
            hints = [
                attrs.get("name", ""),
                attrs.get("id", ""),
                attrs.get("placeholder", ""),
                attrs.get("aria-label", ""),
                attrs.get("title", ""),
                attrs.get("data-label", ""),
                attrs.get("data-field", ""),
                label_hint,
            ]
            target_value, canonical_field = DocumentBuilderService._resolve_autofill_value(hints, lookup)
            if not target_value:
                return control_html, ""

            match = re.match(r"(<textarea\b[^>]*>)(.*?)(</textarea>)", control_html, flags=re.IGNORECASE | re.DOTALL)
            if not match:
                return control_html, ""
            opening, _, closing = match.groups()
            updated = f"{opening}{html.escape(target_value)}{closing}"
            if updated != control_html:
                return updated, canonical_field
            return control_html, ""

        if lower.startswith("<select"):
            attrs = DocumentBuilderService._parse_attrs(control_html)
            hints = [
                attrs.get("name", ""),
                attrs.get("id", ""),
                attrs.get("placeholder", ""),
                attrs.get("aria-label", ""),
                attrs.get("title", ""),
                attrs.get("data-label", ""),
                attrs.get("data-field", ""),
                label_hint,
            ]
            target_value, canonical_field = DocumentBuilderService._resolve_autofill_value(hints, lookup)
            if not target_value:
                return control_html, ""

            updated, changed = DocumentBuilderService._fill_select_control(control_html, target_value)
            if changed:
                return updated, canonical_field
            return control_html, ""

        return control_html, ""

    @staticmethod
    def _fill_html_controls(
        html_source: str,
        fields: Dict[str, Any],
        form_fields: Optional[List[dict]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        lookup = DocumentBuilderService._build_autofill_lookup(fields, form_fields=form_fields)
        if not lookup:
            return html_source, {
                "filled_controls": 0,
                "matched_fields": [],
                "matched_fields_count": 0,
            }

        control_rx = re.compile(
            r"<input\b[^>]*>|<textarea\b[^>]*>.*?</textarea>|<select\b[^>]*>.*?</select>",
            flags=re.IGNORECASE | re.DOTALL,
        )

        matched_fields = set()
        filled_controls = 0

        def replace_control(match: re.Match) -> str:
            nonlocal filled_controls
            control_html = match.group(0)
            start = match.start()
            end = match.end()
            label_hint = DocumentBuilderService._extract_nearby_label(html_source, start)

            lookahead = html_source[end:end + 100]
            option_hint_match = re.match(r"\s*([^<]{1,80})", lookahead)
            option_hint = option_hint_match.group(1).strip() if option_hint_match else ""

            updated, used_field = DocumentBuilderService._fill_single_control(
                control_html=control_html,
                lookup=lookup,
                label_hint=label_hint,
                option_hint=option_hint,
            )
            if used_field:
                filled_controls += 1
                matched_fields.add(used_field)
            return updated

        filled_html = control_rx.sub(replace_control, html_source)
        return filled_html, {
            "filled_controls": filled_controls,
            "matched_fields": sorted(matched_fields),
            "matched_fields_count": len(matched_fields),
        }

    @staticmethod
    def _score_scheme_html_document(doc: Dict[str, Any]) -> int:
        filename = DocumentBuilderService._clean_text(doc.get("filename"))
        name = DocumentBuilderService._clean_text(doc.get("name"))
        source = DocumentBuilderService._clean_text(doc.get("source"))
        blob = f"{filename} {name}".lower()

        score = 0
        if doc.get("is_form_candidate"):
            score += 5
        if source == "scheme_catalog":
            score += 2
        if source == "application_page_discovery":
            score += 1
        if any(k in blob for k in ("form", "apply", "application", "registration", "claim", "beneficiary", "enrol")):
            score += 4
        if any(k in blob for k in ("guideline", "manual", "faq", "notfound", "privacy", "dashboard", "user-manual")):
            score -= 3

        return score

    @staticmethod
    def _generate_prefilled_official_html(
        scheme_name: str,
        scheme_short_name: str,
        fields: Dict[str, Any],
        form_fields: Optional[List[dict]] = None,
        preferred_document_name: str = "",
    ) -> Tuple[Optional[str], Dict[str, Any]]:
        downloader = SchemeDocumentDownloader()

        docs: List[Dict[str, Any]] = []
        for key in [scheme_short_name, scheme_name]:
            clean_key = DocumentBuilderService._clean_text(key)
            if not clean_key:
                continue
            docs.extend(downloader.get_scheme_documents(clean_key))

        dedup = {}
        for doc in docs:
            path = DocumentBuilderService._clean_text(doc.get("local_path"))
            if not path:
                continue
            if path not in dedup:
                dedup[path] = doc

        preferred_blob = DocumentBuilderService._clean_text(preferred_document_name).lower()

        html_candidates = []
        for path, doc in dedup.items():
            if not os.path.exists(path):
                continue
            filename = DocumentBuilderService._clean_text(doc.get("filename") or os.path.basename(path)).lower()
            display_name = DocumentBuilderService._clean_text(doc.get("name") or "").lower()
            content_type = DocumentBuilderService._clean_text(doc.get("content_type")).lower()
            ext = os.path.splitext(filename)[1]
            if ext not in {".html", ".htm", ".aspx", ".jsp", ".php", ".do"} and "html" not in content_type:
                continue
            doc_score = DocumentBuilderService._score_scheme_html_document(doc)
            preferred_hit = bool(preferred_blob) and (
                preferred_blob == filename
                or preferred_blob in filename
                or preferred_blob == display_name
                or preferred_blob in display_name
                or preferred_blob == os.path.basename(path).lower()
            )
            if preferred_hit:
                # Strongly prefer the exact form the user tapped in the app.
                doc_score += 1000
            html_candidates.append((doc_score, path, doc, preferred_hit))

        html_candidates.sort(key=lambda item: item[0], reverse=True)

        best_result = None
        best_rank = (-1, -1, -999)
        for score, path, doc, preferred_hit in html_candidates:
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as fp:
                    source_html = fp.read()
            except Exception:
                continue

            low = source_html.lower()
            if "<input" not in low and "<select" not in low and "<textarea" not in low:
                continue

            filled_html, stats = DocumentBuilderService._fill_html_controls(
                html_source=source_html,
                fields=fields,
                form_fields=form_fields,
            )

            rank = (
                int(stats.get("filled_controls", 0)),
                int(stats.get("matched_fields_count", 0)),
                score,
            )
            if rank > best_rank:
                best_rank = rank
                best_result = {
                    "html": filled_html,
                    "stats": stats,
                    "source_path": path,
                    "source_name": doc.get("filename") or os.path.basename(path),
                    "source_score": score,
                    "preferred_hit": preferred_hit,
                }

        if not best_result:
            return None, {}

        filled_controls = int(best_result["stats"].get("filled_controls", 0))
        matched_fields_count = int(best_result["stats"].get("matched_fields_count", 0))
        if filled_controls <= 0:
            return None, {}

        # Avoid replacing helper sheet with a weak one-field hit on generic pages.
        if not best_result.get("preferred_hit") and filled_controls < 2 and matched_fields_count < 2:
            return None, {}

        meta = {
            "mode": "official_prefilled",
            "source_document": best_result["source_name"],
            "source_path": best_result["source_path"],
            "filled_controls": filled_controls,
            "matched_fields": best_result["stats"].get("matched_fields", []),
        }
        return best_result["html"], meta

    # ── Start a Document Builder Session ─────────────────────────

    @staticmethod
    async def start_session(
        db,
        farmer_id: str,
        scheme_id: str = None,
        scheme_name: str = None,
        preferred_format: str = "html",
    ) -> dict:
        """
        Start a new document builder session.
        Returns session_id + first batch of questions.
        """
        from services.government_schemes_data import get_scheme_by_name, ALL_SCHEMES

        # Find the scheme
        scheme = None
        if scheme_id:
            doc = await db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(scheme_id).get()
            if doc.exists:
                scheme = doc.to_dict()
                scheme["id"] = doc.id
        
        if not scheme and scheme_name:
            scheme = get_scheme_by_name(scheme_name)
        
        if not scheme:
            raise bad_request("Scheme not found. Please provide a valid scheme_id or scheme_name.")

        # Get farmer profile if available
        farmer_data = {}
        user_data = {}
        try:
            from shared.db.mongodb import FieldFilter
            profile_query = (
                db.collection(MongoCollections.FARMER_PROFILES)
                .where(filter=FieldFilter("user_id", "==", farmer_id))
                .limit(1)
            )
            profiles = [d async for d in profile_query.stream()]
            if profiles:
                farmer_data = profiles[0].to_dict()
        except Exception as e:
            logger.warning(f"Could not fetch farmer profile: {e}")

        # User profile has canonical name/phone in the users collection.
        try:
            user_doc = await db.collection(MongoCollections.USERS).document(farmer_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict() or {}
        except Exception as e:
            logger.warning(f"Could not fetch base user document for autofill: {e}")

        # Get form fields from scheme
        form_fields = scheme.get("form_fields", [])
        if not form_fields:
            # Generate basic fields
            form_fields = [
                {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
                {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
                {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
                {"field": "address", "label": "Address", "type": "textarea", "required": True, "hindi_label": "पता"},
                {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
                {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            ]

        # Build broad profile context, then pre-fill only current form fields.
        autofill_context = DocumentBuilderService._build_profile_autofill_context(farmer_data, user_data)
        profile_lookup = DocumentBuilderService._build_autofill_lookup(
            autofill_context,
            form_fields=form_fields,
        )

        pre_filled = {}
        for ff in form_fields:
            field_name = ff.get("field")
            if not field_name:
                continue
            value, _ = DocumentBuilderService._resolve_autofill_value(
                [
                    str(field_name),
                    str(ff.get("label") or ""),
                    str(ff.get("hindi_label") or ""),
                ],
                profile_lookup,
            )
            if value:
                pre_filled[field_name] = value

        # Determine which fields are already filled and which need questions
        missing_fields = []
        for ff in form_fields:
            field_name = ff["field"]
            if field_name not in pre_filled or not pre_filled[field_name]:
                missing_fields.append(ff)

        # Generate first batch of questions (max 5 at a time)
        questions = []
        for ff in missing_fields[:5]:
            q = {
                "field": ff["field"],
                "question": f"Please provide your {ff['label']}",
                "question_hindi": f"कृपया अपना {ff.get('hindi_label', ff['label'])} बताएं",
                "type": ff.get("type", "text"),
                "required": ff.get("required", True),
            }
            if ff.get("options"):
                q["options"] = ff["options"]
            questions.append(q)

        # Create session in MongoCollections
        session_id = uuid.uuid4().hex
        session_data = {
            "session_id": session_id,
            "farmer_id": farmer_id,
            "scheme_name": scheme.get("name", scheme_name or ""),
            "scheme_short_name": scheme.get("short_name", ""),
            "scheme_category": scheme.get("category", ""),
            "application_url": scheme.get("application_url", ""),
            "form_download_urls": scheme.get("form_download_urls", []),
            "preferred_format": (preferred_format or "html").lower(),
            "form_fields": form_fields,
            "filled_fields": pre_filled,
            "autofill_context": autofill_context,
            "required_documents": scheme.get("required_documents", []),
            "uploaded_documents": [],
            "status": "in_progress",
            "questions_asked": [q["field"] for q in questions],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.collection("document_builder_sessions").document(session_id).set(session_data)

        return {
            "session_id": session_id,
            "scheme_name": scheme.get("name", ""),
            "scheme_description": scheme.get("description", ""),
            "pre_filled_fields": pre_filled,
            "questions": questions,
            "total_fields": len(form_fields),
            "filled_count": len(pre_filled),
            "remaining_count": len(missing_fields),
            "required_documents": scheme.get("required_documents", []),
            "form_download_urls": scheme.get("form_download_urls", []),
            "preferred_format": (preferred_format or "html").lower(),
        }

    # ── Submit Answers & Get Next Questions ──────────────────────

    @staticmethod
    async def submit_answers(db, session_id: str, answers: Dict[str, Any]) -> dict:
        """
        Submit answers for current batch, get next batch or mark complete.
        """
        session_ref = db.collection("document_builder_sessions").document(session_id)
        session_doc = await session_ref.get()
        
        if not session_doc.exists:
            raise not_found("Document builder session not found")
        
        session = session_doc.to_dict()
        
        # Validate and store answers
        form_fields = session.get("form_fields", [])
        filled = session.get("filled_fields", {})
        
        for field_name, value in answers.items():
            # Find field definition
            field_def = next((f for f in form_fields if f["field"] == field_name), None)
            
            if field_def:
                # Validate based on type
                if field_def.get("type") == "number":
                    try:
                        value = float(value) if value else 0
                    except (ValueError, TypeError):
                        pass
                
                if field_def.get("type") == "select" and field_def.get("options"):
                    if value not in field_def["options"] and value:
                        # Try case-insensitive match
                        matched = [o for o in field_def["options"] if o.lower() == str(value).lower()]
                        if matched:
                            value = matched[0]
                
                filled[field_name] = str(value) if value is not None else ""
        
        # Check what's still missing
        missing_fields = []
        for ff in form_fields:
            if ff["field"] not in filled or not filled[ff["field"]]:
                if ff.get("required", True):
                    missing_fields.append(ff)
        
        # Generate next batch of questions
        asked = set(session.get("questions_asked", []))
        next_questions = []
        for ff in missing_fields:
            if ff["field"] not in asked:
                q = {
                    "field": ff["field"],
                    "question": f"Please provide your {ff['label']}",
                    "question_hindi": f"कृपया अपना {ff.get('hindi_label', ff['label'])} बताएं",
                    "type": ff.get("type", "text"),
                    "required": ff.get("required", True),
                }
                if ff.get("options"):
                    q["options"] = ff["options"]
                next_questions.append(q)
                asked.add(ff["field"])
                
                if len(next_questions) >= 5:
                    break
        
        document_ready = len(missing_fields) == 0
        document_url = None
        
        if document_ready:
            # Generate the document
            doc_result = await DocumentBuilderService._generate_document(
                session_id=session_id,
                scheme_name=session.get("scheme_name", ""),
                filled_fields=filled,
                scheme_short_name=session.get("scheme_short_name", ""),
                application_url=session.get("application_url", ""),
                form_download_urls=session.get("form_download_urls", []),
                form_fields=session.get("form_fields", []),
                autofill_context=session.get("autofill_context", {}),
                preferred_format=session.get("preferred_format", "html"),
            )
            document_url = doc_result.get("download_url", "")
            document_html = doc_result.get("document_html", "")
            session_status = "completed"
        else:
            session_status = "in_progress"
            document_html = ""
        
        # Update session
        payload = {
            "filled_fields": filled,
            "questions_asked": list(asked),
            "status": session_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if document_ready:
            payload.update(
                {
                    "document_url": document_url,
                    "document_html": document_html,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
            )

        await session_ref.update(payload)
        
        return {
            "session_id": session_id,
            "questions": next_questions,
            "all_fields": filled,
            "total_fields": len(form_fields),
            "filled_count": len([f for f in form_fields if f["field"] in filled and filled[f["field"]]]),
            "remaining_count": len(missing_fields),
            "document_ready": document_ready,
            "document_url": document_url,
            "document_html": document_html,
            "status": session_status,
        }

    # ── Upload and Extract Document ──────────────────────────────

    @staticmethod
    async def extract_from_document(
        db, session_id: str, file_content: bytes, filename: str
    ) -> dict:
        """
        Process an uploaded document (PDF/image) and extract fields using
        LangExtract (primary) with Gemini OCR fallback.
        """
        session_ref = db.collection("document_builder_sessions").document(session_id)
        session_doc = await session_ref.get()
        
        if not session_doc.exists:
            raise not_found("Document builder session not found")
        
        session = session_doc.to_dict()
        form_fields = session.get("form_fields", [])
        field_names = [f["field"] for f in form_fields]
        
        # Save uploaded file
        upload_dir = "/tmp/doc_uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{session_id}_{filename}")
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        extracted_fields = {}
        extraction_method = "none"
        
        # ── PRIMARY: Try LangExtract ──────────────────────────
        try:
            from services.langextract_service import extract_from_file, detect_document_type
            
            # Detect document type from filename / content
            ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
            
            # Read a sample for type detection
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f_sample:
                    sample_text = f_sample.read(5000)
                doc_type = detect_document_type(sample_text)
            except Exception:
                doc_type = "auto"
            
            langextract_result = extract_from_file(
                file_path=file_path,
                target_fields=field_names,
                document_type=doc_type,
            )
            
            if langextract_result.get("fields"):
                extracted_fields = langextract_result["fields"]
                extraction_method = "langextract"
                logger.info(
                    f"LangExtract extracted {len(extracted_fields)} fields "
                    f"from {filename} (type={doc_type})"
                )
        except ImportError:
            logger.warning("langextract not available, falling back to Gemini OCR")
        except Exception as e:
            logger.warning(f"LangExtract failed: {e}, falling back to Gemini OCR")
        
        # ── FALLBACK: Gemini multimodal OCR ───────────────────
        if not extracted_fields:
            try:
                import google.generativeai as genai
                from shared.core.config import get_settings
                
                settings = get_settings()
                allocator = get_api_key_allocator()
                lease = None
                selected_key = settings.GEMINI_API_KEY
                if allocator.has_provider("gemini"):
                    lease = allocator.acquire("gemini")
                    selected_key = lease.key
                if not selected_key:
                    raise ValueError("Gemini API key is not configured")

                genai.configure(api_key=selected_key)
                
                model = genai.GenerativeModel("gemini-2.5-flash")
                
                ext = filename.lower().split(".")[-1]
                
                if ext in ["jpg", "jpeg", "png", "bmp", "webp"]:
                    import base64
                    b64_content = base64.b64encode(file_content).decode()
                    mime_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
                    
                    prompt = f"""Extract the following fields from this document image. Return ONLY a valid JSON object.
Fields to extract: {json.dumps(field_names)}

For each field you find, include it in the JSON. If a field is not visible, omit it.
Example format: {{"farmer_name": "Ram Kumar", "aadhaar_number": "1234-5678-9012"}}

IMPORTANT: Return ONLY the JSON, no markdown, no explanation."""

                    response = model.generate_content([
                        {"mime_type": mime_type, "data": b64_content},
                        prompt
                    ])
                    
                elif ext == "pdf":
                    prompt = f"""Analyze this document and extract the following fields. Return ONLY a valid JSON object.
Fields to extract: {json.dumps(field_names)}

Document content (as text):
{file_content[:10000].decode('utf-8', errors='ignore')}

For each field you find, include it in the JSON. If a field is not found, omit it.
Return ONLY the JSON, no markdown, no explanation."""

                    response = model.generate_content(prompt)
                else:
                    return {"extracted_fields": {}, "message": f"Unsupported file type: {ext}"}
                
                response_text = response.text.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                
                extracted_fields = json.loads(response_text)
                extraction_method = "gemini_ocr"
                if lease:
                    allocator.report_success(lease)
                
            except Exception as e:
                if "lease" in locals() and lease is not None:
                    err_str = str(e).lower()
                    if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                        allocator.report_rate_limited(lease, str(e))
                    else:
                        allocator.report_error(lease, str(e))
                logger.error(f"Gemini OCR extraction also failed: {e}")
                return {
                    "extracted_fields": {},
                    "message": f"Could not extract fields from document: {str(e)}",
                    "file_saved": file_path,
                    "extraction_method": "failed",
                }
        
        # Merge extracted fields with existing
        filled = session.get("filled_fields", {})
        newly_filled = {}
        for key, val in extracted_fields.items():
            if key in field_names and val and str(val).strip():
                if key not in filled or not filled[key]:
                    filled[key] = str(val)
                    newly_filled[key] = str(val)
        
        # Update session
        uploaded_docs = session.get("uploaded_documents", [])
        uploaded_docs.append({
            "filename": filename,
            "path": file_path,
            "extracted_fields": list(newly_filled.keys()),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        })
        
        await session_ref.update({
            "filled_fields": filled,
            "uploaded_documents": uploaded_docs,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {
            "extracted_fields": newly_filled,
            "total_extracted": len(newly_filled),
            "all_fields": filled,
            "message": f"Extracted {len(newly_filled)} fields from {filename}",
            "extraction_method": extraction_method,
        }

    # ── Get Session Status ───────────────────────────────────────

    @staticmethod
    async def get_session(db, session_id: str) -> dict:
        """Get document builder session details."""
        doc = await db.collection("document_builder_sessions").document(session_id).get()
        if not doc.exists:
            raise not_found("Session not found")
        result = doc.to_dict()
        result["id"] = doc.id
        return result

    @staticmethod
    async def generate_document(
        db,
        session_id: str,
        preferred_format: str = "html",
        preferred_document_name: str = "",
    ) -> dict:
        """Generate (or regenerate) a document for a session and persist references."""
        session_ref = db.collection("document_builder_sessions").document(session_id)
        session_doc = await session_ref.get()

        if not session_doc.exists:
            raise not_found("Session not found")

        session = session_doc.to_dict()
        doc_result = await DocumentBuilderService._generate_document(
            session_id=session_id,
            scheme_name=session.get("scheme_name", ""),
            filled_fields=session.get("filled_fields", {}),
            scheme_short_name=session.get("scheme_short_name", ""),
            application_url=session.get("application_url", ""),
            form_download_urls=session.get("form_download_urls", []),
            form_fields=session.get("form_fields", []),
            autofill_context=session.get("autofill_context", {}),
            preferred_format=(preferred_format or session.get("preferred_format") or "html"),
            preferred_document_name=(preferred_document_name or "").strip(),
        )

        await session_ref.update(
            {
                "status": "completed",
                "preferred_format": (preferred_format or "html").lower(),
                "document_url": doc_result.get("download_url", ""),
                "document_html": doc_result.get("document_html", ""),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        return {
            "session_id": session_id,
            "scheme_name": session.get("scheme_name", ""),
            "document_url": doc_result.get("download_url", ""),
            "document_html": doc_result.get("document_html", ""),
            "format": doc_result.get("format", "html"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── List Farmer's Sessions ───────────────────────────────────

    @staticmethod
    async def list_sessions(db, farmer_id: str, status: str = None) -> dict:
        """List all document builder sessions for a farmer."""
        from shared.db.mongodb import FieldFilter
        
        query = db.collection("document_builder_sessions").where(
            filter=FieldFilter("farmer_id", "==", farmer_id)
        )
        
        if status:
            query = query.where(filter=FieldFilter("status", "==", status))
        
        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            # Return summary only
            items.append({
                "session_id": item.get("session_id"),
                "scheme_name": item.get("scheme_name"),
                "status": item.get("status"),
                "filled_count": len(item.get("filled_fields", {})),
                "total_fields": len(item.get("form_fields", [])),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
            })
        
        items.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return {"sessions": items, "count": len(items)}

    # ── Generate Document (Internal) ─────────────────────────────

    @staticmethod
    async def _generate_document(
        session_id: str,
        scheme_name: str,
        filled_fields: dict,
        scheme_short_name: str = "",
        application_url: str = "",
        form_download_urls: list | None = None,
        form_fields: list | None = None,
        autofill_context: dict | None = None,
        preferred_format: str = "html",
        preferred_document_name: str = "",
    ) -> dict:
        """Generate a prefilled official HTML form when possible; fallback to assist sheet."""
        output_dir = "/tmp/generated_documents"
        os.makedirs(output_dir, exist_ok=True)

        combined_fields = dict(autofill_context or {})
        combined_fields.update(filled_fields or {})

        html_content = None
        mode = "assist_sheet"
        source_document = ""
        matched_fields = []

        official_html, official_meta = DocumentBuilderService._generate_prefilled_official_html(
            scheme_name=scheme_name,
            scheme_short_name=scheme_short_name,
            fields=combined_fields,
            form_fields=form_fields or [],
            preferred_document_name=(preferred_document_name or "").strip(),
        )
        if official_html:
            html_content = official_html
            mode = official_meta.get("mode", "official_prefilled")
            source_document = official_meta.get("source_document", "")
            matched_fields = official_meta.get("matched_fields", [])
        else:
            # Fallback helper sheet if we cannot fill a downloaded HTML document.
            html_content = DocumentBuilderService._generate_html(
                session_id=session_id,
                scheme_name=scheme_name,
                fields=combined_fields,
                application_url=application_url,
                form_download_urls=form_download_urls or [],
            )
        
        filename = f"application_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.html"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        return {
            "filename": filename,
            "filepath": filepath,
            "format": (preferred_format or "html").lower(),
            "document_html": html_content,
            "download_url": f"/api/v1/market/document-builder/sessions/{session_id}/download",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "mode": mode,
            "source_document": source_document,
            "matched_fields": matched_fields,
        }

    @staticmethod
    def _generate_html(
        session_id: str,
        scheme_name: str,
        fields: dict,
        application_url: str = "",
        form_download_urls: list | None = None,
    ) -> str:
        """Generate filled HTML helper sheet for official-form submission."""
        def _coerce_form_links(raw_links: list | None) -> List[dict]:
            out: List[dict] = []
            for item in raw_links or []:
                if isinstance(item, dict):
                    url = str(item.get("url") or item.get("link") or "").strip()
                    if not url:
                        continue
                    name = str(item.get("name") or item.get("title") or "Official Form").strip() or "Official Form"
                    out.append({"name": name, "url": url})
                elif isinstance(item, str):
                    url = item.strip()
                    if url:
                        out.append({"name": "Official Form", "url": url})
            return out

        app_url = str(application_url or "").strip()
        links_input = form_download_urls or []

        rows = ""
        for key, value in fields.items():
            if str(key).startswith("__meta_"):
                continue
            label = html.escape(key.replace("_", " ").title())
            safe_val = html.escape(str(value))
            rows += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 40%; background: #f9f9f9;">{label}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{safe_val}</td>
            </tr>"""

        links_html = ""
        normalized_links = _coerce_form_links(links_input)
        for item in normalized_links:
            name = html.escape(item["name"])
            url = html.escape(item["url"])
            links_html += f'<li style="margin-bottom: 6px;"><a href="{url}" target="_blank" rel="noopener noreferrer">{name}</a><br/><span style="font-size: 12px; color: #4b5563;">{url}</span></li>'

        if not links_html:
            links_html = "<li>No official downloadable form URLs are mapped yet for this scheme.</li>"

        escaped_scheme = html.escape(scheme_name)
        escaped_app_url = html.escape(app_url)
        app_portal_html = (
            f'<p><a href="{escaped_app_url}" target="_blank" rel="noopener noreferrer">{escaped_app_url}</a></p>'
            if escaped_app_url
            else "<p>Application portal URL is not mapped yet.</p>"
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Official Form Assist Sheet - {escaped_scheme}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }}
        .header {{ border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }}
        .header h1 {{ color: #0f766e; font-size: 20px; margin: 8px 0 5px; }}
        .header h2 {{ color: #111827; font-size: 16px; margin: 5px 0; font-weight: 600; }}
        .hint {{ color: #4b5563; font-size: 13px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .section-title {{ background: #0f766e; color: white; padding: 10px; font-size: 16px; font-weight: bold; margin-top: 20px; }}
        .footer {{ margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }}
        @media print {{ body {{ margin: 0; padding: 15px; }} .no-print {{ display: none; }} }}
    </style>
</head>
<body>
    <div class="no-print" style="background: #ecfeff; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
        <button onclick="window.print()" style="background: #0f766e; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 5px;">Print / Save</button>
        <span style="margin-left: 10px;">Official Form Assist Sheet</span>
    </div>
    
    <div class="header">
        <h1>Official Form Assist Sheet</h1>
        <h2>{escaped_scheme}</h2>
        <p class="hint">Use the links below to open/download the official government application form. This sheet is a helper for pre-filled values only.</p>
        <p style="color: #666; font-size: 12px;">Session ID: {session_id}</p>
        <p style="color: #666; font-size: 12px;">Date: {datetime.now().strftime('%d/%m/%Y')}</p>
    </div>

    <div class="section-title">Official Application Portal</div>
    {app_portal_html}

    <div class="section-title">Official Form Links</div>
    <ul>
        {links_html}
    </ul>

    <div class="section-title">Pre-Filled Data (Copy Into Official Form)</div>
    <table>
        {rows}
    </table>

    <div class="footer" style="font-size: 11px; color: #666;">
        <p><strong>Important:</strong> This is not an official government form. Submit only via official portal/form links above.</p>
        <p>Generated by KisanKiAwaaz Document Builder Assistant.</p>
    </div>
</body>
</html>"""

    # ── Download Generated Document ──────────────────────────────

    @staticmethod
    async def get_document_file(db, session_id: str) -> dict:
        """Get the generated document file path for download."""
        output_dir = "/tmp/generated_documents"
        
        # Check if file exists
        for fname in os.listdir(output_dir) if os.path.exists(output_dir) else []:
            if session_id[:8] in fname:
                return {
                    "filepath": os.path.join(output_dir, fname),
                    "filename": fname,
                    "exists": True,
                }
        
        # Try to regenerate
        session_doc = await db.collection("document_builder_sessions").document(session_id).get()
        if not session_doc.exists:
            raise not_found("Session not found")
        
        session = session_doc.to_dict()
        result = await DocumentBuilderService._generate_document(
            session_id=session_id,
            scheme_name=session.get("scheme_name", ""),
            filled_fields=session.get("filled_fields", {}) or {},
            scheme_short_name=session.get("scheme_short_name", ""),
            application_url=session.get("application_url", ""),
            form_download_urls=session.get("form_download_urls", []),
            form_fields=session.get("form_fields", []),
            autofill_context=session.get("autofill_context", {}),
            preferred_format=session.get("preferred_format", "html"),
        )
        
        return {
            "filepath": result["filepath"],
            "filename": result["filename"],
            "exists": True,
        }

