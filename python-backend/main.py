import sys
import signal
from pathlib import Path

import uvicorn
from loguru import logger

# Configure loguru
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level:<7} | {message}")
Path("logs").mkdir(exist_ok=True)
logger.add(
    Path("logs/butterfly-radio.log"),
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

    logger.info("Starting Butterfly Radio backend on port 3000...")
    uvicorn.run(
        "app:create_app",
        host="127.0.0.1",
        port=3000,
        reload=True,
        log_level="info",
        factory=True,
    )
