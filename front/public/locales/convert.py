import csv
import os
from collections import defaultdict
from enum import Enum, auto
import json
from pathlib import Path

"""Simple utility to deal with multilingual UI text.

Usage:
    Create a csv file as follows:
    category|identifier|en|de

    Set the language that is appropriate for the user.
    e.g.:
        resources.set_language(Language.en)

    Import resources from this module.

    Get the text in the correct language by calling
        resources[category][identifier]
    or
        resources.category[identifier]
"""


class _Resources:
    def __init__(self):
        self._resources = {}
        self._resource_cache = {
            "en": defaultdict(dict),
            "de": defaultdict(dict)
        }

        paths = [
            Path(f"{Path.cwd()}/actions.csv"),
            Path(f"{Path.cwd()}/interface.csv"),
            Path(f"{Path.cwd()}/entities.csv"),
            Path(f"{Path.cwd()}/errors.csv"),
            Path(f"{Path.cwd()}/table_data.csv"),
        ]

        for path in paths:
            self._parse_file(path.as_posix())

    def set_language(self, language: str):
        self._resources = self._resource_cache[language]

    def export(self):
        for language in self._resource_cache:
            with open(f"./{language}/interface.json", "w") as f:
                json.dump(self._resource_cache[language], f)

    def __getitem__(self, item):
        return self._resources[item]

    def __getattr__(self, item):
        return self._resources[item]

    def _parse_file(self, path):
        print(f"Reading: {path}")
        with open(path, newline='') as f:
            csv_file = csv.reader(f, delimiter="|", quotechar='"')

            header = next(csv_file)
            assert header[1] == "en" and header[2] == "de" and len(header) == 3

            for row in csv_file:
                if len(row) != 3:
                    break

                ident, resource_en, resource_de = row
                self._resource_cache["en"][ident] = resource_en
                self._resource_cache["de"][ident] = resource_de


resources: _Resources = _Resources()


if __name__ == "__main__":
    resources.set_language("en")
    print(resources.error_messages)
    resources.set_language("de")
    print(resources["error_messages"])
    resources.export()