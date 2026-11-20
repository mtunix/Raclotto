import { message } from "antd";

/** Copy and say whether it worked. */
export function copyToClipboard(text: string, t: (key: string) => string): Promise<void> {
    return navigator.clipboard
        .writeText(text)
        .then(() => {
            message.success(t("settings.copiedToClipboard"));
        })
        .catch((err) => {
            console.error("Failed to copy to clipboard:", err);
            message.error(t("settings.copyFailed"));
        });
}
