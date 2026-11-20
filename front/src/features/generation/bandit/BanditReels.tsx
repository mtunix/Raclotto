import { Card, Col, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { columnSpan, type Reel, type ReelStatus } from "./reelSpin";
import "./bandit.css";

const { Text } = Typography;

const EMOJI_CLASS: Record<ReelStatus, string> = {
    idle: "bandit-stopped-emoji",
    spinning: "bandit-spinning-emoji",
    locked: "bandit-locked-emoji",
};

function ReelCard({ reel }: { reel: Reel }) {
    const { t } = useTranslation();
    const item = reel.items[reel.index];

    return (
        <Card className={`bandit-reel bandit-reel-${reel.status}`} classNames={{ body: "bandit-reel-body" }}>
            <div className="bandit-reel-window">
                {item ? (
                    <div className="bandit-reel-item">
                        <div className={`bandit-reel-emoji ${EMOJI_CLASS[reel.status]}`}>
                            {reel.emoji}
                        </div>
                        <div className="bandit-reel-ingredient">
                            <IngredientDisplay ingredient={item} variant="compact" showIcon={true} showTags={false} />
                        </div>
                    </div>
                ) : (
                    <Text type="secondary">{t("generate.banditNoItems")}</Text>
                )}
            </div>
        </Card>
    );
}

/** The reels side by side, each showing its current ingredient and emoji. */
export function BanditReels({ reels }: { reels: Reel[] }) {
    const span = columnSpan(reels.length);
    return (
        <Row gutter={[16, 16]} className="bandit-reels">
            {reels.map((reel, index) => (
                // eslint-disable-next-line @eslint-react/no-array-index-key -- a reel is its column
                <Col key={index} {...span}>
                    <ReelCard reel={reel} />
                </Col>
            ))}
        </Row>
    );
}
