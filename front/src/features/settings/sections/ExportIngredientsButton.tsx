import { useState } from "react";
import { Button, Input, message, Modal } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { exportIngredients } from "../../../api/generated/endpoints/ingredients/ingredients";
import { copyToClipboard } from "../../../shared/copyToClipboard";
import "../SettingsView.css";

/** Shows the session's ingredients as an export file and copies it right away. */
export function ExportIngredientsButton({ sessionKey }: { sessionKey: string }) {
    const { t } = useTranslation();
    const [exporting, setExporting] = useState(false);
    const [json, setJson] = useState<string | null>(null);

    function onExport() {
        setExporting(true);
        void exportIngredients({ session_key: sessionKey })
            .then((file) => {
                const text = JSON.stringify(file, null, 2);
                setJson(text);
                void copyToClipboard(text, t);
            })
            .catch((e: unknown) => {
                console.error("Failed to export ingredients:", e);
                message.error(t("settings.exportFailed"));
            })
            .finally(() => setExporting(false));
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
                className="settings-wide-button"
            >
                {t("settings.export")}
            </Button>
            <Modal
                title={t("settings.exportModalTitle")}
                open={json !== null}
                onCancel={() => setJson(null)}
                footer={[
                    <Button key="copy" icon={<CopyOutlined />} onClick={() => json && copyToClipboard(json, t)}>
                        {t("settings.copyToClipboard")}
                    </Button>,
                    <Button key="close" onClick={() => setJson(null)}>
                        {t("common.close")}
                    </Button>,
                ]}
                width="80%"
                className="settings-export-modal"
            >
                <Input.TextArea value={json ?? ""} readOnly rows={20} className="settings-export" />
            </Modal>
        </>
    );
}
