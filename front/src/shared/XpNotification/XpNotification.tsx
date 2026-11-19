import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Card, Progress, Tag, Typography } from "antd";
import { useAppStore } from "../../AppSlice";
import { useTranslation } from "react-i18next";
import type { AchievementDto, LevelDto } from "../../api/generated/model";
import type { LevelProgress } from "../../model/levelProgress";
import { VectorGraphics } from "../../lib/vectorGraphics";
import { achievementValueColor } from "../achievementValueColor";
import { skipTo, xpNotificationFrame, type XpStage } from "./xpNotificationTimeline";
import "./XpNotification.css";

const { Text, Title } = Typography;

const STROKE_COLOR = { '0%': '#108ee9', '100%': '#87d068' };

export function XpNotification() {
    const { t } = useTranslation();
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
        let request = requestAnimationFrame(function tick() {
            setClock({ of: xpNotification, ms: performance.now() - startRef.current });
            request = requestAnimationFrame(tick);
        });
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

    const progress = (label: string, bar: LevelProgress, style?: CSSProperties) => (
        <div className="xp-progress-container" style={{ marginTop: '12px', ...style }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    {label}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    {bar.xpInLevel} / {bar.xpNeeded} XP
                </Text>
            </div>
            <Progress percent={bar.percent} strokeColor={STROKE_COLOR} showInfo={false} size="small" />
        </div>
    );

    const earned = (levelTag: boolean) => (
        <div className="xp-gained">
            <Text strong className="xp-gained-text">
                {t("xpNotification.earned", { amount: shown.xp_gained })}
            </Text>
            {levelTag && (
                <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px', marginTop: '4px' }}>
                    {levelName}
                </Tag>
            )}
        </div>
    );

    const levelUp = (
        <div className="xp-level-up">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '8px', animation: 'pulse 2s ease-in-out infinite' }}>
                ⭐
            </span>
            <Text strong className="xp-level-up-text">
                {t("xpNotification.levelUp")}
            </Text>
            <Tag color="gold" style={{ fontSize: '14px', padding: '4px 12px', marginTop: '4px' }}>
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
                        {next && progress(progressTo(next), bar, { opacity: 0, height: 0, overflow: 'hidden' })}
                    </>
                )}
                {stage === "new-level-progress" && (
                    <>
                        {levelUp}
                        {next && progress(progressTo(next), bar, { transition: 'opacity 0.2s ease-in' })}
                    </>
                )}
            </div>
        );
    };

    const renderAchievementPage = (achievement: AchievementDto, opacity: number) => (
        <div className="xp-notification-page achievement-page" style={{ opacity }}>
            <div className="achievement-unlocked">
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>
                    {VectorGraphics.ACHIEVEMENTS}
                </span>
                <Text strong className="achievement-unlocked-text">
                    {t("achievement.unlocked") || "Achievement Unlocked!"}
                </Text>
                <Title level={4} style={{ margin: '12px 0 8px 0', fontSize: '1.2rem' }}>
                    {achievement.title}
                </Title>
                <Text type="secondary" style={{ fontSize: '0.9rem', display: 'block', marginBottom: '12px' }}>
                    {achievement.description}
                </Text>
                <Tag color={achievementValueColor(achievement.value)} style={{ fontSize: '14px', padding: '4px 12px', fontWeight: 600 }}>
                    {achievement.value} {t("achievement.points") || "pts"}
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
