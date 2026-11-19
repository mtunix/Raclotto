import React, { useState } from "react";
import { Button, Input, message, Modal } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { exportIngredients } from "../../../api/generated/endpoints/ingredients/ingredients";
import { copyToClipboard } from "../copyToClipboard";
import { wideButtonStyle } from "./sessionSettingsStyles";

/** Shows the session's ingredients as an export file and copies it right away. */
export function ExportIngredientsButton({ sessionKey }: { sessionKey: string }) {
    const { t } = useTranslation();
    const [exporting, setExporting] = useState(false);
    const [json, setJson] = useState<string | null>(null);

    async function onExport() {
        setExporting(true);
        try {
            const text = JSON.stringify(await exportIngredients({ session_key: sessionKey }), null, 2);
            setJson(text);
            copyToClipboard(text, t);
        } catch (e) {
            console.error("Failed to export ingredients:", e);
            message.error(t("settings.exportFailed") || "Failed to export ingredients");
        } finally {
            setExporting(false);
        }
    }

    return (
        <>
            <Button
                size="large"
                icon={<DownloadOutlined />}
                onClick={onExport}
                loading={exporting}
                disabled={!sessionKey}
                block
                style={wideButtonStyle}
            >
                {t("settings.export") || "Export"}
            </Button>
            <Modal
                title={t("settings.exportModalTitle") || "Export Ingredients"}
                open={json !== null}
                onCancel={() => setJson(null)}
                footer={[
                    <Button key="copy" icon={<CopyOutlined />} onClick={() => json && copyToClipboard(json, t)}>
                        {t("settings.copyToClipboard") || "Copy to Clipboard"}
                    </Button>,
                    <Button key="close" onClick={() => setJson(null)}>
                        {t("common.close") || "Close"}
                    </Button>,
                ]}
                width="80%"
                style={{ maxWidth: "1000px" }}
            >
                <Input.TextArea value={json ?? ""} readOnly rows={20} style={{ fontFamily: "monospace", fontSize: "14px" }} />
            </Modal>
        </>
    );
}
