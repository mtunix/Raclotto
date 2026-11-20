import { Button, Card } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { RulesContent } from "./RulesContent";
import "./Rules.css";

export function RulesView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    // Opened straight from a link there is nothing to go back to.
    const firstPage = useLocation().key === "default";
    return (
        <div className="rules-page">
            <Card
                title={<span className="page-title">{t("rules.title")}</span>}
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
