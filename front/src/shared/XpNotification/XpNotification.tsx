import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, Progress, Tag, Typography } from "antd";
import { useAppStore } from "../../AppSlice";
import { useTranslation } from "react-i18next";
import type { AchievementDto, LevelDto } from "../../api/generated/model";
import type { LevelProgress } from "../../model/levelProgress";
import { formatNumber, useLanguage } from "../../lib/language";
import { VectorGraphics } from "../../lib/vectorGraphics";
import { achievementDescription, achievementTitle } from "../achievementText";
import { achievementValueColor } from "../achievementValueColor";
import { skipTo, xpNotificationFrame, type XpStage } from "./xpNotificationTimeline";
import "./XpNotification.css";
import { PROGRESS_GRADIENT } from "../progressGradient";

const { Text, Title } = Typography;


export function XpNotification() {
    const { t } = useTranslation();
    const language = useLanguage();
    const { xpNotification, hideXpNotification } = useAppStore();
    const { visible, reward, achievements } = xpNotification;
    // The clock belongs to one notification, so a new one never starts at the last one's end.
    const [clock, setClock] = useState({ of: xpNotification, ms: 0 });
    // A click moves the start back, which skips the timeline ahead.
    const startRef = useRef(0);

    const shown = visible && reward?.level ? reward : null;
    const elapsed = clock.of === xpNotification ? clock.ms : 0;
    const frame = shown ? xpNotificationFrame(shown, achievements, elapsed) : null;
    const done = shown !== null && frame === null;

    useEffect(() => {
        if (!shown) return;
        startRef.current = performance.now();
        let request = requestAnimationFrame(tick);
        // A declaration: the compiler bails out on a named function expression that schedules itself.
        function tick() {
            setClock({ of: xpNotification, ms: performance.now() - startRef.current });
            request = requestAnimationFrame(tick);
        }
        return () => cancelAnimationFrame(request);
    }, [shown, xpNotification]);

    useEffect(() => {
        if (done) hideXpNotification();
    }, [done, hideXpNotification]);

    if (!shown?.level || !frame) {
        return null;
    }

    const advance = () => {
        const now = performance.now() - startRef.current;
        startRef.current -= skipTo(shown, achievements, now) - now;
    };

    const levelName = t(shown.level.name, { defaultValue: shown.level.name });
    const progressTo = (level: LevelDto | string) =>
        t("xpNotification.progressTo", {
            level: typeof level === "string" ? level : t(level.name, { defaultValue: level.name }),
        });

    const progress = (label: string, bar: LevelProgress, className = "") => (
        <div className={`xp-progress-container ${className}`}>
            <div className="xp-progress-labels">
                <Text type="secondary" className="xp-progress-label">
                    {label}
                </Text>
                <Text type="secondary" className="xp-progress-label">
                    {formatNumber(bar.xpInLevel, language)} / {formatNumber(bar.xpNeeded, language)} XP
                </Text>
            </div>
            <Progress percent={bar.percent} strokeColor={PROGRESS_GRADIENT} showInfo={false} size="small" />
        </div>
    );

    const earned = (levelTag: boolean) => (
        <div className="xp-gained">
            <Text strong className="xp-gained-text">
                {t("xpNotification.earned", { amount: formatNumber(shown.xp_gained, language) })}
            </Text>
            {levelTag && (
                <Tag color="blue" className="xp-tag">
                    {levelName}
                </Tag>
            )}
        </div>
    );

    const levelUp = (
        <div className="xp-level-up">
            <span className="xp-level-up-star">
                ⭐
            </span>
            <Text strong className="xp-level-up-text">
                {t("xpNotification.levelUp")}
            </Text>
            <Tag color="gold" className="xp-tag">
                <strong>{levelName}</strong>
            </Tag>
        </div>
    );

    const renderXpPage = (stage: XpStage, bar: LevelProgress, opacity: number) => {
        const next = shown.next_level;
        return (
            <div className="xp-notification-page" style={{ opacity }}>
                {stage === "gaining" && (
                    <>
                        {earned(true)}
                        {next && progress(progressTo(next), bar)}
                    </>
                )}
                {stage === "filling-old-level" && (
                    <>
                        {earned(false)}
                        {progress(progressTo(levelName), bar)}
                    </>
                )}
                {stage === "level-up-message" && (
                    <>
                        {levelUp}
                        {/* Kept in the DOM, hidden, so the new level's bar appears without a jump. */}
                        {next && progress(progressTo(next), bar, "xp-progress-hidden")}
                    </>
                )}
                {stage === "new-level-progress" && (
                    <>
                        {levelUp}
                        {next && progress(progressTo(next), bar, "xp-progress-appearing")}
                    </>
                )}
            </div>
        );
    };

    const renderAchievementPage = (achievement: AchievementDto, opacity: number) => (
        <div className="xp-notification-page achievement-page" style={{ opacity }}>
            <div className="achievement-unlocked">
                <span className="achievement-unlocked-icon">
                    {VectorGraphics.ACHIEVEMENTS}
                </span>
                <Text strong className="achievement-unlocked-text">
                    {t("achievement.unlocked")}
                </Text>
                <Title level={4} className="achievement-unlocked-title">
                    {achievementTitle(achievement, t)}
                </Title>
                <Text type="secondary" className="achievement-unlocked-description">
                    {achievementDescription(achievement, t)}
                </Text>
                <Tag color={achievementValueColor(achievement.value)} className="xp-tag achievement-unlocked-points">
                    {formatNumber(achievement.value, language)} {t("achievement.points")}
                </Tag>
            </div>
        </div>
    );

    const cardClass =
        frame.page === "achievement"
            ? "achievement-card"
            : frame.stage === "level-up-message" || frame.stage === "new-level-progress"
                ? "level-up-card"
                : "";

    const notificationContent = (
        <div className="xp-notification-container visible">
            <Card
                className={`xp-notification-card ${cardClass}`}
                role="button"
                tabIndex={0}
                onClick={advance}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        advance();
                    }
                }}
            >
                <div className="xp-notification-content">
                    {frame.page === "xp"
                        ? renderXpPage(frame.stage, frame.bar, frame.opacity)
                        : renderAchievementPage(frame.achievement, frame.opacity)}
                </div>
            </Card>
        </div>
    );

    // Use portal to render outside the normal DOM hierarchy, ensuring it appears above modals
    return typeof document !== 'undefined' ? createPortal(notificationContent, document.body) : null;
}
