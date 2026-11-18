// Pans and ingredients the old API wrote may have no name.
export function displayName(name: string | null, t: (key: string) => string): string {
    return name || t("common.unnamed");
}
