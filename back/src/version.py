"""Release versions: `<year>.<release>[<patch>]`, e.g. `2026.01`, then `2026.02`, a fix to it `2026.02a`.

The release number starts at 01 each year; a patch letter goes on the latest release. Releases are
git tags on master. The running app's version is the `VERSION` file its build wrote, else `dev`.

`git tag --list | python -m back.src.version next [--patch]` prints the version to tag next,
`... latest` the newest release, and `python -m back.src.version check TAG` validates a tag. Runs on
the CI runner's system Python too, so it stays on the standard library.
"""

import argparse
import datetime
import re
import sys
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Iterable, Optional, Sequence, TextIO

VERSION_FILE = Path(__file__).resolve().parents[2] / "VERSION"
PATTERN = re.compile(r"(\d{4})\.(\d{2,})([a-z]?)")


class VersionError(ValueError):
    """Not a version, or no version can follow."""


@dataclass(frozen=True, order=True)
class Version:
    year: int
    release: int
    patch: str = ""

    @classmethod
    def parse(cls, text: str) -> "Version":
        match = PATTERN.fullmatch(text)
        if match is None:
            raise VersionError(f"{text!r} is not a version like 2026.01 or 2026.01a")
        version = cls(int(match[1]), int(match[2]), match[3])
        # One spelling per version: 2026.1 and 2026.001 would sort as 2026.01 but tag apart.
        if version.release == 0 or str(version) != text:
            raise VersionError(f"{text!r} is not a version like 2026.01 or 2026.01a")
        return version

    def __str__(self) -> str:
        return f"{self.year}.{self.release:02d}{self.patch}"


def releases(tags: Iterable[str]) -> list[Version]:
    """The tags that are versions, oldest first; other tags are ignored."""
    versions = []
    for tag in tags:
        try:
            versions.append(Version.parse(tag.strip()))
        except VersionError:
            pass
    return sorted(versions)


def next_release(tags: Iterable[str], year: int) -> Version:
    versions = releases(tags)
    if versions and versions[-1].year > year:
        raise VersionError(f"{versions[-1]} is newer than the year {year}; check the clock")
    return Version(year, max((v.release for v in versions if v.year == year), default=0) + 1)


def next_patch(tags: Iterable[str]) -> Version:
    versions = releases(tags)
    if not versions:
        raise VersionError("There is no release to patch yet")
    latest = versions[-1]
    if latest.patch == "z":
        raise VersionError(f"{latest} is the last patch letter; make a release instead")
    return Version(latest.year, latest.release, chr(ord(latest.patch) + 1) if latest.patch else "a")


def running(version_file: Path = VERSION_FILE) -> str:
    try:
        return version_file.read_text().strip() or "dev"
    except FileNotFoundError:
        return "dev"


@cache
def current() -> str:
    """The version of this running app, read once."""
    return running()


def main(argv: Sequence[str], stdin: TextIO, stdout: TextIO, today: Optional[datetime.date] = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m back.src.version")
    commands = parser.add_subparsers(dest="command", required=True)
    next_command = commands.add_parser("next", help="the version to tag next; reads tags from stdin")
    next_command.add_argument("--patch", action="store_true", help="a patch to the latest release")
    commands.add_parser("latest", help="the newest release; reads tags from stdin")
    check_command = commands.add_parser("check", help="fail unless TAG is a version")
    check_command.add_argument("tag")
    arguments = parser.parse_args(argv)
    try:
        if arguments.command == "check":
            Version.parse(arguments.tag)
            return 0
        tags = stdin.read().split()
        if arguments.command == "latest":
            versions = releases(tags)
            if not versions:
                raise VersionError("There is no release yet")
            print(versions[-1], file=stdout)
        elif arguments.patch:
            print(next_patch(tags), file=stdout)
        else:
            print(next_release(tags, (today or datetime.date.today()).year), file=stdout)
        return 0
    except VersionError as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:], sys.stdin, sys.stdout))
