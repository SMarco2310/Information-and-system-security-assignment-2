#!/usr/bin/env python3
"""Start the whole app: Express backend (4000) and static frontend (3000).

Usage: python3 run.py        Stop both with Ctrl+C.
"""
import shutil
import socket
import signal
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "Backend"
FRONTEND = ROOT / "Frontend"
BACKEND_PORT = 4000
FRONTEND_PORT = 3000

procs: list[subprocess.Popen] = []


def stream(prefix: str, proc: subprocess.Popen) -> None:
    for line in proc.stdout:
        print(f"[{prefix}] {line}", end="", flush=True)


def start(prefix: str, cmd: list[str], cwd: Path) -> subprocess.Popen:
    proc = subprocess.Popen(
        cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    procs.append(proc)
    threading.Thread(target=stream, args=(prefix, proc), daemon=True).start()
    return proc


def port_in_use(port: int) -> bool:
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def stop_all(*_: object) -> None:
    print("\nStopping...", flush=True)
    for p in procs:
        if p.poll() is None:
            p.terminate()
    for p in procs:
        try:
            p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            p.kill()
    sys.exit(0)


def main() -> None:
    npm = shutil.which("npm")
    if not npm:
        sys.exit("npm not found. Install Node.js 18+ first.")

    for name, port in (("backend", BACKEND_PORT), ("frontend", FRONTEND_PORT)):
        if port_in_use(port):
            sys.exit(f"Port {port} ({name}) is already in use. Stop the other process first.")

    if not (BACKEND / "node_modules").exists():
        print("Installing backend dependencies...", flush=True)
        subprocess.run([npm, "install"], cwd=BACKEND, check=True)

    if not (BACKEND / "portal.db").exists():
        print("Creating and seeding the database...", flush=True)
        subprocess.run([npm, "run", "db:seed"], cwd=BACKEND, check=True)

    signal.signal(signal.SIGINT, stop_all)
    signal.signal(signal.SIGTERM, stop_all)

    backend = start("backend ", [npm, "run", "dev"], BACKEND)
    frontend = start(
        "frontend",
        [sys.executable, "-u", "-m", "http.server", str(FRONTEND_PORT)],
        FRONTEND,
    )

    url = f"http://localhost:{FRONTEND_PORT}/login.html"
    time.sleep(1.5)
    print(f"\nFrontend: {url}\nBackend:  http://localhost:{BACKEND_PORT}/api/health\nPress Ctrl+C to stop.\n", flush=True)
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)

    # If either process dies, shut everything down
    while True:
        if backend.poll() is not None or frontend.poll() is not None:
            print("A process exited unexpectedly.", flush=True)
            stop_all()
        time.sleep(0.5)


if __name__ == "__main__":
    main()
