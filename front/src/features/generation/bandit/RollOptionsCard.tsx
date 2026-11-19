import { Card, Checkbox, Col, Row } from "antd";
import { useTranslation } from "react-i18next";

const checkboxStyle = { fontSize: "17px", fontWeight: 400, letterSpacing: "-0.022em" };

interface RollOptionsCardProps {
    rollPreparationType: boolean;
    onRollPreparationTypeChange: (checked: boolean) => void;
    rollCheese: boolean;
    onRollCheeseChange: (checked: boolean) => void;
    disabled: boolean;
}

export function RollOptionsCard(props: RollOptionsCardProps) {
    const { t } = useTranslation();
    return (
        <Row style={{ marginBottom: "32px" }}>
            <Col span={24}>
                <Card
                    style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "none" }}
                    styles={{ body: { padding: "20px 24px" } }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Checkbox
                            checked={props.rollPreparationType}
                            onChange={(e) => props.onRollPreparationTypeChange(e.target.checked)}
                            disabled={props.disabled}
                            style={checkboxStyle}
                        >
                            {t("generate.rollPreparationType")}
                        </Checkbox>
                        <Checkbox
                            checked={props.rollCheese}
                            onChange={(e) => props.onRollCheeseChange(e.target.checked)}
                            disabled={props.disabled}
                            style={checkboxStyle}
                        >
                            {t("generate.rollCheese")}
                        </Checkbox>
                    </div>
                </Card>
            </Col>
        </Row>
    );
}
