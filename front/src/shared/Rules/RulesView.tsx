import { Button, Card } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { RulesContent } from "./RulesContent";

export function RulesView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    // Opened straight from a link there is nothing to go back to.
    const firstPage = useLocation().key === "default";
    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 16px 48px" }}>
            <Card
                title={<span style={{ fontWeight: 600, fontSize: "24px", letterSpacing: "-0.022em" }}>{t("rules.title")}</span>}
                extra={
                    <Button icon={<ArrowLeftOutlined />} onClick={() => (firstPage ? navigate("/") : navigate(-1))}>
                        {t("common.back")}
                    </Button>
                }
            >
                <RulesContent />
            </Card>
        </div>
    );
}
