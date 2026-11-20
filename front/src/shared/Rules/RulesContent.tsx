import { Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Title, Paragraph } = Typography;

// Each section is rules.<key>Title and rules.<key>Body; the XP bonuses are a list of their own.
const SECTIONS = ["join", "roll", "rate", "xp", "levels", "achievements", "events", "end"] as const;
const XP_BONUSES = [
    "xpBonusWildcardSpicy",
    "xpBonusWildcard",
    "xpBonusSpicySweet",
    "xpBonusPrepType",
    "xpBonusCheese",
    "xpBonusIngredientOfTheHour",
];

/** How a Raclotto evening works, from joining a session to its recap. */
export function RulesContent() {
    const { t } = useTranslation();
    return (
        <Typography>
            <Paragraph>{t("rules.intro")}</Paragraph>
            {SECTIONS.map((section) => (
                <section key={section}>
                    <Title level={4}>{t(`rules.${section}Title`)}</Title>
                    <Paragraph>{t(`rules.${section}Body`)}</Paragraph>
                    {section === "xp" && (
                        <ul>
                            {XP_BONUSES.map((bonus) => (
                                <li key={bonus}>{t(`rules.${bonus}`)}</li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </Typography>
    );
}
