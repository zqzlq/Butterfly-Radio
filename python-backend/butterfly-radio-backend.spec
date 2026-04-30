# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Butterfly Radio Python Backend.

Usage:
    pyinstaller butterfly-radio-backend.spec

Output: python-backend/dist/butterfly-radio-backend/ (onedir)
        or python-backend/dist/butterfly-radio-backend.exe (onefile)

The electron-builder config in electron-main/package.json expects
the output at: ../python-backend/dist/butterfly-radio-backend
"""

import sys
from pathlib import Path

block_cipher = None

# Collect all Python source files
src_root = Path(SPECPATH)

a = Analysis(
    [str(src_root / "main.py")],
    pathex=[str(src_root)],
    binaries=[],
    datas=[
        # Include any data files the backend needs at runtime
        # (templates, configs, etc.) — add here as needed
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "engineio.async_drivers.threading",
        "socketio",
        "sqlalchemy.dialects.sqlite",
        "aiosqlite",
        "apscheduler.schedulers.asyncio",
        "apscheduler.triggers.interval",
        "apscheduler.triggers.cron",
        "pydub.generators",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude heavy packages not needed at runtime
        "tkinter",
        "matplotlib",
        "numpy.testing",
        "pytest",
        "ruff",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ── Single directory mode (recommended) ──
# Produces a folder with an .exe — matches electron-builder extraResources path
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="butterfly-radio-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Keep console for log visibility
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="butterfly-radio-backend",
)
