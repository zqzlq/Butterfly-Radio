import io
import os
from pathlib import Path
from typing import Optional

from pydub import AudioSegment
from loguru import logger

SUPPORTED_FORMATS = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"}

# Ensure ffmpeg is available
FFMPEG_PATH = None


def _find_ffmpeg() -> Optional[str]:
    """Find FFmpeg binary - bundled or system."""
    global FFMPEG_PATH
    if FFMPEG_PATH:
        return FFMPEG_PATH

    # Check bundled ffmpeg
    bundled = Path(__file__).parent.parent.parent / "resources" / "ffmpeg"
    for name in ("ffmpeg.exe", "ffmpeg"):
        path = bundled / name
        if path.exists():
            FFMPEG_PATH = str(path)
            AudioSegment.converter = FFMPEG_PATH
            logger.info(f"Using bundled FFmpeg: {FFMPEG_PATH}")
            return FFMPEG_PATH

    # Check system PATH
    import shutil
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        FFMPEG_PATH = system_ffmpeg
        logger.info(f"Using system FFmpeg: {FFMPEG_PATH}")
        return FFMPEG_PATH

    logger.warning("FFmpeg not found. Audio processing may fail.")
    return None


def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds."""
    _find_ffmpeg()
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
    except Exception as e:
        logger.error(f"Failed to get duration for {file_path}: {e}")
        return 0.0


def get_audio_info(file_path: str) -> dict:
    """Get comprehensive audio file info."""
    _find_ffmpeg()
    try:
        audio = AudioSegment.from_file(file_path)
        return {
            "duration": len(audio) / 1000.0,
            "channels": audio.channels,
            "sample_rate": audio.frame_rate,
            "sample_width": audio.sample_width,
            "format": Path(file_path).suffix.lstrip("."),
            "bitrate": audio.frame_rate * audio.sample_width * audio.channels * 8,
        }
    except Exception as e:
        logger.error(f"Failed to read audio info for {file_path}: {e}")
        return {"duration": 0.0, "format": Path(file_path).suffix.lstrip(".")}


def load_audio(file_path: str) -> Optional[AudioSegment]:
    """Load an audio file as AudioSegment."""
    _find_ffmpeg()
    try:
        return AudioSegment.from_file(file_path)
    except Exception as e:
        logger.error(f"Failed to load audio {file_path}: {e}")
        return None


def load_audio_bytes(file_path: str) -> Optional[bytes]:
    """Load audio file and return as bytes (for streaming)."""
    _find_ffmpeg()
    try:
        audio = AudioSegment.from_file(file_path)
        buf = io.BytesIO()
        audio.export(buf, format="mp3", bitrate="192k")
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Failed to load audio bytes for {file_path}: {e}")
        return None


def convert_format(
    input_path: str,
    output_path: str,
    output_format: str = "mp3",
    bitrate: str = "192k",
) -> bool:
    """Convert audio file to a different format."""
    _find_ffmpeg()
    try:
        audio = AudioSegment.from_file(input_path)
        audio.export(output_path, format=output_format, bitrate=bitrate)
        logger.info(f"Converted {input_path} -> {output_path}")
        return True
    except Exception as e:
        logger.error(f"Format conversion failed: {e}")
        return False


def normalize_audio(audio: AudioSegment, target_dbfs: float = -20.0) -> AudioSegment:
    """Normalize audio to target dBFS."""
    change_in_dbfs = target_dbfs - audio.dBFS
    return audio.apply_gain(change_in_dbfs)


def trim_silence(audio: AudioSegment, silence_thresh: int = -45, chunk_size: int = 10) -> AudioSegment:
    """Trim silence from start and end of audio."""
    from pydub.silence import detect_nonsilent
    nonsilent_ranges = detect_nonsilent(
        audio, min_silence_len=300, silence_thresh=silence_thresh, chunk_size=chunk_size
    )
    if nonsilent_ranges:
        start = nonsilent_ranges[0][0]
        end = nonsilent_ranges[-1][1]
        return audio[start:end]
    return audio


def mix_song_with_commentary(
    song_path: str,
    commentary_path: str,
    output_path: str,
    gap_before: int = 500,
    gap_after: int = 500,
    commentary_volume_offset: float = 0,
    crossfade: int = 300,
) -> Optional[str]:
    """
    Mix a song with AI commentary at the beginning.
    Inserts commentary audio before the song with gaps and crossfade.
    Returns the output path or None on failure.
    """
    _find_ffmpeg()
    try:
        song = AudioSegment.from_file(song_path)
        commentary = AudioSegment.from_file(commentary_path)

        # Normalize volumes
        song = normalize_audio(song)
        commentary = normalize_audio(commentary)

        # Apply volume offset to commentary
        if commentary_volume_offset != 0:
            commentary = commentary.apply_gain(commentary_volume_offset)

        # Build the mixed audio: gap + commentary + gap + crossfade into song
        silence_before = AudioSegment.silent(duration=gap_before)
        silence_after = AudioSegment.silent(duration=gap_after)

        # Trim silence from commentary
        commentary = trim_silence(commentary)

        # Compose: commentary with gaps, then crossfade into song
        intro = silence_before + commentary + silence_after

        # Apply crossfade between intro end and song start
        if crossfade > 0 and len(song) > crossfade:
            mixed = intro.append(song, crossfade=crossfade)
        else:
            mixed = intro + song

        # Export
        mixed.export(output_path, format="mp3", bitrate="192k")
        logger.info(f"Mixed audio saved to {output_path}")
        return output_path

    except Exception as e:
        logger.error(f"Audio mixing failed: {e}")
        return None


def create_silence(duration_ms: int) -> AudioSegment:
    """Create a silent audio segment."""
    return AudioSegment.silent(duration=duration_ms)


def concatenate_audio(file_paths: list[str], output_path: str, crossfade_ms: int = 0) -> bool:
    """Concatenate multiple audio files into one."""
    _find_ffmpeg()
    try:
        segments = []
        for fp in file_paths:
            seg = AudioSegment.from_file(fp)
            if seg:
                segments.append(seg)

        if not segments:
            return False

        combined = segments[0]
        for seg in segments[1:]:
            if crossfade_ms > 0 and len(combined) > crossfade_ms and len(seg) > crossfade_ms:
                combined = combined.append(seg, crossfade=crossfade_ms)
            else:
                combined = combined + seg

        combined.export(output_path, format="mp3", bitrate="192k")
        return True
    except Exception as e:
        logger.error(f"Audio concatenation failed: {e}")
        return False
