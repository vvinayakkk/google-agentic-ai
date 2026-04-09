from __future__ import annotations

import asyncio
from collections import Counter
from urllib.parse import urlparse

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_async_db

FILLABLE_KEYWORDS = [
    "form",
    "application",
    "declaration",
    "affidavit",
    "proposal",
    "project report",
    "dpr",
    "undertaking",
    "registration",
]

NON_FILLABLE_SUPPORTING_KEYWORDS = [
    "aadhaar",
    "pan card",
    "voter id",
    "land record",
    "land records",
    "khatauni",
    "khasra",
    "porcha",
    "pattadar",
    "passbook",
    "photo identity",
    "passport-size",
    "mobile number",
    "bank account details",
    "certificate",
    "pm-kisan registration",
    "fisher id",
    "rtc",
    "kisan id",
    "bpl card",
    "gst registration",
    "member list",
]


def norm(value: object) -> str:
    return " ".join(str(value).split()).strip()


def is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return parsed.scheme in {"http", "https"}
    except Exception:
        return False


def classify_doc(doc: str) -> str:
    text = norm(doc).lower()
    if any(k in text for k in FILLABLE_KEYWORDS):
        return "fillable"
    if any(k in text for k in NON_FILLABLE_SUPPORTING_KEYWORDS):
        return "supporting"
    return "other"


async def main() -> None:
    db = get_async_db()
    snapshots = [
        s async for s in db.collection(MongoCollections.GOVERNMENT_SCHEMES).stream()
    ]

    supporting_union = Counter()
    fillable_union = Counter()
    other_union = Counter()

    fillable_by_scheme: list[dict] = []

    for snap in snapshots:
        data = snap.to_dict() or {}
        sid = snap.id
        sname = norm(data.get("short_name") or data.get("name") or sid)

        links: list[str] = []
        app = norm(data.get("application_url") or "")
        if app and is_valid_url(app):
            links.append(app)

        for item in data.get("form_download_urls") or []:
            if isinstance(item, str):
                url = norm(item)
            elif isinstance(item, dict):
                url = norm(item.get("url") or item.get("link") or "")
            else:
                url = ""
            if url and is_valid_url(url):
                links.append(url)

        links = list(dict.fromkeys(links))

        fillable_docs_for_scheme: list[str] = []
        for doc in data.get("required_documents") or []:
            label = norm(doc)
            if not label:
                continue
            category = classify_doc(label)
            if category == "fillable":
                fillable_union[label] += 1
                fillable_docs_for_scheme.append(label)
            elif category == "supporting":
                supporting_union[label] += 1
            else:
                other_union[label] += 1

        if fillable_docs_for_scheme:
            fillable_by_scheme.append(
                {
                    "id": sid,
                    "scheme": sname,
                    "fillable_docs": sorted(
                        set(fillable_docs_for_scheme), key=str.lower
                    ),
                    "links": links,
                }
            )

    fillable_by_scheme.sort(key=lambda x: x["scheme"].lower())

    lines: list[str] = []
    lines.append("# Filtered Fillable Official Formats From DB Schemes")
    lines.append("")
    lines.append("## Classification Summary")
    lines.append(f"- Total schemes inspected: {len(snapshots)}")
    lines.append(f"- Non-fillable supporting docs (union): {len(supporting_union)}")
    lines.append(f"- Fillable docs (union): {len(fillable_union)}")
    lines.append(f"- Unclassified/other docs (union): {len(other_union)}")
    lines.append(f"- Schemes with at least one fillable doc: {len(fillable_by_scheme)}")
    lines.append("")

    lines.append("## Removed Non-Fillable Supporting Docs (Union)")
    for i, (doc, count) in enumerate(
        sorted(supporting_union.items(), key=lambda x: x[0].lower()), start=1
    ):
        lines.append(f"{i}. {doc} (in {count} schemes)")
    lines.append("")

    lines.append("## Fillable Docs With Official Links (Scheme-Wise)")
    for entry in fillable_by_scheme:
        lines.append(f"### {entry['scheme']} ({entry['id']})")
        lines.append("- Fillable required docs:")
        for doc in entry["fillable_docs"]:
            lines.append(f"  - {doc}")
        lines.append("- Official links:")
        if entry["links"]:
            for url in entry["links"]:
                lines.append(f"  - {url}")
        else:
            lines.append("  - No official link present in DB record")
        lines.append("")

    lines.append("## Fillable Docs Union (Deduplicated)")
    for i, (doc, count) in enumerate(
        sorted(fillable_union.items(), key=lambda x: x[0].lower()), start=1
    ):
        lines.append(f"{i}. {doc} (in {count} schemes)")

    print("\n".join(lines))


if __name__ == "__main__":
    asyncio.run(main())
