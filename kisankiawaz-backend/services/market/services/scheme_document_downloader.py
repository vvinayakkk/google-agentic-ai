"""
Scheme Document Downloader for KisanKiAwaaz.
Actually downloads government scheme PDFs, forms, and guidelines
so farmers can access them offline.
"""

import os
import json
import logging
import hashlib
import asyncio
import re
import shutil
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

# Base directory for downloaded scheme documents
SCHEME_DOCS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "scheme_documents",
)

FORM_KEYWORDS = {
    "form",
    "apply",
    "application",
    "registration",
    "enrolment",
    "enrollment",
    "download",
    "annexure",
    "format",
    "proforma",
}

FORM_FILE_EXTS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".rtf",
}

_DEFAULT_DISCOVERY_BLOCKLIST = "nrlm.gov.in,farmer.gov.in"
DISCOVERY_BLOCKLIST = {
    host.strip().lower()
    for host in os.getenv(
        "MARKET_LINK_DISCOVERY_BLOCKLIST",
        _DEFAULT_DISCOVERY_BLOCKLIST,
    ).split(",")
    if host.strip()
}


class SchemeDocumentDownloader:
    """Downloads and manages government scheme documents for farmers."""

    def __init__(self, base_dir: str = None):
        self.base_dir = base_dir or SCHEME_DOCS_DIR
        os.makedirs(self.base_dir, exist_ok=True)
        self.manifest_path = os.path.join(self.base_dir, "manifest.json")
        self.manifest = self._load_manifest()

    def _load_manifest(self) -> dict:
        """Load download manifest tracking all downloaded files."""
        if os.path.exists(self.manifest_path):
            with open(self.manifest_path, "r") as f:
                return json.load(f)
        return {"documents": {}, "last_updated": None}

    def _save_manifest(self):
        """Persist manifest to disk."""
        self.manifest["last_updated"] = datetime.now(timezone.utc).isoformat()
        with open(self.manifest_path, "w") as f:
            json.dump(self.manifest, f, indent=2)

    def _safe_filename(self, name: str) -> str:
        """Convert scheme name to safe filename."""
        safe = name.lower().strip()
        for ch in ["/", "\\", ":", "*", "?", '"', "<", ">", "|", " ", "(", ")"]:
            safe = safe.replace(ch, "_")
        # Remove consecutive underscores
        while "__" in safe:
            safe = safe.replace("__", "_")
        return safe.strip("_")[:80]

    def reset_storage(self) -> dict:
        """Delete all downloaded scheme files and reset manifest."""
        removed_files = 0
        removed_dirs = 0

        if os.path.isdir(self.base_dir):
            for entry in os.listdir(self.base_dir):
                path = os.path.join(self.base_dir, entry)

                # Manifest is recreated from scratch after cleanup.
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                        removed_files += 1
                    except FileNotFoundError:
                        pass
                    continue

                if os.path.isdir(path):
                    shutil.rmtree(path, ignore_errors=True)
                    removed_dirs += 1

        self.manifest = {"documents": {}, "last_updated": None}
        self._save_manifest()

        return {
            "base_dir": self.base_dir,
            "removed_files": removed_files,
            "removed_dirs": removed_dirs,
        }

    def _normalize_url(self, raw: str) -> str:
        url = (raw or "").strip()
        if not url:
            return ""
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return ""
        # Trim fragment noise so dedupe is stable.
        if parsed.fragment:
            url = url.split("#", 1)[0]
        return url.strip()

    def _looks_like_form_link(self, url: str, text: str = "") -> bool:
        u = (url or "").lower()
        t = (text or "").lower()
        if any(u.endswith(ext) for ext in FORM_FILE_EXTS):
            return True
        blob = f"{u} {t}"
        return any(keyword in blob for keyword in FORM_KEYWORDS)

    def _extract_links_from_html(self, html: str, base_url: str) -> List[Tuple[str, str]]:
        links: List[Tuple[str, str]] = []
        if not html:
            return links

        # Basic anchor extraction keeps dependency footprint low.
        anchor_rx = re.compile(
            r"<a[^>]*href=[\"']?([^\"' >]+)[^>]*>(.*?)</a>",
            flags=re.IGNORECASE | re.DOTALL,
        )

        for match in anchor_rx.finditer(html):
            href = (match.group(1) or "").strip()
            inner = re.sub(r"<[^>]+>", " ", match.group(2) or "")
            text = " ".join(inner.split())
            if not href:
                continue
            absolute = self._normalize_url(urljoin(base_url, href))
            if not absolute:
                continue
            links.append((absolute, text))

        return links

    async def _discover_links_from_application_page(
        self,
        client: httpx.AsyncClient,
        application_url: str,
    ) -> List[Dict[str, str]]:
        app_url = self._normalize_url(application_url)
        if not app_url:
            return []

        host = (urlparse(app_url).hostname or "").lower()
        if host and any(
            host == blocked or host.endswith(f".{blocked}")
            for blocked in DISCOVERY_BLOCKLIST
        ):
            logger.info("Skipping link discovery for %s (host blocklist)", app_url)
            return []

        discovered: List[Dict[str, str]] = []
        try:
            response = await client.get(app_url)
            if response.status_code >= 400:
                return []

            content_type = (response.headers.get("content-type") or "").lower()
            if "html" not in content_type:
                return []

            html = response.text or ""
            for href, text in self._extract_links_from_html(html, str(response.url)):
                if not self._looks_like_form_link(href, text):
                    continue
                discovered.append(
                    {
                        "name": text.strip() or "Discovered Form Link",
                        "url": href,
                        "source": "application_page_discovery",
                    }
                )
                if len(discovered) >= 40:
                    break
        except Exception as exc:
            message = str(exc).lower()
            non_fatal_hints = (
                "certificate verify failed",
                "name or service not known",
                "temporary failure in name resolution",
                "nodename nor servname provided",
                "connection refused",
                "timed out",
            )
            if any(hint in message for hint in non_fatal_hints):
                logger.info(
                    "Link discovery skipped for %s due to upstream connectivity issue: %s",
                    app_url,
                    exc,
                )
            else:
                logger.warning("Link discovery failed for %s: %s", app_url, exc)

        return discovered

    def _candidate_file_extension(self, url: str, content_type: str) -> str:
        low_url = (url or "").lower()
        low_ct = (content_type or "").lower()

        for ext in FORM_FILE_EXTS:
            if low_url.endswith(ext):
                return ext

        if "application/pdf" in low_ct:
            return ".pdf"
        if "msword" in low_ct:
            return ".doc"
        if "officedocument.wordprocessingml.document" in low_ct:
            return ".docx"
        if "spreadsheet" in low_ct or "excel" in low_ct:
            return ".xlsx"
        if "html" in low_ct:
            return ".html"
        return ".bin"

    def _is_downloadable_payload(self, content_type: str, url: str) -> bool:
        low_ct = (content_type or "").lower()
        low_url = (url or "").lower()
        if any(low_url.endswith(ext) for ext in FORM_FILE_EXTS):
            return True
        if "application/pdf" in low_ct:
            return True
        if "msword" in low_ct or "wordprocessingml" in low_ct:
            return True
        if "spreadsheet" in low_ct or "excel" in low_ct:
            return True
        if "html" in low_ct:
            # Keep html form pages too, since many official forms are web flows.
            return self._looks_like_form_link(url)
        return False

    def _iter_seed_links(self, scheme: dict) -> List[Dict[str, str]]:
        seeds: List[Dict[str, str]] = []
        for form_info in scheme.get("form_download_urls", []) or []:
            if isinstance(form_info, dict):
                seeds.append(
                    {
                        "name": str(form_info.get("name") or "Official Form").strip(),
                        "url": str(form_info.get("url") or "").strip(),
                        "source": "scheme_catalog",
                    }
                )
            elif isinstance(form_info, str):
                url = form_info.strip()
                if not url:
                    continue
                seeds.append(
                    {
                        "name": url.rsplit("/", 1)[-1] or "Official Form",
                        "url": url,
                        "source": "scheme_catalog",
                    }
                )

        app_url = str(scheme.get("application_url") or "").strip()
        if app_url:
            seeds.append(
                {
                    "name": "Official Application Portal",
                    "url": app_url,
                    "source": "application_url",
                }
            )
        return seeds

    async def download_scheme_documents(
        self, scheme: dict, force: bool = False
    ) -> Dict:
        """
        Download all available documents for a single scheme.
        
        Returns dict with download status for each URL.
        """
        scheme_name = scheme.get("short_name", scheme.get("name", "unknown"))
        scheme_dir = os.path.join(self.base_dir, self._safe_filename(scheme_name))
        os.makedirs(scheme_dir, exist_ok=True)

        results = []

        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 KisanKiAwaaz/1.0"
            },
        ) as client:
            candidates: Dict[str, Dict[str, str]] = {}

            for item in self._iter_seed_links(scheme):
                normalized = self._normalize_url(item.get("url", ""))
                if not normalized:
                    continue
                candidates.setdefault(
                    normalized,
                    {
                        "name": item.get("name", "Official Form"),
                        "url": normalized,
                        "source": item.get("source", "scheme_catalog"),
                    },
                )

            app_url = str(scheme.get("application_url") or "").strip()
            discovered = await self._discover_links_from_application_page(client, app_url)
            for item in discovered:
                normalized = self._normalize_url(item.get("url", ""))
                if not normalized:
                    continue
                candidates.setdefault(
                    normalized,
                    {
                        "name": item.get("name", "Discovered Form Link"),
                        "url": normalized,
                        "source": item.get("source", "application_page_discovery"),
                    },
                )

            for entry in candidates.values():
                url = entry.get("url", "")
                name = entry.get("name", "document")
                source = entry.get("source", "unknown")

                if not url:
                    results.append({"name": name, "url": url, "status": "invalid_url", "source": source})
                    continue

                # Check if already downloaded
                url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
                if url_hash in self.manifest.get("documents", {}) and not force:
                    existing = self.manifest["documents"][url_hash]
                    if os.path.exists(existing.get("local_path", "")):
                        results.append({
                            "name": name,
                            "url": url,
                            "status": "already_downloaded",
                            "source": existing.get("source") or source,
                            "local_path": existing["local_path"],
                            "size": existing.get("size", 0),
                        })
                        continue

                # Download
                try:
                    response = await client.get(url)
                    
                    if response.status_code >= 400:
                        # Try HEAD to check if it's a webpage vs downloadable
                        results.append({
                            "name": name,
                            "url": url,
                            "status": f"http_{response.status_code}",
                            "source": source,
                            "is_webpage": True,
                        })
                        continue

                    content_type = response.headers.get("content-type", "")
                    final_url = str(response.url)

                    if not self._is_downloadable_payload(content_type, final_url):
                        results.append(
                            {
                                "name": name,
                                "url": url,
                                "final_url": final_url,
                                "status": "not_downloadable_payload",
                                "source": source,
                                "content_type": content_type,
                            }
                        )
                        continue

                    content = response.content

                    ext = self._candidate_file_extension(final_url, content_type)

                    safe_name = self._safe_filename(name)
                    filename = f"{safe_name}{ext}"
                    filepath = os.path.join(scheme_dir, filename)

                    with open(filepath, "wb") as f:
                        f.write(content)

                    file_size = len(content)

                    # Update manifest
                    self.manifest["documents"][url_hash] = {
                        "scheme": scheme_name,
                        "name": name,
                        "url": url,
                        "final_url": final_url,
                        "source": source,
                        "local_path": filepath,
                        "filename": filename,
                        "size": file_size,
                        "content_type": content_type,
                        "is_form_candidate": self._looks_like_form_link(final_url, name),
                        "downloaded_at": datetime.now(timezone.utc).isoformat(),
                    }

                    results.append({
                        "name": name,
                        "url": url,
                        "final_url": final_url,
                        "status": "downloaded",
                        "source": source,
                        "local_path": filepath,
                        "size": file_size,
                        "content_type": content_type,
                    })
                    logger.info(f"Downloaded: {name} ({file_size:,d} bytes) -> {filepath}")

                except httpx.TimeoutException:
                    results.append({"name": name, "url": url, "status": "timeout", "source": source})
                except Exception as e:
                    results.append({"name": name, "url": url, "status": "error", "source": source, "error": str(e)})

        self._save_manifest()

        return {
            "scheme": scheme_name,
            "scheme_dir": scheme_dir,
            "downloads": results,
            "discovered_count": len([r for r in results if r.get("source") == "application_page_discovery"]),
            "success_count": len([r for r in results if r["status"] == "downloaded"]),
            "cached_count": len([r for r in results if r["status"] == "already_downloaded"]),
            "failed_count": len([r for r in results if r["status"] not in ("downloaded", "already_downloaded")]),
        }

    async def download_all_schemes(
        self,
        force: bool = False,
        schemes: Optional[List[dict]] = None,
    ) -> Dict:
        """Download documents for all provided schemes (or built-in fallback)."""
        from services.government_schemes_data import get_all_schemes

        all_schemes = schemes if schemes is not None else get_all_schemes()
        results = []
        total_downloaded = 0
        total_cached = 0
        total_failed = 0
        total_size = 0

        for scheme in all_schemes:
            result = await self.download_scheme_documents(scheme, force=force)
            results.append(result)
            total_downloaded += result["success_count"]
            total_cached += result["cached_count"]
            total_failed += result["failed_count"]
            
            for dl in result["downloads"]:
                if dl.get("size"):
                    total_size += dl["size"]

        self._save_manifest()

        return {
            "total_schemes": len(all_schemes),
            "total_downloaded": total_downloaded,
            "total_cached": total_cached,
            "total_failed": total_failed,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "scheme_results": results,
            "base_dir": self.base_dir,
        }

    def get_scheme_documents(self, scheme_name: str) -> List[Dict]:
        """List all downloaded documents for a scheme."""
        results = []
        for doc_id, doc_info in self.manifest.get("documents", {}).items():
            if doc_info.get("scheme", "").lower() == scheme_name.lower():
                exists = os.path.exists(doc_info.get("local_path", ""))
                results.append({
                    **doc_info,
                    "exists": exists,
                    "doc_id": doc_id,
                })
        return results

    def get_all_downloaded(self) -> Dict:
        """Get summary of all downloaded documents."""
        by_scheme = {}
        total_size = 0
        
        for doc_id, doc_info in self.manifest.get("documents", {}).items():
            scheme = doc_info.get("scheme", "unknown")
            if scheme not in by_scheme:
                by_scheme[scheme] = {"count": 0, "size": 0, "documents": []}
            
            exists = os.path.exists(doc_info.get("local_path", ""))
            size = doc_info.get("size", 0)
            
            by_scheme[scheme]["count"] += 1
            by_scheme[scheme]["size"] += size
            by_scheme[scheme]["documents"].append({
                "name": doc_info.get("name"),
                "filename": doc_info.get("filename"),
                "size": size,
                "exists": exists,
            })
            total_size += size

        return {
            "total_documents": len(self.manifest.get("documents", {})),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "by_scheme": by_scheme,
            "last_updated": self.manifest.get("last_updated"),
        }

    def get_document_path(self, scheme_name: str, doc_name: str = None) -> Optional[str]:
        """Get local file path for a specific downloaded document."""
        docs = self.get_scheme_documents(scheme_name)
        if not docs:
            return None
        
        if doc_name:
            needle = doc_name.lower()
            for d in docs:
                if (
                    needle in d.get("name", "").lower()
                    or needle in d.get("filename", "").lower()
                ):
                    return d.get("local_path")
        
        # Return first available
        for d in docs:
            if d.get("exists"):
                return d.get("local_path")
        
        return None


# ── Standalone runner ────────────────────────────────────────────

async def main():
    """Download ALL scheme documents."""
    downloader = SchemeDocumentDownloader()
    print(f"Downloading scheme documents to: {downloader.base_dir}")
    print("=" * 60)
    
    result = await downloader.download_all_schemes()
    
    print(f"\n{'=' * 60}")
    print(f"DOWNLOAD SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total Schemes:    {result['total_schemes']}")
    print(f"Downloaded:       {result['total_downloaded']}")
    print(f"Cached:           {result['total_cached']}")
    print(f"Failed:           {result['total_failed']}")
    print(f"Total Size:       {result['total_size_mb']} MB")
    print(f"Base Directory:   {result['base_dir']}")
    
    for sr in result["scheme_results"]:
        sname = sr["scheme"]
        succ = sr["success_count"]
        fail = sr["failed_count"]
        cached = sr["cached_count"]
        status = "OK" if fail == 0 else f"{fail} FAIL"
        print(f"  {sname:20s}: {succ} downloaded, {cached} cached, {status}")
        for dl in sr["downloads"]:
            icon = "✓" if dl["status"] in ("downloaded", "already_downloaded") else "✗"
            size_str = f" ({dl.get('size', 0):,d} bytes)" if dl.get("size") else ""
            print(f"    {icon} {dl['name']}: {dl['status']}{size_str}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    asyncio.run(main())
