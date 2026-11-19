import { Alert, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { type Availability, isRestricted } from "./banditLimits";

const { Text } = Typography;

/** How many fills and sauces the user's diet excludes; nothing when it excludes none. */
export function RestrictionsAlert({ fills, sauces }: { fills: Availability; sauces: Availability }) {
    const { t } = useTranslation();
    if (!isRestricted(fills) && !isRestricted(sauces)) return null;

    const line = (label: string, { allowed, total }: Availability) => (
        <Text>
            {label}: {allowed} / {total}
            <Text type="secondary"> ({total - allowed} {t("generate.excluded")})</Text>
        </Text>
    );

    return (
        <Alert
            type="info"
            title={t("generate.restrictionsApplied")}
            description={
                <div>
                    {isRestricted(fills) && line(t("generate.availableIngredients"), fills)}
                    {isRestricted(fills) && isRestricted(sauces) && <br />}
                    {isRestricted(sauces) && line(t("generate.availableSauces"), sauces)}
                </div>
            }
            style={{ marginBottom: "16px" }}
            showIcon
        />
    );
}
