import os
import sys
import signal
from pathlib import Path

import uvicorn
from loguru import logger

# Detect if running as PyInstaller bundle
IS_BUNDLED = getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")

# Configure loguru
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level:<7} | {message}")

if IS_BUNDLED:
    # In bundled mode, logs go next to the executable
    log_dir = Path(sys.executable).parent / "logs"
else:
    log_dir = Path("logs")

log_dir.mkdir(exist_ok=True)
logger.add(
    log_dir / "butterfly-radio.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG",
)


def handle_shutdown(sig, frame):
    logger.info("Shutting down Butterfly Radio backend...")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    port = int(os.environ.get("PYTHON_PORT", "3000"))
    is_dev = os.environ.get("BUTTERFLY_DEV", "0") == "1"

    logger.info(f"Starting Butterfly Radio backend on port {port} (dev={is_dev}, bundled={IS_BUNDLED})...")
    uvicorn.run(
        "app:create_app",
        host="127.0.0.1",
        port=port,
        reload=is_dev and not IS_BUNDLED,
        log_level="info",
        factory=True,
    )
