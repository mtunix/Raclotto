import { Card, Col, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { columnSpan } from "./reelSpin";
import "./bandit.css";

const { Text } = Typography;

interface SlotMachineProps {
    columns: number;
    canSpin: boolean;
    onSpin: () => void;
}

/** The machine at rest: `columns` covered reels and the lever, a button; the whole of it clickable when it can spin. */
export function SlotMachine({ columns, canSpin, onSpin }: SlotMachineProps) {
    const { t } = useTranslation();
    const span = columnSpan(columns);

    return (
        <Card
            className={canSpin ? "slot-machine slot-machine-ready" : "slot-machine"}
            classNames={{ body: "slot-machine-body" }}
            onClick={canSpin ? onSpin : undefined}
        >
            <div className="slot-machine-marquee">
                <Text className="slot-machine-title">🎰 RACLOTTO 🎰</Text>
            </div>

            <Row gutter={16} className="slot-machine-reels">
                {Array.from({ length: columns }, (_, index) => (
                    <Col key={index} {...span}>
                        <div className="slot-machine-reel">
                            <div className="slot-machine-mystery">{index % 2 === 0 ? "❓" : "✨"}</div>
                            <div className="slot-machine-shine" />
                        </div>
                    </Col>
                ))}
            </Row>

            <div className="slot-machine-lever">
                {/* No handler of its own: its click, by mouse, key or screen reader, bubbles to the machine's. */}
                <button type="button" disabled={!canSpin} className="slot-machine-button">
                    <Text className="slot-machine-button-label">
                        {canSpin
                            ? t("generate.banditSpin")
                            : t("generate.banditCannotSpin")}
                    </Text>
                </button>
            </div>
        </Card>
    );
}
