import React, {useState, useEffect, useRef} from "react";
import {Button, Row, Col, Form, Rate, Spin, Card, Typography, Divider, Checkbox, Tabs, Modal, InputNumber, Input, Slider} from "antd";
import {BanditView} from "./BanditView";
import {Api} from "../../../lib/api";
import {useIngredients, usePrepTypes, useAvailableIngredientCounts} from "../../../lib/api/swrHooks";
import {IngredientType} from "../../../model/ingredient";
import {Pan} from "../../../model/pan";
import {Util} from "../../../lib/util";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../../../AppSlice";
import {useAuthStore} from "../../../AuthSlice";
import {useIngredientStore} from "../../../store/ingredientStore";
import {IngredientDisplay} from "../../../shared/components/common/IngredientDisplay";
import {GenerationAnimation} from "../animations/GenerationAnimation";
import styles from "../GenerateView.module.css";
import { PanResultModal } from "./PanResultModal";
import { IngredientCountControl } from "./IngredientCountControl";
import { LegacyView } from "./LegacyView";
import { PreparationTypeCard } from "./PreparationTypeCard";
import { CheeseSlider } from "./CheeseSlider";
import { useIngredientCount } from "../hooks/useIngredientCount";
import { 
    getLocalStorageNumber, 
    getRandomEmoji, 
    getIngredientTypeCount,
    SAUCE_ICONS,
    INGREDIENT_ICONS
} from "../utils/generateViewUtils";

const {Title, Text} = Typography;

export function GenerateView() {
    let { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const currentUser = useAuthStore((state) => state.user);
    const showXpNotification = useAppStore((state) => state.showXpNotification);
    const setUser = useAuthStore((state) => state.setUser);
    
    // Ingredient store hooks
    const { 
        ingredientCount: storedFillCount, 
        sauceCount: storedSauceCount,
        setIngredientCount,
        setSauceCount,
    } = useIngredientStore();
    const [rollPreparationType, setRollPreparationType] = useState(false);
    const [rollCheese, setRollCheese] = useState(false);
    const [isBanditResult, setIsBanditResult] = useState(false);
    const sessionKey = session?.key || "";

    // Use SWR hooks for data fetching
    const { data: ingredients = [] } = useIngredients(sessionKey);
    const { data: prepTypes = [] } = usePrepTypes(sessionKey);
    const { data: availableCounts = null } = useAvailableIngredientCounts(sessionKey);

    // Initialize with stored values from ingredient store, fallback to localStorage
    const totalFillCount = getIngredientTypeCount(ingredients, IngredientType.FILL);
    const totalSauceCount = getIngredientTypeCount(ingredients, IngredientType.SAUCE);
    const availableFillCount = availableCounts?.fill_count ?? totalFillCount;
    const availableSauceCount = availableCounts?.sauce_count ?? totalSauceCount;

    // Use custom hooks for count management
    const fillCountHook = useIngredientCount(
        storedFillCount || getLocalStorageNumber("numFill"), 
        "numFill", 
        setIngredientCount, 
        availableFillCount
    );
    const sauceCountHook = useIngredientCount(
        storedSauceCount || getLocalStorageNumber("numSauce"), 
        "numSauce", 
        setSauceCount, 
        availableSauceCount
    );
    
    let [numFill, setNumFill] = [fillCountHook.count, fillCountHook.updateCount];
    let [numSauce, setNumSauce] = [sauceCountHook.count, sauceCountHook.updateCount];
    let [generated, setGenerated] = useState<Pan | null>(null);
    let [waiting, setWaiting] = useState(false);
    let [showAnimation, setShowAnimation] = useState(false);
    let [showResultModal, setShowResultModal] = useState(false);
    let [animationFading, setAnimationFading] = useState(false);
    const animationStartTimeRef = useRef<number | null>(null);
    const apiCompleteRef = useRef<boolean>(false);
    const animationCompleteRef = useRef<boolean>(false);
    const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [apiComplete, setApiComplete] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(false);
    const [animationDuration, setAnimationDuration] = useState(3000); // Default duration
    const [visibleIngredients, setVisibleIngredients] = useState<Set<number>>(new Set());
    const animationTriggerRef = useRef<number[]>([]);

    // Get available ingredients for animation
    const availableIngredients = ingredients.filter(i => i.available && (i.applicable !== false));

    // Update to maximum when available counts change, but only if user hasn't customized values
    useEffect(() => {
        if (availableCounts) {
            // Check if user has customized values (stored in Zustand)
            const hasCustomizedValues = storedFillCount > 0 || storedSauceCount > 0;
            
            if (!hasCustomizedValues) {
                // Only set defaults if user hasn't customized anything
                // Set default values, but ensure at least one type is selected
                if (availableCounts.fill_count > 0) {
                    const newFillCount = availableCounts.fill_count;
                    setNumFill(newFillCount);
                    localStorage.setItem("numFill", String(newFillCount));
                    setIngredientCount(newFillCount);
                } else {
                    // If no fills available, ensure sauce is set if available
                    if (availableCounts.sauce_count > 0 && numSauce === 0) {
                        const newSauceCount = availableCounts.sauce_count;
                        setNumSauce(newSauceCount);
                        localStorage.setItem("numSauce", String(newSauceCount));
                        setSauceCount(newSauceCount);
                    }
                }
                if (availableCounts.sauce_count > 0) {
                    const newSauceCount = availableCounts.sauce_count;
                    setNumSauce(newSauceCount);
                    localStorage.setItem("numSauce", String(newSauceCount));
                    setSauceCount(newSauceCount);
                } else {
                    // If no sauces available, ensure fill is set if available
                    if (availableCounts.fill_count > 0 && numFill === 0) {
                        const newFillCount = availableCounts.fill_count;
                        setNumFill(newFillCount);
                        localStorage.setItem("numFill", String(newFillCount));
                        setIngredientCount(newFillCount);
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableCounts, setIngredientCount, setSauceCount, storedFillCount, storedSauceCount]);

    function closeModal() {
        setShowResultModal(false);
        setShowAnimation(false);
        setGenerated(null);
        setIsBanditResult(false);
        apiCompleteRef.current = false;
        animationCompleteRef.current = false;
        setApiComplete(false);
        setAnimationComplete(false);
        setAnimationFading(false);
        animationStartTimeRef.current = null;
        setVisibleIngredients(new Set());
        animationTriggerRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        animationTriggerRef.current = [];
    }

    function onRating(rating: number) {
        if (generated && sessionKey) {
            Api.rate(sessionKey, generated.id, rating).then(() => {
                // Rating successfully submitted
            }).catch((error) => {
                console.error("Failed to submit rating:", error);
            });
        }
    }

    function onGenerateClicked() {
        // If rolling preparation type, randomly select one
        let preparationTypeId: number | undefined = undefined;
        if (rollPreparationType && prepTypes.length > 0) {
            const randomIndex = Math.floor(Math.random() * prepTypes.length);
            preparationTypeId = prepTypes[randomIndex].id;
        }
        
        handleGenerate(numFill, numSauce, preparationTypeId, rollCheese);
    }

    function canGenerate(): boolean {
        if (!Util.isNumeric(numFill) || !Util.isNumeric(numSauce)) {
            return false;
        }

        // At least one ingredient type must be selected
        if (numFill <= 0 && numSauce <= 0) {
            return false;
        }

        if (availableCounts) {
            return (numFill > 0 || numSauce > 0)
                && (numFill === 0 || numFill <= availableCounts.fill_count)
                && (numSauce === 0 || numSauce <= availableCounts.sauce_count);
        }

        // Fallback to total ingredients if available counts not loaded
        return (numFill > 0 || numSauce > 0)
            && (numFill === 0 || numFill <= ingredients.filter(i => i.type === IngredientType.FILL && i.available).length)
            && (numSauce === 0 || numSauce <= ingredients.filter(i => i.type === IngredientType.SAUCE && i.available).length);
    }

    // Custom hook for ingredient count management (moved to separate file)
    // useIngredientCount is now imported from useIngredientCount.ts

    async function handleGenerate(numFill: number, numSauce: number, preparationTypeId?: number, rollCheese?: boolean) {
        if (!sessionKey) return;
        
        // Reset state
        apiCompleteRef.current = false;
        animationCompleteRef.current = false;
        setApiComplete(false);
        setAnimationComplete(false);
        setAnimationFading(false);
        setGenerated(null);
        setIsBanditResult(false);
        setShowResultModal(false);
        setShowAnimation(false);
        
        // Start animation
        setShowAnimation(true);
        setWaiting(true);
        animationStartTimeRef.current = Date.now();
        localStorage.setItem("numFill", String(numFill));
        localStorage.setItem("numSauce", String(numSauce));
        
        // Also sync with ingredient store
        setIngredientCount(numFill);
        setSauceCount(numSauce);
        
        // Start animation timer - will be updated when animation reports its duration
        animationTimerRef.current = setTimeout(() => {
            animationCompleteRef.current = true;
            setAnimationComplete(true);
        }, animationDuration);
        
        try {
            // Store old XP before generation
            const oldXP = currentUser?.experience_points || 0;
            const oldLevelId = currentUser?.level?.id;

            const data = await Api.generate(sessionKey, numFill, numSauce, preparationTypeId, rollCheese);
            if (data && "generated" in data && data.generated) {
                setGenerated(data.generated);
                apiCompleteRef.current = true;
                setApiComplete(true);

                // Extract achievements from response
                const achievements = data.achievements || [];

                // Fetch updated user profile to get new XP
                if (currentUser?.id) {
                    try {
                        const updatedProfile = await Api.getUserProfile(currentUser.id);
                        const newXP = updatedProfile.experience_points || 0;
                        const newLevel = updatedProfile.level;
                        const nextLevel = updatedProfile.next_level || null;
                        const levelUp = oldLevelId !== undefined && newLevel?.id !== oldLevelId && newLevel?.id !== undefined;

                        // Update auth store with new user data
                        if (currentUser) {
                            setUser({
                                ...currentUser,
                                experience_points: newXP,
                                level: newLevel,
                                next_level: nextLevel,
                            });
                        }

                        // Show XP notification if XP increased
                        if (newXP > oldXP && newLevel) {
                            const xpGained = newXP - oldXP;
                            showXpNotification(xpGained, oldXP, newXP, newLevel, nextLevel, levelUp, achievements);
                        }
                    } catch (profileError) {
                        console.error("Failed to fetch updated user profile:", profileError);
                        // Continue even if profile fetch fails
                    }
                }
            } else {
                // If no data, still mark as complete
                apiCompleteRef.current = true;
                setApiComplete(true);
                if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
                setWaiting(false);
                setShowAnimation(false);
            }
        } catch (error) {
            console.error("Failed to generate pan:", error);
            apiCompleteRef.current = true;
            setApiComplete(true);
            if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
            setWaiting(false);
            setShowAnimation(false);
        }
    }

    async function handleBanditGenerate(pan: Pan): Promise<void> {
        // For bandit mode, the pan is already generated by the API
        // The result is shown in the bandit modal itself, not a separate modal
        if (!sessionKey) return;
        
        // Just track that generation is complete (for any background processing)
        apiCompleteRef.current = true;
        animationCompleteRef.current = true;
        setApiComplete(true);
        setAnimationComplete(true);
    }

    function handleBanditRating(rating: number, panId: number) {
        // Handle rating for bandit-generated pan
        if (!sessionKey) return;
        Api.rate(sessionKey, panId, rating).then(() => {
            // Rating successfully submitted
        }).catch((error) => {
            console.error("Failed to rate pan:", error);
        });
    }

    // Effect to check when both API and animation are complete
    useEffect(() => {
        if (apiComplete && animationComplete && generated && !showResultModal) {
            // Show modal immediately, but keep animation visible for 250ms more
            setWaiting(false);
            setShowResultModal(true);
            setAnimationFading(true);
            
            // Hide animation after 250ms fade-out
            const fadeTimer = setTimeout(() => {
                setShowAnimation(false);
                setAnimationFading(false);
            }, 250);
            
            return () => clearTimeout(fadeTimer);
        }
    }, [apiComplete, animationComplete, generated, showResultModal]);

    // Effect to trigger slot machine animations when modal opens
    useEffect(() => {
        if (showResultModal && generated && !isBanditResult) {
            // Reset visible ingredients
            setVisibleIngredients(new Set());
            
            // Get all ingredients and sauces
            const fillIngredients = generated.ingredients.filter(i => i.type === IngredientType.FILL);
            const sauceIngredients = generated.ingredients.filter(i => i.type === IngredientType.SAUCE);
            const allItems = [...fillIngredients, ...sauceIngredients];
            
            // Animate items one by one with staggered delays
            const timeoutIds: number[] = [];
            allItems.forEach((item, index) => {
                const timeoutId = window.setTimeout(() => {
                    setVisibleIngredients(prev => {
                        const newSet = new Set(prev);
                        newSet.add(item.id);
                        return newSet;
                    });
                }, index * 150); // 150ms delay between each item
                timeoutIds.push(timeoutId);
            });
            animationTriggerRef.current = timeoutIds;
            
            return () => {
                timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
            };
        }
    }, [showResultModal, generated, isBanditResult]);

    // Effect to store generated ingredients in the ingredient store
    useEffect(() => {
        if (generated && showResultModal && !isBanditResult) {
            const fillIngredients = generated.ingredients.filter(i => i.type === IngredientType.FILL);
            const sauceIngredients = generated.ingredients.filter(i => i.type === IngredientType.SAUCE);
            setIngredientCount(fillIngredients.length);
            setSauceCount(sauceIngredients.length);
        }
    }, [generated, showResultModal, isBanditResult, setIngredientCount, setSauceCount]);

    // CheeseSlider component (moved to separate file)
    // CheeseSlider is now imported from CheeseSlider.tsx

    const handleUpdateFill = (value: number) => {
        setNumFill(value);
        localStorage.setItem("numFill", String(value));
        setIngredientCount(value);
    };

    const handleUpdateSauce = (value: number) => {
        setNumSauce(value);
        localStorage.setItem("numSauce", String(value));
        setSauceCount(value);
    };

    return (
        <>
            {showAnimation && (
                <GenerationAnimation 
                    ingredients={availableIngredients}
                    fading={animationFading}
                    onDurationChange={(duration) => {
                        setAnimationDuration(duration);
                        // Update the timer if animation hasn't completed yet
                        if (!animationCompleteRef.current && animationTimerRef.current) {
                            clearTimeout(animationTimerRef.current);
                            animationTimerRef.current = setTimeout(() => {
                                animationCompleteRef.current = true;
                                setAnimationComplete(true);
                            }, duration);
                        }
                    }}
                />
            )}
            
            <PanResultModal
                open={showResultModal}
                pan={generated}
                isBanditResult={isBanditResult}
                rollCheese={rollCheese}
                onClose={closeModal}
                onRating={onRating}
            />

            {waiting && !showAnimation && (
                <div className={styles.loadingContainer}>
                    <Spin size="large" />
                </div>
            )}

            {!waiting && !showResultModal && (
                <div className={styles.paddingVertical8}>
                    <Tabs
                        defaultActiveKey="legacy"
                        items={[
                            {
                                key: "legacy",
                                label: <span className={styles.tabLabel}>
                                    {t("generate.legacyMode") || "Legacy"}
                                </span>,
                                children: (
                                    <LegacyView
                                        t={t}
                                        numFill={numFill}
                                        numSauce={numSauce}
                                        availableFillCount={availableFillCount}
                                        availableSauceCount={availableSauceCount}
                                        totalFillCount={totalFillCount}
                                        totalSauceCount={totalSauceCount}
                                        canGenerate={canGenerate}
                                        onGenerateClicked={onGenerateClicked}
                                        rollPreparationType={rollPreparationType}
                                        setRollPreparationType={setRollPreparationType}
                                        rollCheese={rollCheese}
                                        setRollCheese={setRollCheese}
                                        onUpdateFill={handleUpdateFill}
                                        onUpdateSauce={handleUpdateSauce}
                                    />
                                )
                            },
                            {
                                key: "bandit",
                                label: <span className={styles.tabLabel}>
                                    {t("generate.banditMode") || "Bandit"}
                                </span>,
                                children: (
                                    <BanditView
                                        ingredients={ingredients}
                                        prepTypes={prepTypes}
                                        availableCounts={availableCounts}
                                        sessionKey={sessionKey}
                                        rollPreparationType={rollPreparationType}
                                        onRollPreparationTypeChange={setRollPreparationType}
                                        rollCheese={rollCheese}
                                        onRollCheeseChange={setRollCheese}
                                        onGenerate={handleBanditGenerate}
                                        onRating={handleBanditRating}
                                    />
                                )
                            }
                        ]}
                    />
                </div>
            )}
        </>
    );
}

