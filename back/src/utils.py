import os
import re
from enum import Enum
from os import path


def get_project_root() -> str:
    """As long as this file is not moved, the result of this function
    will be the absolut path of the mikado-server directory.

    Used to point to e.g. resources in a way that works, no matter
    which py-file gets executed.
    """
    path_this_file = path.abspath(__file__)
    root_dir = path.join(path_this_file, os.pardir, os.pardir)
    return path.abspath(root_dir)


def un_camel_case(s: str) -> str:
    return "_".join(re.sub(r'(?<=\w)([A-Z])', r' \1', s).lower().split())


def to_camel_case(snake_case_string: str) -> str:
    # converts snake_case to camelCase
    components = snake_case_string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def str_code_from_enum(e: Enum) -> str:
    """takes an enum instance and returns it as a string:
    ExampleEnum.this_is_an_example -> 'example_enum.this_is_an_example'
    """
    return un_camel_case(f"{e.__class__.__name__}.{e.name}")


if __name__ == "__main__":
    print(get_project_root())