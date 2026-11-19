import re


def un_camel_case(s: str) -> str:
    return "_".join(re.sub(r"(?<=\w)([A-Z])", r" \1", s).lower().split())


def to_camel_case(snake_case_string: str) -> str:
    # converts snake_case to camelCase
    components = snake_case_string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])
