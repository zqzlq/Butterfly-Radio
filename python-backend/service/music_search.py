import os
import sys
from pathlib import Path
from typing import Optional
import httpx
from loguru import logger

# Downloaded music directory
if getattr(sys, "frozen", False):
    _download_base = Path(sys.executable).parent / "downloaded-music"
else:
    _download_base = Path(__file__).parent.parent.parent / "resources" / "downloaded-music"

DOWNLOAD_DIR = _download_base
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def search_jamendo(query: str, client_id: str, limit: int = 5) -> list[dict]:
    """
    Search Jamendo for free, downloadable tracks.
    Returns list of {id, title, artist, album, duration, url, stream_url}
    """
    if not client_id:
        logger.warning("Jamendo client_id not configured")
        return []

    url = "https://api.jamendo.com/v3.0/tracks/"
    params = {
        "client_id": client_id,
        "search": query,
        "limit": limit,
        "format": "json",
        "audioformat": "mp32",
        "include": "musicinfo",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("headers", {}).get("code") != 0:
            logger.error(f"Jamendo API error: {data.get('headers', {}).get('error_message')}")
            return []

        results = []
        for track in data.get("results", []):
            if not track.get("audiodownload_allowed", False):
                continue
            results.append({
                "source": "jamendo",
                "track_id": str(track["id"]),
                "title": track.get("name", ""),
                "artist": track.get("artist_name", ""),
                "album": track.get("album_name", ""),
                "duration": track.get("duration", 0),
                "url": track.get("audiodownload", ""),
                "stream_url": track.get("audio", ""),
                "share_url": track.get("shareurl", ""),
            })

        logger.info(f"Jamendo search '{query}': found {len(results)} tracks")
        return results

    except httpx.ConnectError:
        logger.error("Jamendo API connection failed")
        return []
    except Exception as e:
        logger.error(f"Jamendo search failed: {e}")
        return []


async def download_track(title: str, artist: str, url: str, filename: str = None) -> Optional[str]:
    """
    Download an MP3 from a direct URL to the local download directory.
    Returns the local file path, or None on failure.
    """
    if not url:
        logger.error("Download URL is empty")
        return None

    # Generate filename from title/artist if not provided
    if not filename:
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip()[:50]
        safe_artist = "".join(c for c in artist if c.isalnum() or c in " -_").strip()[:30]
        filename = f"{safe_artist} - {safe_title}.mp3".strip(" -")

    file_path = DOWNLOAD_DIR / filename

    # Skip if already downloaded
    if file_path.exists():
        logger.info(f"Already downloaded: {file_path}")
        return str(file_path)

    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            async with client.stream("GET", url) as resp:
                resp.raise_for_status()
                with open(file_path, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        f.write(chunk)

        file_size = file_path.stat().st_size
        logger.info(f"Downloaded: {file_path} ({file_size / 1024:.0f} KB)")
        return str(file_path)

    except httpx.HTTPStatusError as e:
        logger.error(f"Download HTTP error {e.response.status_code}: {url}")
        # Clean up partial file
        if file_path.exists():
            file_path.unlink()
        return None
    except Exception as e:
        logger.error(f"Download failed: {e}")
        if file_path.exists():
            file_path.unlink()
        return None
