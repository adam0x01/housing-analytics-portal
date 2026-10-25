"""Prepare the Fly volume, then start the estimator as its unprivileged user."""

import os
import sys
from pathlib import Path

if __name__ == "__main__":
    if not sys.argv[1:]:
        raise SystemExit("An application command is required.")
    if os.getuid() == 0:
        storage = Path(os.environ["DATABASE_PATH"]).parent
        storage.mkdir(parents=True, exist_ok=True)
        os.chown(storage, 10001, 10001)
        os.setgroups([])
        os.setgid(10001)
        os.setuid(10001)
    os.execvp(sys.argv[1], sys.argv[1:])
