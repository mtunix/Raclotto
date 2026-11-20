import { useState } from "react";
import { Card, Flex, Switch, Tag, Typography, message } from "antd";
import { FireOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { updateMe } from "../../api/generated/endpoints/auth/auth";
import { useGetIngredientOfTheHour } from "../../api/generated/endpoints/events/events";
import { useAuthStore } from "../../AuthSlice";
import { mutateMe, onErrorRetry } from "../../lib/api/swrHooks";
import { formatNumber, formatTime, useLanguage } from "../../lib/language";
import { displayName } from "../displayName";
import "./IngredientOfTheHourCard.css";

/** The session's ingredient of the hour; it changes with the first roll after its hour, so it is polled. */
export function useIngredientOfTheHour(sessionKey: string) {
    return useGetIngredientOfTheHour({ session_key: sessionKey }, {
        swr: { enabled: !!sessionKey, onErrorRetry, refreshInterval: 30000, revalidateOnFocus: true },
    });
}

/** Whether every pan the signed-in user rolls gets the ingredient of the hour; saved on their profile. */
function AlwaysAddSwitch() {
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const [saving, setSaving] = useState(false);

    function onChange(checked: boolean) {
        setSaving(true);
        void updateMe({ add_ingredient_of_the_hour: checked })
            .then((me) => {
                setUser(me);
                void mutateMe();
            })
            .catch((e: unknown) => {
                console.error("Failed to save the ingredient of the hour choice:", e);
                message.error(t("common.saveFailed"));
            })
            .finally(() => setSaving(false));
    }

    return (
        <Flex align="center" gap={8} className="ingredient-of-the-hour-switch">
            <Switch
                checked={user?.add_ingredient_of_the_hour ?? false}
                onChange={onChange}
                loading={saving}
                disabled={!user}
                aria-label={t("ingredientOfTheHour.alwaysAdd")}
            />
            <Typography.Text>{t("ingredientOfTheHour.alwaysAdd")}</Typography.Text>
        </Flex>
    );
}

export function IngredientOfTheHourCard({ sessionKey, optIn = false }: { sessionKey: string; optIn?: boolean }) {
    const { t } = useTranslation();
    const language = useLanguage();
    const { data } = useIngredientOfTheHour(sessionKey);
    if (!data) return null;
    const { ingredient, chosen_at, bonus_xp } = data;

    return (
        <Card className="ingredient-of-the-hour" classNames={{ body: "ingredient-of-the-hour-body" }}>
            <Flex align="center" gap={16} wrap="wrap">
                <span className="ingredient-of-the-hour-icon" aria-hidden>
                    <FireOutlined />
                </span>
                <Flex vertical className="ingredient-of-the-hour-text">
                    <Typography.Text type="secondary" className="ingredient-of-the-hour-label">
                        {t("ingredientOfTheHour.title")}
                        {chosen_at && ` · ${t("ingredientOfTheHour.since", { time: formatTime(chosen_at, language) })}`}
                    </Typography.Text>
                    {ingredient ? (
                        <Flex align="center" gap={8} wrap="wrap">
                            <span className="ingredient-of-the-hour-name">{displayName(ingredient.name, t)}</span>
                            <Tag color="gold">+{formatNumber(bonus_xp, language)} XP</Tag>
                            {!ingredient.applicable && <Tag>{t("ingredient.nonApplicable")}</Tag>}
                        </Flex>
                    ) : (
                        <Typography.Text>{t("ingredientOfTheHour.none")}</Typography.Text>
                    )}
                </Flex>
                {optIn && <AlwaysAddSwitch />}
            </Flex>
        </Card>
    );
}
