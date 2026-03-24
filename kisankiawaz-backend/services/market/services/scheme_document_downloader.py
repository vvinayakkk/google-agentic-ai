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
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

# Base directory for downloaded scheme documents
SCHEME_DOCS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "scheme_documents",
)


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
        form_urls = scheme.get("form_download_urls", [])
        
        # Also check application_url for downloadable content
        app_url = scheme.get("application_url", "")
        
        # Download form URLs
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 KisanKiAwaaz/1.0"
            },
        ) as client:
            for form_info in form_urls:
                if isinstance(form_info, dict):
                    url = form_info.get("url", "")
                    name = form_info.get("name", "document")
                elif isinstance(form_info, str):
                    url = form_info
                    name = url.rsplit("/", 1)[-1]
                else:
                    continue

                if not url or not url.startswith("http"):
                    results.append({"name": name, "url": url, "status": "invalid_url"})
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
                            "is_webpage": True,
                        })
                        continue

                    content_type = response.headers.get("content-type", "")
                    content = response.content

                    # Determine file extension
                    if "pdf" in content_type or url.endswith(".pdf"):
                        ext = ".pdf"
                    elif "html" in content_type:
                        ext = ".html"
                    elif "image" in content_type:
                        ext = ".png" if "png" in content_type else ".jpg"
                    else:
                        # Guess from URL or default to .html
                        url_parts = url.rsplit(".", 1)
                        ext = f".{url_parts[-1][:4]}" if len(url_parts) > 1 and len(url_parts[-1]) <= 4 else ".html"

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
                        "local_path": filepath,
                        "filename": filename,
                        "size": file_size,
                        "content_type": content_type,
                        "downloaded_at": datetime.now(timezone.utc).isoformat(),
                    }

                    results.append({
                        "name": name,
                        "url": url,
                        "status": "downloaded",
                        "local_path": filepath,
                        "size": file_size,
                        "content_type": content_type,
                    })
                    logger.info(f"Downloaded: {name} ({file_size:,d} bytes) -> {filepath}")

                except httpx.TimeoutException:
                    results.append({"name": name, "url": url, "status": "timeout"})
                except Exception as e:
                    results.append({"name": name, "url": url, "status": "error", "error": str(e)})

        self._save_manifest()

        return {
            "scheme": scheme_name,
            "scheme_dir": scheme_dir,
            "downloads": results,
            "success_count": len([r for r in results if r["status"] == "downloaded"]),
            "cached_count": len([r for r in results if r["status"] == "already_downloaded"]),
            "failed_count": len([r for r in results if r["status"] not in ("downloaded", "already_downloaded")]),
        }

    async def download_all_schemes(self, force: bool = False) -> Dict:
        """Download documents for ALL government schemes."""
        from services.government_schemes_data import get_all_schemes
        
        all_schemes = get_all_schemes()
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
            for d in docs:
                if doc_name.lower() in d.get("name", "").lower():
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
