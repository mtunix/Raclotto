import React, { useState } from "react";
import { Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { RulesContent } from "./RulesContent";

const SEEN_KEY = "rules_seen";

function seen(): boolean {
    try {
        return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
        // Without storage the rules show on every visit, which is still correct.
        return false;
    }
}

function markSeen(): void {
    try {
        localStorage.setItem(SEEN_KEY, "1");
    } catch {
        // See seen().
    }
}

/** The rules, once per browser, the first time someone opens a session. */
export function RulesIntroModal() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(() => !seen());

    function close() {
        markSeen();
        setOpen(false);
    }

    return (
        <Modal
            title={t("rules.firstVisitTitle")}
            open={open}
            onCancel={close}
            footer={
                <Button type="primary" onClick={close}>
                    {t("rules.gotIt")}
                </Button>
            }
            width={720}
        >
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                <RulesContent />
            </div>
        </Modal>
    );
}
