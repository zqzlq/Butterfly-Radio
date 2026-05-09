import re
import hashlib
import sys
from pathlib import Path

import httpx
from loguru import logger

# Cache directory
if getattr(sys, "frozen", False):
    CACHE_DIR = Path(sys.executable).parent / "temp" / "artist-photos"
else:
    CACHE_DIR = Path(__file__).parent.parent / "temp" / "artist-photos"

CACHE_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def _cache_path(artist_name: str) -> Path:
    """Generate a cache file path for an artist name."""
    safe = hashlib.md5(artist_name.encode()).hexdigest()
    return CACHE_DIR / f"{safe}.jpg"


def _extract_image_urls(html: str) -> list[str]:
    """Extract original image URLs from Bing image search HTML."""
    urls = []

    # Pattern 1: Bing stores original image URLs in "murl" within JSON-like "m" attribute
    for m in re.finditer(r'"murl"\s*:\s*"(https?://[^"]+)"', html):
        url = m.group(1).replace("\\u0026", "&").replace("\\/", "/")
        urls.append(url)

    # Pattern 2: <img> tags with data-src or src pointing to actual images
    if not urls:
        for m in re.finditer(r'<img[^>]+(?:data-src|src)="(https?://[^"]+)"', html):
            url = m.group(1)
            # Skip Bing's own thumbnails/icons
            if "bing.com" not in url and "microsoft.com" not in url:
                urls.append(url)

    return urls


def _download_image(url: str, save_path: Path, timeout: float = 10.0) -> bool:
    """Download an image from URL to local file."""
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "image" in content_type or len(resp.content) > 1000:
                    save_path.write_bytes(resp.content)
                    return True
    except Exception as e:
        logger.debug(f"Failed to download image from {url}: {e}")
    return False


async def fetch_artist_photo(artist_name: str) -> Path | None:
    """
    Search for an artist's photo online, download and cache it.
    Returns the local file path if successful, None otherwise.
    """
    if not artist_name or artist_name.strip().lower() in ("unknown", "未知", ""):
        return None

    artist_name = artist_name.strip()

    # Check cache
    cached = _cache_path(artist_name)
    if cached.exists() and cached.stat().st_size > 1000:
        return cached

    # Search Bing images
    query = f"{artist_name} 歌手 照片"
    search_url = f"https://www.bing.com/images/search?q={query}&form=HDRSC2&first=1"

    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            resp = client.get(search_url, headers=HEADERS)
            if resp.status_code != 200:
                logger.warning(f"Bing search failed for '{artist_name}': HTTP {resp.status_code}")
                return None

            image_urls = _extract_image_urls(resp.text)

            if not image_urls:
                # Try English search
                query_en = f"{artist_name} singer photo"
                search_url_en = f"https://www.bing.com/images/search?q={query_en}&form=HDRSC2&first=1"
                resp_en = client.get(search_url_en, headers=HEADERS)
                if resp_en.status_code == 200:
                    image_urls = _extract_image_urls(resp_en.text)

    except Exception as e:
        logger.warning(f"Failed to search for artist photo '{artist_name}': {e}")
        return None

    # Try downloading the first few results
    for url in image_urls[:3]:
        if _download_image(url, cached):
            logger.info(f"Fetched artist photo for '{artist_name}'")
            return cached

    logger.debug(f"No usable image found for artist '{artist_name}'")
    return None
