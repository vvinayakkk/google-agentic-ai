from __future__ import annotations

import asyncio
import json
from urllib.parse import urlparse

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_async_db

FILE_EXTS = (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".rtf")


def extract_urls(raw):
    urls = []
    if not isinstance(raw, list):
        return urls
    for item in raw:
        if isinstance(item, str) and item.strip():
            urls.append(item.strip())
        elif isinstance(item, dict):
            url = str(item.get("url") or item.get("link") or "").strip()
            if url:
                urls.append(url)
    return urls


async def main() -> None:
    db = get_async_db()
    snapshots = [
        s async for s in db.collection(MongoCollections.GOVERNMENT_SCHEMES).stream()
    ]

    rows = []
    for snap in snapshots:
        doc = snap.to_dict() or {}
        urls = extract_urls(doc.get("form_download_urls"))
        app_url = str(doc.get("application_url") or "").strip()

        rows.append(
            {
                "id": snap.id,
                "name": doc.get("short_name") or doc.get("name") or snap.id,
                "category": doc.get("category") or "",
                "state": doc.get("state") or "",
                "application_url": app_url,
                "application_url_valid": bool(app_url)
                and urlparse(app_url).scheme in {"http", "https"},
                "form_download_urls": urls,
                "form_links_total": len(urls),
                "form_links_valid_http": sum(
                    1 for u in urls if urlparse(u).scheme in {"http", "https"}
                ),
                "form_links_direct_file": sum(
                    1 for u in urls if u.lower().endswith(FILE_EXTS)
                ),
                "required_documents_count": len(doc.get("required_documents") or []),
                "form_fields_count": len(doc.get("form_fields") or []),
            }
        )

    rows.sort(key=lambda r: str(r["id"]))

    summary = {
        "total_schemes": len(rows),
        "with_application_url": sum(1 for r in rows if r["application_url_valid"]),
        "with_form_links": sum(1 for r in rows if r["form_links_total"] > 0),
        "with_direct_file_links": sum(1 for r in rows if r["form_links_direct_file"] > 0),
        "without_any_form_source": sum(
            1
            for r in rows
            if not r["application_url_valid"] and r["form_links_total"] == 0
        ),
    }

    print(json.dumps({"summary": summary, "schemes": rows}, ensure_ascii=True))


if __name__ == "__main__":
    asyncio.run(main())
