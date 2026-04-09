from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
from typing import Any
from urllib.parse import urlparse

import httpx

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_async_db

BASE_DIR = "/scheme_documents/fillable_official"
MANIFEST_NAME = "fillable_manifest.json"

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


def safe_name(value: str, fallback: str = "file") -> str:
    text = norm(value).lower()
    text = re.sub(r"[^a-z0-9._-]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text or fallback


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


def ext_from_response(final_url: str, content_type: str) -> str:
    path = urlparse(final_url).path
    low_ct = (content_type or "").lower()
    _, ext = os.path.splitext(path)
    if ext and len(ext) <= 8:
        return ext.lower()
    if "pdf" in low_ct:
        return ".pdf"
    if "wordprocessingml" in low_ct:
        return ".docx"
    if "msword" in low_ct:
        return ".doc"
    if "spreadsheet" in low_ct or "excel" in low_ct:
        return ".xlsx"
    if "html" in low_ct:
        return ".html"
    if "json" in low_ct:
        return ".json"
    if "xml" in low_ct:
        return ".xml"
    return ".bin"


async def collect_fillable_scheme_links() -> list[dict[str, Any]]:
    db = get_async_db()
    snapshots = [
        s async for s in db.collection(MongoCollections.GOVERNMENT_SCHEMES).stream()
    ]

    out: list[dict[str, Any]] = []
    for snap in snapshots:
        data = snap.to_dict() or {}
        scheme_id = snap.id
        scheme_name = norm(data.get("short_name") or data.get("name") or scheme_id)

        fillable_docs: list[str] = []
        for item in data.get("required_documents") or []:
            label = norm(item)
            if not label:
                continue
            if classify_doc(label) == "fillable":
                fillable_docs.append(label)

        fillable_docs = sorted(set(fillable_docs), key=str.lower)
        if not fillable_docs:
            continue

        links: list[str] = []
        app_url = norm(data.get("application_url") or "")
        if app_url and is_valid_url(app_url):
            links.append(app_url)

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
        out.append(
            {
                "scheme_id": scheme_id,
                "scheme_name": scheme_name,
                "fillable_docs": fillable_docs,
                "links": links,
            }
        )

    out.sort(key=lambda x: x["scheme_name"].lower())
    return out


async def download_all() -> dict[str, Any]:
    os.makedirs(BASE_DIR, exist_ok=True)

    schemes = await collect_fillable_scheme_links()

    total_links = 0
    downloaded = 0
    failed = 0
    scheme_results: list[dict[str, Any]] = []

    async with httpx.AsyncClient(
        timeout=45,
        follow_redirects=True,
        verify=False,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KisanKiAwaaz/1.0"
        },
    ) as client:
        for scheme in schemes:
            scheme_key = safe_name(scheme["scheme_id"] or scheme["scheme_name"], "scheme")
            scheme_dir = os.path.join(BASE_DIR, scheme_key)
            os.makedirs(scheme_dir, exist_ok=True)

            items: list[dict[str, Any]] = []
            for link in scheme["links"]:
                total_links += 1
                try:
                    response = await client.get(link)
                    status = int(response.status_code)
                    if status >= 400:
                        failed += 1
                        items.append(
                            {
                                "url": link,
                                "status": f"http_{status}",
                            }
                        )
                        continue

                    final_url = str(response.url)
                    content_type = response.headers.get("content-type", "")
                    ext = ext_from_response(final_url, content_type)
                    url_hash = hashlib.md5(link.encode("utf-8")).hexdigest()[:12]
                    base = safe_name(os.path.basename(urlparse(final_url).path), "document")
                    if base in {"", ".", ".."}:
                        base = "document"
                    filename = f"{base}_{url_hash}{ext}"
                    local_path = os.path.join(scheme_dir, filename)

                    with open(local_path, "wb") as fp:
                        fp.write(response.content)

                    downloaded += 1
                    items.append(
                        {
                            "url": link,
                            "final_url": final_url,
                            "status": "downloaded",
                            "filename": filename,
                            "bytes": len(response.content),
                            "content_type": content_type,
                        }
                    )
                except Exception as exc:  # pragma: no cover
                    failed += 1
                    items.append(
                        {
                            "url": link,
                            "status": "error",
                            "error": str(exc),
                        }
                    )

            scheme_results.append(
                {
                    "scheme_id": scheme["scheme_id"],
                    "scheme_name": scheme["scheme_name"],
                    "fillable_docs": scheme["fillable_docs"],
                    "links": scheme["links"],
                    "results": items,
                    "downloaded_count": len([x for x in items if x.get("status") == "downloaded"]),
                    "failed_count": len([x for x in items if x.get("status") != "downloaded"]),
                }
            )

    manifest = {
        "base_dir": BASE_DIR,
        "schemes_with_fillable_docs": len(schemes),
        "total_links_attempted": total_links,
        "total_downloaded": downloaded,
        "total_failed": failed,
        "scheme_results": scheme_results,
    }

    with open(os.path.join(BASE_DIR, MANIFEST_NAME), "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, indent=2, ensure_ascii=True)

    return manifest


if __name__ == "__main__":
    result = asyncio.run(download_all())
    print(
        json.dumps(
            {
                "base_dir": result["base_dir"],
                "schemes_with_fillable_docs": result["schemes_with_fillable_docs"],
                "total_links_attempted": result["total_links_attempted"],
                "total_downloaded": result["total_downloaded"],
                "total_failed": result["total_failed"],
            },
            ensure_ascii=True,
        )
    )
