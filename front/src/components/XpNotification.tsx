import React, { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import { Card, Progress, Tag, Typography } from "antd";
import { useAppStore } from "../AppSlice";
import { useTranslation } from "react-i18next";
import { Achievement } from "../model/achievement";
import { VectorGraphics } from "../lib/vectorGraphics";
import "./XpNotification.css";

const { Text, Title } = Typography;

type PageType = 'xp' | 'achievement';
type LevelUpPhase = 'filling-old-level' | 'level-up-message' | 'new-level-progress';

export function XpNotification() {
    const { t } = useTranslation();
    const { xpNotification, hideXpNotification } = useAppStore();
    const [progressPercent, setProgressPercent] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentPage, setCurrentPage] = useState<PageType>('xp');
    const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
    const [pageOpacity, setPageOpacity] = useState(1);
    const [levelUpPhase, setLevelUpPhase] = useState<LevelUpPhase>('filling-old-level');
    const [showLevelUpMessage, setShowLevelUpMessage] = useState(false);
    const [animatedXPInLevel, setAnimatedXPInLevel] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!xpNotification.visible || !xpNotification.level) return;

        // Reset state when notification becomes visible
        setCurrentPage('xp');
        setCurrentAchievementIndex(0);
        setPageOpacity(1);
        setShowLevelUpMessage(false);
        setAnimatedXPInLevel(0);

        if (xpNotification.levelUp) {
            // For level up, we need to show: old level filling -> level up message -> new level progress
            setLevelUpPhase('filling-old-level');
            
            // When leveling up, oldXP was in the previous level
            // The current level's required_experience is the threshold we crossed
            // We'll calculate progress from oldXP towards the current level's required_experience
            const currentLevelRequiredXP = xpNotification.level.required_experience;
            
            // Calculate how much progress was made towards reaching the new level threshold
            // We need to find what the previous level's required_experience was
            // Since we don't have it, we'll estimate: if oldXP < currentLevelRequiredXP, 
            // we calculate progress from 0 to currentLevelRequiredXP
            // But actually, we should use the previous level's required_experience
            // For now, let's use a simpler approach: calculate progress from oldXP to currentLevelRequiredXP
            // Assuming the old level's "next level" threshold is the current level's required_experience
            const oldLevelProgress = xpNotification.oldXP < currentLevelRequiredXP
                ? Math.min(99, ((xpNotification.oldXP / currentLevelRequiredXP) * 100))
                : 99;
            
            // Start animation filling old level to 100%
            setIsAnimating(true);
            setProgressPercent(Math.min(oldLevelProgress, 100));
            
            const startTime = Date.now();
            const fillDuration = 2000; // 2 seconds to fill to 100%
            let animationFrameId: number;

            const animateFill = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fillDuration, 1);
                
                // Ease-out function for smooth animation
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentProgress = Math.min(oldLevelProgress, 100) + (100 - Math.min(oldLevelProgress, 100)) * easeOut;
                
                setProgressPercent(currentProgress);

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animateFill);
                } else {
                    setIsAnimating(false);
                    // After filling, show level up message
                    setProgressPercent(100);
                    // Small delay after filling to 100%
                    setTimeout(() => {
                        setShowLevelUpMessage(true);
                        setLevelUpPhase('level-up-message');
                        // After showing level up message for 2 seconds, transition to new level progress
                        phaseTimeoutRef.current = setTimeout(() => {
                            // Calculate values before state changes
                            const newLevelRequiredXP = xpNotification.level!.required_experience;
                            const newLevelNextXP = xpNotification.nextLevel?.required_experience || newLevelRequiredXP;
                            const newLevelProgress = calculateProgress(
                                xpNotification.newXP,
                                newLevelRequiredXP,
                                newLevelNextXP
                            );
                            
                            // Calculate final values
                            const finalXPInLevel = Math.max(0, xpNotification.newXP - newLevelRequiredXP);
                            const xpNeeded = newLevelNextXP - newLevelRequiredXP;
                            
                            // Use flushSync to force synchronous render so progress bar appears immediately
                            // Start with a tiny initial value (0.1%) so the progress bar is visible
                            flushSync(() => {
                                setShowLevelUpMessage(false);
                                setLevelUpPhase('new-level-progress');
                                setIsAnimating(true);
                                setProgressPercent(0.1); // Start with tiny value so bar is visible
                                setAnimatedXPInLevel(0);
                            });
                            
                            // Start animation immediately after render using setTimeout to ensure it runs after render
                            setTimeout(() => {
                                const newStartTime = Date.now();
                                const newDuration = 1500; // 1.5 seconds to show new level progress
                                
                                const animateNewLevel = () => {
                                    const newElapsed = Date.now() - newStartTime;
                                    const newProgress = Math.min(newElapsed / newDuration, 1);
                                    const easeOut = 1 - Math.pow(1 - newProgress, 3);
                                    
                                    // Calculate animated XP first
                                    const animatedXP = Math.round(finalXPInLevel * easeOut);
                                    setAnimatedXPInLevel(animatedXP);
                                    
                                    // Calculate progress bar percentage based on animated XP
                                    const currentNewProgress = xpNeeded > 0
                                        ? Math.min(100, Math.max(0.1, (animatedXP / xpNeeded) * 100))
                                        : 100;
                                    setProgressPercent(currentNewProgress);
                                    
                                    if (newProgress < 1) {
                                        requestAnimationFrame(animateNewLevel);
                                    } else {
                                        setIsAnimating(false);
                                        // Set final progress value (can be 0 if user has exactly the required XP)
                                        setProgressPercent(newLevelProgress);
                                        setAnimatedXPInLevel(finalXPInLevel);
                                    }
                                };
                                
                                // Start animation immediately
                                requestAnimationFrame(animateNewLevel);
                            }, 0);
                        }, 2000); // Show level up message for 2 seconds
                    }, 500); // Small delay after filling
                }
            };

            animationFrameId = requestAnimationFrame(animateFill);
        } else {
            // Normal XP gain (no level up)
            setLevelUpPhase('new-level-progress');
            
            // Calculate old progress percentage
            const oldProgress = calculateProgress(
                xpNotification.oldXP,
                xpNotification.level.required_experience,
                xpNotification.nextLevel?.required_experience || xpNotification.level.required_experience
            );

            // Calculate new progress percentage
            const newProgress = calculateProgress(
                xpNotification.newXP,
                xpNotification.level.required_experience,
                xpNotification.nextLevel?.required_experience || xpNotification.level.required_experience
            );

            // Start animation
            setIsAnimating(true);
            setProgressPercent(oldProgress);

            // Animate progress bar from old to new
            const startTime = Date.now();
            const duration = 2500; // 2.5 seconds
            let animationFrameId: number;
            
            // Calculate XP values for animation
            const oldXPInLevel = Math.max(0, xpNotification.oldXP - xpNotification.level.required_experience);
            const newXPInLevel = Math.max(0, xpNotification.newXP - xpNotification.level.required_experience);
            const xpNeeded = (xpNotification.nextLevel?.required_experience || xpNotification.level.required_experience) - xpNotification.level.required_experience;

            // Initialize animated XP
            setAnimatedXPInLevel(oldXPInLevel);

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease-out function for smooth animation
                const easeOut = 1 - Math.pow(1 - progress, 3);
                
                // Calculate animated XP first, then derive progress from it
                const animatedXP = Math.round(oldXPInLevel + (newXPInLevel - oldXPInLevel) * easeOut);
                setAnimatedXPInLevel(animatedXP);
                
                // Calculate progress bar percentage based on animated XP
                const currentProgress = xpNeeded > 0 
                    ? Math.min(100, Math.max(0, (animatedXP / xpNeeded) * 100))
                    : 100;
                setProgressPercent(currentProgress);

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    setIsAnimating(false);
                    setAnimatedXPInLevel(newXPInLevel);
                    setProgressPercent(newProgress);
                }
            };

            animationFrameId = requestAnimationFrame(animate);
        }

        // Page transition logic
        const PAGE_DISPLAY_DURATION = 3000; // 3 seconds per page
        const FADE_DURATION = 500; // 0.5 seconds fade
        const achievements = xpNotification.achievements || [];

        const scheduleNextTransition = (page: PageType, index: number) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                if (page === 'xp') {
                    // If there are achievements, transition to first achievement
                    if (achievements.length > 0) {
                        // Fade out XP page
                        setPageOpacity(0);
                        fadeTimeoutRef.current = setTimeout(() => {
                            setCurrentPage('achievement');
                            setCurrentAchievementIndex(0);
                            setPageOpacity(1);
                            // Schedule next transition for first achievement
                            scheduleNextTransition('achievement', 0);
                        }, FADE_DURATION);
                    } else {
                        // No achievements, hide notification
                        hideXpNotification();
                    }
                } else if (page === 'achievement') {
                    // Check if there are more achievements
                    const nextIndex = index + 1;
                    if (nextIndex < achievements.length) {
                        // Fade out current achievement
                        setPageOpacity(0);
                        fadeTimeoutRef.current = setTimeout(() => {
                            setCurrentAchievementIndex(nextIndex);
                            setPageOpacity(1);
                            // Schedule next transition for next achievement
                            scheduleNextTransition('achievement', nextIndex);
                        }, FADE_DURATION);
                    } else {
                        // No more achievements, hide notification
                        setPageOpacity(0);
                        fadeTimeoutRef.current = setTimeout(() => {
                            hideXpNotification();
                        }, FADE_DURATION);
                    }
                }
            }, PAGE_DISPLAY_DURATION);
        };

        // Start page transitions after XP page is shown (longer delay for level up)
        // For level up: fill old level (2s) + delay (0.5s) + level up message (2s) + new level progress (1.5s) + buffer (2s) = 9s
        // For normal: just the animation duration
        const xpPageDelay = xpNotification.levelUp ? 9000 : PAGE_DISPLAY_DURATION;
        
        // Override the timeout in scheduleNextTransition for XP page
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            if (currentPage === 'xp') {
                const achievements = xpNotification.achievements || [];
                // If there are achievements, transition to first achievement
                if (achievements.length > 0) {
                    // Fade out XP page
                    setPageOpacity(0);
                    fadeTimeoutRef.current = setTimeout(() => {
                        setCurrentPage('achievement');
                        setCurrentAchievementIndex(0);
                        setPageOpacity(1);
                        // Schedule next transition for first achievement
                        scheduleNextTransition('achievement', 0);
                    }, FADE_DURATION);
                } else {
                    // No achievements, hide notification
                    hideXpNotification();
                }
            }
        }, xpPageDelay);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            if (phaseTimeoutRef.current) {
                clearTimeout(phaseTimeoutRef.current);
            }
        };
    }, [xpNotification.visible, xpNotification.oldXP, xpNotification.newXP, xpNotification.level, xpNotification.nextLevel, xpNotification.achievements, xpNotification.levelUp, hideXpNotification]);

    const calculateProgress = (currentXP: number, levelXP: number, nextLevelXP: number): number => {
        if (!nextLevelXP || nextLevelXP <= levelXP) return 100;
        const xpInLevel = Math.max(0, currentXP - levelXP);
        const xpNeeded = nextLevelXP - levelXP;
        return Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
    };

    if (!xpNotification.visible || !xpNotification.level) {
        return null;
    }

    const currentXP = xpNotification.newXP;
    const levelXP = xpNotification.level.required_experience;
    const nextLevelXP = xpNotification.nextLevel?.required_experience || levelXP;
    const xpInLevel = Math.max(0, currentXP - levelXP);
    const xpNeeded = nextLevelXP - levelXP;

    const levelName = t(xpNotification.level.name, { defaultValue: xpNotification.level.name });
    const achievements = xpNotification.achievements || [];
    const currentAchievement = currentPage === 'achievement' && achievements[currentAchievementIndex] 
        ? achievements[currentAchievementIndex] 
        : null;

    const getValueColor = (value: number): string => {
        if (value >= 30) return 'red';
        if (value >= 15) return 'orange';
        if (value >= 10) return 'gold';
        if (value >= 5) return 'blue';
        return 'default';
    };

    const renderXpPage = () => {
        // For level up, show different content based on phase
        if (xpNotification.levelUp) {
            if (showLevelUpMessage) {
                // Show level up message, but keep progress bar container in DOM for smooth transition
                return (
                    <div className="xp-notification-page" style={{ opacity: pageOpacity }}>
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
                        {xpNotification.nextLevel && (
                            <div className="xp-progress-container" style={{ marginTop: '12px', opacity: 0, height: 0, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {t("xpNotification.progressTo", { level: t(xpNotification.nextLevel.name, { defaultValue: xpNotification.nextLevel.name }) })}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        0 / {xpNeeded} XP
                                    </Text>
                                </div>
                                <Progress
                                    percent={0}
                                    strokeColor={{
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }}
                                    showInfo={false}
                                    size="small"
                                />
                            </div>
                        )}
                    </div>
                );
            } else if (levelUpPhase === 'filling-old-level') {
                // Show old level filling to 100%
                // Calculate progress towards the new level threshold
                if (!xpNotification.level) return null;
                const currentLevelRequiredXP = xpNotification.level.required_experience;
                const progressXP = Math.round((progressPercent / 100) * currentLevelRequiredXP);
                
                return (
                    <div className="xp-notification-page" style={{ opacity: pageOpacity }}>
                        <div className="xp-gained">
                            <Text strong className="xp-gained-text">
                                {t("xpNotification.earned", { amount: xpNotification.xpGained })}
                            </Text>
                        </div>
                        <div className="xp-progress-container" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {t("xpNotification.progressTo", { level: levelName })}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {progressXP} / {currentLevelRequiredXP} XP
                                </Text>
                            </div>
                            <Progress
                                percent={progressPercent}
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                showInfo={false}
                                size="small"
                            />
                        </div>
                    </div>
                );
            } else {
                // Show new level progress
                return (
                    <div className="xp-notification-page" style={{ opacity: pageOpacity }}>
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
                        {xpNotification.nextLevel && (
                            <div className="xp-progress-container" style={{ marginTop: '12px', transition: 'opacity 0.2s ease-in' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {t("xpNotification.progressTo", { level: t(xpNotification.nextLevel.name, { defaultValue: xpNotification.nextLevel.name }) })}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {levelUpPhase === 'new-level-progress' ? (isAnimating ? animatedXPInLevel : xpInLevel) : xpInLevel} / {xpNeeded} XP
                                    </Text>
                                </div>
                                <Progress
                                    percent={progressPercent}
                                    strokeColor={{
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }}
                                    showInfo={false}
                                    size="small"
                                />
                            </div>
                        )}
                    </div>
                );
            }
        } else {
            // Normal XP gain (no level up)
            return (
                <div className="xp-notification-page" style={{ opacity: pageOpacity }}>
                    <div className="xp-gained">
                        <Text strong className="xp-gained-text">
                            {t("xpNotification.earned", { amount: xpNotification.xpGained })}
                        </Text>
                        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px', marginTop: '4px' }}>
                            {levelName}
                        </Tag>
                    </div>
                    
                    {xpNotification.nextLevel && (
                        <div className="xp-progress-container" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {t("xpNotification.progressTo", { level: t(xpNotification.nextLevel.name, { defaultValue: xpNotification.nextLevel.name }) })}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {isAnimating ? animatedXPInLevel : xpInLevel} / {xpNeeded} XP
                                </Text>
                            </div>
                            <Progress
                                percent={progressPercent}
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                showInfo={false}
                                size="small"
                            />
                        </div>
                    )}
                </div>
            );
        }
    };

    const renderAchievementPage = (achievement: Achievement) => (
        <div className="xp-notification-page achievement-page" style={{ opacity: pageOpacity }}>
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
                <Tag color={getValueColor(achievement.value)} style={{ fontSize: '14px', padding: '4px 12px', fontWeight: 600 }}>
                    {achievement.value} {t("achievement.points") || "pts"}
                </Tag>
            </div>
        </div>
    );

    const notificationContent = (
        <div className={`xp-notification-container ${xpNotification.visible ? 'visible' : ''}`}>
            <Card className={`xp-notification-card ${
                xpNotification.levelUp && currentPage === 'xp' && (showLevelUpMessage || levelUpPhase === 'new-level-progress') 
                    ? 'level-up-card' 
                    : currentPage === 'achievement' 
                        ? 'achievement-card' 
                        : ''
            }`}>
                <div className="xp-notification-content">
                    {currentPage === 'xp' ? renderXpPage() : currentAchievement ? renderAchievementPage(currentAchievement) : null}
                </div>
            </Card>
        </div>
    );

    // Use portal to render outside the normal DOM hierarchy, ensuring it appears above modals
    return typeof document !== 'undefined' ? createPortal(notificationContent, document.body) : null;
}
