"""Deliver a new version: test what changed, build once, back up, copy the presentation, zip the source.
Works on Windows and macOS (Python 3.9+, and Node 22+ with Chrome or Edge for the tests).

Usage (from any folder):
    python <project>/tools/deliver.py                 next version number, today's date
    python <project>/tools/deliver.py --to <folder>   deliver into <folder>
    python <project>/tools/deliver.py --version 50    a version number of your own
    python <project>/tools/deliver.py --skip-tests    no tests (only when they just passed)

The delivery folder: --to, else the environment variable PRESENTATION_DELIVER_DIR, else ~/Downloads/animated-presentation.
In it:
    Presentation.html                 the presentation (one file, works offline)
    Presentation-source.zip           the source (animated-presentation/...)
    Presentation-without-editor.html, -without-presenter.html, -slides-only.html   the same without those parts
    presentation-backups/vNN-<date>-before   what was delivered before this version
    presentation-backups/vNN-<date>          this version's source and presentation
The tests (node tools/test.mjs) only run the suites for what changed since the last run that passed; nothing changed: none.
"""
import datetime
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
NAME = "Presentation"
ZIP_PARTS = ["src", "docs", "img", "fonts", "tools", ".claude", ".github", "AGENTS.md", ".gitignore", ".gitattributes", "build.py", "README.md", f"{NAME}.html"]
BACKUP_PARTS = ["src", "docs", "tools", ".claude", ".github", "AGENTS.md", ".gitignore", ".gitattributes", "build.py", "README.md", f"{NAME}.html"]
NOT_SHIPPED = {"last-pass.json", "built-from.txt"}   # this machine's test memory


def option(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else default


def delivery_folder() -> Path:
    chosen = option("--to") or os.environ.get("PRESENTATION_DELIVER_DIR")
    if chosen:
        return Path(chosen).expanduser()
    return Path.home() / "Downloads" / "animated-presentation"


def run(command, what):
    print(f"-- {what}")
    if subprocess.run(command, cwd=PROJECT).returncode != 0:
        sys.exit(f"stopped: {what} failed")


def main() -> None:
    out = delivery_folder()
    backups = out / "presentation-backups"
    backups.mkdir(parents=True, exist_ok=True)
    numbers = [int(m.group(1)) for p in backups.iterdir() if (m := re.match(r"v(\d+)-", p.name))]
    version = option("--version") or str(max(numbers, default=0) + 1)
    date = datetime.date.today().isoformat()

    if "--skip-tests" not in sys.argv:
        run(["node", str(PROJECT / "tools" / "test.mjs")], "tests (what changed)")
    run([sys.executable, str(PROJECT / "build.py"), "--preview"], "build")

    before = backups / f"v{version}-{date}-before"
    before.mkdir(exist_ok=False)
    for name in [f"{NAME}.html", f"{NAME}-source.zip"]:
        if (out / name).exists():
            shutil.copy2(out / name, before / name)
    shutil.copy2(PROJECT / f"{NAME}.html", out / f"{NAME}.html")
    # the copies without the editor and/or the presenter view (build.py --without; README "Leaving parts out")
    sys.path.insert(0, str(PROJECT))
    import build
    full = (PROJECT / f"{NAME}.html").read_text(encoding="utf-8")
    for parts, suffix in build.VARIANT_NAMES.items():
        (out / f"{NAME}-{suffix}.html").write_text(build.without_parts(full, parts), encoding="utf-8")

    zip_path = out / f"{NAME}-source.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for part in ZIP_PARTS:
            path = PROJECT / part
            for file in [path] if path.is_file() else sorted(p for p in path.rglob("*") if p.is_file()):
                if file.name not in NOT_SHIPPED:
                    archive.write(file, "animated-presentation/" + file.relative_to(PROJECT).as_posix())

    after = backups / f"v{version}-{date}"
    after.mkdir(exist_ok=False)
    for part in BACKUP_PARTS:
        source = PROJECT / part
        if source.is_dir():
            shutil.copytree(source, after / part, ignore=shutil.ignore_patterns(*NOT_SHIPPED))
        else:
            shutil.copy2(source, after / part)

    with zipfile.ZipFile(zip_path) as archive:
        count = len(archive.namelist())
    print(f"v{version} delivered to {out}: {NAME}.html {(out / f'{NAME}.html').stat().st_size // 1024} KB, "
          f"source zip {count} files {zip_path.stat().st_size // 1024} KB; backups {before.name}, {after.name}")


if __name__ == "__main__":
    main()
