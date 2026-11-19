import contextlib
import datetime
import io
import tempfile
import unittest
from pathlib import Path

from back.src import version
from back.src.version import Version, VersionError, next_patch, next_release, releases, running


def _run(*argv: str, tags: str = "", year: int = 2026) -> tuple[int, str]:
    stdout = io.StringIO()
    with contextlib.redirect_stderr(io.StringIO()):
        status = version.main(argv, io.StringIO(tags), stdout, today=datetime.date(year, 6, 1))
    return status, stdout.getvalue().strip()


class VersionTest(unittest.TestCase):
    def test_parses_and_prints_releases_and_patches(self):
        for text in ("2026.01", "2026.12a", "2027.100", "2026.02z"):
            with self.subTest(text=text):
                self.assertEqual(str(Version.parse(text)), text)

    def test_rejects_anything_else(self):
        for text in (
            "2026",
            "2026.1",
            "2026.001",
            "2026.00",
            "v2026.01",
            "2026.01A",
            "2026.01ab",
            "2026.01-rc",
            "26.01",
        ):
            with self.subTest(text=text), self.assertRaises(VersionError):
                Version.parse(text)

    def test_orders_by_year_then_release_then_patch(self):
        tags = ["2027.01", "2026.10", "2026.02b", "2026.02", "2026.02a", "2026.09"]

        self.assertEqual(
            [str(v) for v in releases(tags)], ["2026.02", "2026.02a", "2026.02b", "2026.09", "2026.10", "2027.01"]
        )

    def test_ignores_tags_that_are_not_versions(self):
        self.assertEqual(releases(["v1.0", "2026.01", "deploy-test", ""]), [Version(2026, 1)])


class NextReleaseTest(unittest.TestCase):
    def test_the_first_release_of_a_year_is_01(self):
        self.assertEqual(str(next_release([], 2026)), "2026.01")
        self.assertEqual(str(next_release(["2026.07", "2026.07a"], 2027)), "2027.01")

    def test_counts_up_within_the_year_past_patches(self):
        self.assertEqual(str(next_release(["2026.01", "2026.02", "2026.02a"], 2026)), "2026.03")
        self.assertEqual(str(next_release(["2026.99"], 2026)), "2026.100")

    def test_refuses_a_year_older_than_the_latest_release(self):
        with self.assertRaises(VersionError):
            next_release(["2027.01"], 2026)


class NextPatchTest(unittest.TestCase):
    def test_patches_the_latest_release(self):
        self.assertEqual(str(next_patch(["2026.01", "2026.02"])), "2026.02a")
        self.assertEqual(str(next_patch(["2026.02", "2026.02a"])), "2026.02b")
        self.assertEqual(str(next_patch(["2026.12", "2027.01"])), "2027.01a")

    def test_needs_a_release_and_a_letter_left(self):
        for tags in ([], ["2026.01z"]):
            with self.subTest(tags=tags), self.assertRaises(VersionError):
                next_patch(tags)


class RunningTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.file = Path(directory.name) / "VERSION"

    def test_reads_the_version_the_build_wrote(self):
        self.file.write_text("2026.03a\n")

        self.assertEqual(running(self.file), "2026.03a")

    def test_is_dev_without_one(self):
        self.assertEqual(running(self.file), "dev")
        self.file.write_text("\n")
        self.assertEqual(running(self.file), "dev")


class CommandTest(unittest.TestCase):
    def test_next_reads_the_tags(self):
        self.assertEqual(_run("next", tags="2026.01\n2026.02\n"), (0, "2026.03"))
        self.assertEqual(_run("next", "--patch", tags="2026.01\n2026.02\n"), (0, "2026.02a"))
        self.assertEqual(_run("next", tags="", year=2027), (0, "2027.01"))

    def test_latest(self):
        self.assertEqual(_run("latest", tags="2026.02a\n2026.10\n2026.09\n"), (0, "2026.10"))

    def test_check(self):
        self.assertEqual(_run("check", "2026.01b"), (0, ""))

    def test_failures_print_nothing_and_exit_1(self):
        for argv, tags in ((("check", "2026.1"), ""), (("next", "--patch"), ""), (("latest",), "v1.0")):
            with self.subTest(argv=argv):
                self.assertEqual(_run(*argv, tags=tags), (1, ""))


if __name__ == "__main__":
    unittest.main()
