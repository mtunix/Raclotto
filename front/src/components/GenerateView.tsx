import React, {useState, useEffect, useRef} from "react";
import {Button, Row, Col, Form, Rate, Spin, Card, Typography, Divider, Checkbox, Tabs, Modal, InputNumber, Input, Slider} from "antd";
import {BanditView} from "./BanditView";
import {Api} from "../lib/api";
import {useIngredients, usePrepTypes, useAvailableIngredientCounts} from "../lib/api/swrHooks";
import {Ingredient, IngredientType} from "../model/ingredient";
import {Pan} from "../model/pan";
import {PrepType} from "../model/prepType";
import {Util} from "../lib/util";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../AppSlice";
import {useAuthStore} from "../AuthSlice";
import {IngredientDisplay} from "./common/IngredientDisplay";
import {GenerationAnimation} from "./GenerationAnimation";

const {Title, Text} = Typography;

// Sauce-related emojis for sauces
const SAUCE_ICONS = [
    "🍯", "🧀", "🥛", "🧈", "🥄", "🍶", "🧃", "🥤", "🍹", "🍷",
    "🍸", "🍺", "🍻", "🥂", "🍾", "🧊", "🍼", "🥃", "🧉", "🍵",
    "☕", "🧋", "🥤", "🧃", "🍯", "🧈", "🧀", "🥛", "🍶", "🍷"
];

// Ingredient-related emojis (non-sauce) for fills
const INGREDIENT_ICONS = [
    "🥗", "🍕", "🍔", "🌮", "🌯", "🥙", "🌭", "🍖", "🍗", "🥩",
    "🥓", "🍳", "🥚", "🥑", "🥒", "🥕", "🌽", "🥔", "🍅", "🥬",
    "🥦", "🍄", "🌶️", "🫑", "🧄", "🧅", "🍠", "🥜", "🌰", "🥖",
    "🥐", "🥨", "🥯", "🥞", "🧇", "🍞", "🥪", "🍝", "🍜", "🍲",
    "🍛", "🍣", "🍱", "🥟", "🥠", "🥡", "🍤", "🦐", "🦑", "🦞",
    "🦀", "🐟", "🐠", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🍰",
    "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪"
];

export function GenerateView() {
    let { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const currentUser = useAuthStore((state) => state.user);
    const showXpNotification = useAppStore((state) => state.showXpNotification);
    const setUser = useAuthStore((state) => state.setUser);
    const [rollPreparationType, setRollPreparationType] = useState(false);
    const [rollCheese, setRollCheese] = useState(false);
    const [isBanditResult, setIsBanditResult] = useState(false);
    const sessionKey = session?.key || "";

    // Use SWR hooks for data fetching
    const { data: ingredients = [] } = useIngredients(sessionKey);
    const { data: prepTypes = [] } = usePrepTypes(sessionKey);
    const { data: availableCounts = null } = useAvailableIngredientCounts(sessionKey);

    function getLocal(key: string): number {
        let value = localStorage.getItem(key);
        if (value) {
            return parseInt(value);
        }
        return 1;
    }

    let [numFill, setNumFill] = useState(getLocal("numFill"));
    let [numSauce, setNumSauce] = useState(getLocal("numSauce"));
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

    // Update to maximum when available counts change
    useEffect(() => {
        if (availableCounts) {
            // Set default values, but ensure at least one type is selected
            if (availableCounts.fill_count > 0) {
                setNumFill(availableCounts.fill_count);
                localStorage.setItem("numFill", String(availableCounts.fill_count));
            } else {
                // If no fills available, ensure sauce is set if available
                if (availableCounts.sauce_count > 0 && numSauce === 0) {
                    setNumSauce(availableCounts.sauce_count);
                    localStorage.setItem("numSauce", String(availableCounts.sauce_count));
                }
            }
            if (availableCounts.sauce_count > 0) {
                setNumSauce(availableCounts.sauce_count);
                localStorage.setItem("numSauce", String(availableCounts.sauce_count));
            } else {
                // If no sauces available, ensure fill is set if available
                if (availableCounts.fill_count > 0 && numFill === 0) {
                    setNumFill(availableCounts.fill_count);
                    localStorage.setItem("numFill", String(availableCounts.fill_count));
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableCounts]);

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


    function onRating(rating: number) {
        if (generated && sessionKey) {
            Api.rate(sessionKey, generated.id, rating).then(() => {
                // Rating successfully submitted
            }).catch((error) => {
                console.error("Failed to submit rating:", error);
            });
        }
    }

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
    
    const totalFillCount = ingredients.filter(i => i.type === IngredientType.FILL && i.available).length;
    const totalSauceCount = ingredients.filter(i => i.type === IngredientType.SAUCE && i.available).length;
    const availableFillCount = availableCounts?.fill_count ?? totalFillCount;
    const availableSauceCount = availableCounts?.sauce_count ?? totalSauceCount;

    // Get available ingredients for animation
    const availableIngredients = ingredients.filter(i => i.available && (i.applicable !== false));

    // PreparationTypeCard component
    function PreparationTypeCard({ preparationType }: { preparationType: { id: number; name: string } }) {
        return (
            <Card
                style={{
                    marginBottom: '24px',
                    borderRadius: '18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: 'none'
                }}
                bodyStyle={{ padding: '24px' }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '48px', lineHeight: '1' }}>
                        🍳
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <Text strong style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {t("generate.preparationType") || "Preparation Type"}
                        </Text>
                        <Text style={{ fontSize: '19px', fontWeight: 500, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {preparationType.name}
                        </Text>
                    </div>
                </div>
            </Card>
        );
    }

    // CheeseSlider component with animation
    function CheeseSlider({ cheeseLevel }: { cheeseLevel: number }) {
        const [animatedValue, setAnimatedValue] = useState(0);
        const animationRef = useRef<number | null>(null);
        const startTimeRef = useRef<number | null>(null);

        useEffect(() => {
            if (cheeseLevel === undefined || cheeseLevel === null) return;

            // Reset animation
            setAnimatedValue(0);
            startTimeRef.current = Date.now();

            const animate = () => {
                if (!startTimeRef.current) return;

                const elapsed = Date.now() - startTimeRef.current;
                const duration = 3000; // 3 seconds total
                const progress = Math.min(elapsed / duration, 1);

                // Smooth oscillation from 0 to 9 and back, slowing down over time
                // Start with fast oscillations, gradually slow down and settle on target
                
                // Frequency decreases over time (starts fast, ends slow)
                const frequency = 0.08 * (1 - progress * 0.95); // Start at 0.08, end near 0
                
                // Amplitude decreases over time (starts at full range, ends at 0)
                const amplitude = 4.5 * (1 - progress) * (1 - progress); // Quadratic decay
                
                // Smooth sine wave oscillation
                const oscillation = Math.sin(elapsed * frequency) * amplitude;
                
                // Base value that eases towards target (ease-out cubic)
                const targetProgress = 1 - Math.pow(1 - progress, 3);
                const baseValue = targetProgress * cheeseLevel;
                
                // Combine: smooth oscillation around the base value
                const currentValue = Math.max(0, Math.min(9, baseValue + oscillation));
                
                setAnimatedValue(currentValue);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    // Ensure we end at the exact target value
                    setAnimatedValue(cheeseLevel);
                }
            };

            animationRef.current = requestAnimationFrame(animate);

            return () => {
                if (animationRef.current !== null) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }, [cheeseLevel]);

        // Calculate handle position for emoji overlay
        const percentage = (animatedValue / 9) * 100;

        return (
            <Card
                style={{
                    marginBottom: '24px',
                    borderRadius: '18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: 'none'
                }}
                bodyStyle={{ padding: '24px' }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Text strong style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                        {t("generate.cheeseLevel") || "Cheese Level"}
                    </Text>
                    <div 
                        className="cheese-slider-container"
                        style={{ 
                            position: 'relative',
                            padding: '20px 0',
                            marginBottom: '8px'
                        }}
                    >
                        <Slider
                            min={0}
                            max={9}
                            value={animatedValue}
                            disabled={false}
                            onChange={() => {}}
                            tooltip={{ formatter: (value) => `${value}` }}
                            styles={{
                                track: {
                                    background: '#ffd700',
                                    backgroundColor: '#ffd700'
                                },
                                rail: {
                                    background: '#f0f0f0',
                                    backgroundColor: '#f0f0f0'
                                },
                                handle: {
                                    borderColor: '#ffd700',
                                    backgroundColor: 'transparent',
                                    width: '40px',
                                    height: '40px',
                                    marginTop: '-16px',
                                    boxShadow: 'none',
                                    border: 'none',
                                    opacity: 0
                                }
                            }}
                        />
                        {/* Custom cheese emoji handle overlay */}
                        <div
                            style={{
                                position: 'absolute',
                                left: `${percentage}%`,
                                top: '20px',
                                fontSize: '32px',
                                lineHeight: '1',
                                pointerEvents: 'none',
                                transition: 'none', // Remove transition for smooth animation
                                zIndex: 10,
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: '-20px'
                            }}
                        >
                            🧀
                        </div>
                        <style>{`
                            .cheese-slider-container .ant-slider .ant-slider-track {
                                background: #ffd700 !important;
                                background-color: #ffd700 !important;
                                height: 8px !important;
                            }
                            .cheese-slider-container .ant-slider .ant-slider-rail {
                                background: #f0f0f0 !important;
                                background-color: #f0f0f0 !important;
                                height: 8px !important;
                            }
                            .cheese-slider-container .ant-slider .ant-slider-handle {
                                pointer-events: none !important;
                                cursor: default !important;
                            }
                            .cheese-slider-container .ant-slider:hover .ant-slider-handle {
                                border-color: transparent !important;
                            }
                        `}</style>
                    </div>
                </div>
            </Card>
        );
    }

    // Render result modal content
    function renderResultContent() {
        if (!generated) return null;
        
        // If bandit result, show bandit-style view
        if (isBanditResult) {
            return renderBanditResult();
        }
        
        // Otherwise show standard view
        const fillIngredients = generated.ingredients.filter(i => i.type === IngredientType.FILL);
        const sauceIngredients = generated.ingredients.filter(i => i.type === IngredientType.SAUCE);

        return (
            <div>
                <Card 
                    style={{ 
                        marginBottom: '24px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '18px',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                    }}
                    bodyStyle={{ padding: '28px' }}
                >
                    <Row align="middle" justify="space-between" gutter={[16, 16]}>
                        <Col flex="auto" xs={24} sm={24} md={16}>
                            <Title level={2} style={{ 
                                color: 'white', 
                                margin: 0, 
                                fontWeight: 600,
                                fontSize: '32px',
                                letterSpacing: '-0.022em',
                                lineHeight: '1.1'
                            }}>
                                {generated.name}
                            </Title>
                        </Col>
                        <Col xs={24} sm={24} md={8}>
                            <div style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                                padding: '16px 20px', 
                                borderRadius: '12px',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}>
                                <Text strong style={{ 
                                    color: 'white', 
                                    display: 'block', 
                                    marginBottom: '8px',
                                    fontSize: '15px',
                                    fontWeight: 500
                                }}>
                                    {t("common.rate") || "Rate this pan"}
                                </Text>
                                <Rate 
                                    onChange={onRating}
                                    style={{ fontSize: '20px' }}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                {generated.preparation_type && (
                    <PreparationTypeCard preparationType={generated.preparation_type} />
                )}

                {rollCheese && generated.cheese_level !== undefined && generated.cheese_level !== null && (
                    <CheeseSlider cheeseLevel={generated.cheese_level} />
                )}

                <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                    <Col xs={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            {(fillIngredients.length > 0 || sauceIngredients.length > 0) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {fillIngredients.map((ingredient, index) => {
                                        const isVisible = visibleIngredients.has(ingredient.id);
                                        return (
                                            <div
                                                key={ingredient.id}
                                                className={`slot-machine-item ${isVisible ? 'slot-visible' : 'slot-hidden'}`}
                                            >
                                                <IngredientDisplay 
                                                    ingredient={ingredient}
                                                    variant="card"
                                                    showTags={true}
                                                    showIcon={true}
                                                />
                                            </div>
                                        );
                                    })}
                                    {sauceIngredients.map((ingredient, index) => {
                                        const isVisible = visibleIngredients.has(ingredient.id);
                                        return (
                                            <div
                                                key={ingredient.id}
                                                className={`slot-machine-item ${isVisible ? 'slot-visible' : 'slot-hidden'}`}
                                            >
                                                <IngredientDisplay 
                                                    ingredient={ingredient}
                                                    variant="card"
                                                    showTags={true}
                                                    showIcon={true}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '17px' }}>{t("ingredient.noIngredients") || "No ingredients"}</Text>
                            )}
                        </Card>
                    </Col>
                </Row>

                <Divider style={{ margin: '32px 0' }} />

                <Row>
                    <Col span={24}>
                        <Button 
                            type="primary" 
                            size="large"
                            block 
                            onClick={closeModal}
                            style={{ 
                                height: '56px',
                                fontSize: '19px',
                                fontWeight: 500,
                                borderRadius: '12px',
                                letterSpacing: '-0.022em'
                            }}
                        >
                            {t("generate.rollAnotherDice")}
                        </Button>
                    </Col>
                </Row>

                <style>{`
                    @keyframes slotMachineSlide {
                        0% {
                            transform: translateY(-100px) rotateX(90deg);
                            opacity: 0;
                            filter: blur(8px);
                        }
                        60% {
                            transform: translateY(10px) rotateX(-5deg);
                            opacity: 0.8;
                            filter: blur(2px);
                        }
                        100% {
                            transform: translateY(0) rotateX(0deg);
                            opacity: 1;
                            filter: blur(0);
                        }
                    }

                    .slot-machine-item {
                        overflow: hidden;
                    }

                    .slot-hidden {
                        opacity: 0;
                        visibility: hidden;
                        transform: translateY(-100px) rotateX(90deg);
                        filter: blur(8px);
                        pointer-events: none;
                    }

                    .slot-visible {
                        visibility: visible;
                        animation: slotMachineSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                `}</style>
            </div>
        );
    }

    function renderBanditResult() {
        if (!generated) return null;
        
        const ingredients = generated.ingredients || [];
        const numColumns = ingredients.length;

        return (
            <div>
                <Card 
                    style={{ 
                        marginBottom: '24px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '18px',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                    }}
                    bodyStyle={{ padding: '28px' }}
                >
                    <Row align="middle" justify="space-between" gutter={[16, 16]}>
                        <Col flex="auto" xs={24} sm={24} md={16}>
                            <Title level={2} style={{ 
                                color: 'white', 
                                margin: 0, 
                                fontWeight: 600,
                                fontSize: '32px',
                                letterSpacing: '-0.022em',
                                lineHeight: '1.1'
                            }}>
                                {generated.name}
                            </Title>
                        </Col>
                        <Col xs={24} sm={24} md={8}>
                            <div style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                                padding: '16px 20px', 
                                borderRadius: '12px',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}>
                                <Text strong style={{ 
                                    color: 'white', 
                                    display: 'block', 
                                    marginBottom: '8px',
                                    fontSize: '15px',
                                    fontWeight: 500
                                }}>
                                    {t("common.rate") || "Rate this pan"}
                                </Text>
                                <Rate 
                                    onChange={onRating}
                                    style={{ fontSize: '20px' }}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                {generated.preparation_type && (
                    <PreparationTypeCard preparationType={generated.preparation_type} />
                )}

                {rollCheese && generated.cheese_level !== undefined && generated.cheese_level !== null && (
                    <CheeseSlider cheeseLevel={generated.cheese_level} />
                )}

                <Row gutter={[16, 16]} style={{ marginBottom: '24px', minHeight: '300px' }}>
                    {ingredients.map((ingredient, index) => {
                        // Select emoji based on ingredient type
                        const isSauce = ingredient.type === IngredientType.SAUCE;
                        const emojiArray = isSauce ? SAUCE_ICONS : INGREDIENT_ICONS;
                        const emoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
                        return (
                            <Col 
                                key={ingredient.id || index}
                                xs={numColumns <= 2 ? 24 : 12} 
                                sm={numColumns <= 3 ? 12 : 8} 
                                md={numColumns <= 4 ? 6 : 4} 
                                lg={24 / Math.min(numColumns, 6)}
                                style={{ minWidth: '120px' }}
                            >
                                <Card
                                    style={{
                                        height: '100%',
                                        border: '2px solid #52c41a',
                                        boxShadow: '0 4px 16px rgba(82, 196, 26, 0.3)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        backgroundColor: '#f6ffed',
                                        borderRadius: '18px'
                                    }}
                                    bodyStyle={{ 
                                        padding: '20px',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        minHeight: '250px'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '200px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRadius: '8px',
                                            backgroundColor: '#fafafa',
                                            border: '2px solid #52c41a',
                                            boxShadow: 'inset 0 0 20px rgba(82, 196, 26, 0.3)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            {/* Large emoji display */}
                                            <div
                                                className="bandit-locked-emoji"
                                                style={{
                                                    fontSize: '80px',
                                                    lineHeight: '1',
                                                    transform: 'scale(1.1)',
                                                    transition: 'transform 0.3s ease',
                                                    marginBottom: '16px'
                                                }}
                                            >
                                                {emoji}
                                            </div>
                                            
                                            {/* Ingredient label below */}
                                            <div
                                                style={{
                                                    width: '100%',
                                                    padding: '0 8px'
                                                }}
                                            >
                                                <IngredientDisplay
                                                    ingredient={ingredient}
                                                    variant="compact"
                                                    showIcon={true}
                                                    showTags={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>

                <Divider style={{ margin: '32px 0' }} />

                <Row>
                    <Col span={24}>
                        <Button 
                            type="primary" 
                            size="large"
                            block 
                            onClick={closeModal}
                            style={{ 
                                height: '56px',
                                fontSize: '19px',
                                fontWeight: 500,
                                borderRadius: '12px',
                                letterSpacing: '-0.022em'
                            }}
                        >
                            {t("generate.rollAnotherDice")}
                        </Button>
                    </Col>
                </Row>

                <style>{`
                    @keyframes emojiLock {
                        0% {
                            transform: scale(1);
                        }
                        50% {
                            transform: scale(1.2) rotate(-5deg);
                        }
                        100% {
                            transform: scale(1.1) rotate(0deg);
                        }
                    }
                    
                    .bandit-locked-emoji {
                        animation: emojiLock 0.5s ease-out;
                    }
                `}</style>
            </div>
        );
    }

    // Legacy view component
    function LegacyView() {
        return (
            <div style={{ padding: '8px 0' }}>
                <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                    <Col xs={24} sm={24} md={12}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <Form.Item 
                                style={{ marginBottom: 0 }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px' }}>
                                        <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                            {t("ingredient.ingredientCount")}
                                        </div>
                                        {availableCounts && (
                                            <Text type="secondary" style={{ fontSize: '15px' }}>
                                                {t("generate.available") || "Available"}: {availableFillCount} / {totalFillCount}
                                            </Text>
                                        )}
                                    </div>
                                    <Input.Group compact style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        onClick={() => {
                                            const newVal = Math.max(0, numFill - 1);
                                            setNumFill(newVal);
                                            localStorage.setItem("numFill", String(newVal));
                                        }}
                                        disabled={numFill <= 0}
                                        style={{ 
                                            flex: '0 0 auto',
                                            minWidth: '44px',
                                            width: '44px',
                                            height: '44px',
                                            fontSize: '24px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '12px',
                                            fontWeight: 500,
                                            border: '1px solid #d2d2d7',
                                            background: '#ffffff',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (numFill > 0) {
                                                e.currentTarget.style.background = '#f5f5f7';
                                                e.currentTarget.style.borderColor = '#0071e3';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (numFill > 0) {
                                                e.currentTarget.style.background = '#ffffff';
                                                e.currentTarget.style.borderColor = '#d2d2d7';
                                            }
                                        }}
                                    >
                                        −
                                    </Button>
                                    <InputNumber
                                        min={0}
                                        max={availableFillCount}
                                        value={numFill}
                                        onChange={(value) => {
                                            const val = value ?? 0;
                                            const clampedVal = Math.max(0, Math.min(val, availableFillCount));
                                            setNumFill(clampedVal);
                                            localStorage.setItem("numFill", String(clampedVal));
                                        }}
                                        size="large"
                                        style={{ 
                                            flex: '1 1 auto',
                                            textAlign: 'center',
                                            fontSize: '20px',
                                            fontWeight: 600,
                                            height: '44px'
                                        }}
                                        controls={false}
                                    />
                                    <Button
                                        onClick={() => {
                                            const newVal = Math.min(availableFillCount, numFill + 1);
                                            setNumFill(newVal);
                                            localStorage.setItem("numFill", String(newVal));
                                        }}
                                        disabled={numFill >= availableFillCount}
                                        style={{ 
                                            flex: '0 0 auto',
                                            minWidth: '44px',
                                            width: '44px',
                                            height: '44px',
                                            fontSize: '24px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '12px',
                                            fontWeight: 500,
                                            border: '1px solid #d2d2d7',
                                            background: '#ffffff',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (numFill < availableFillCount) {
                                                e.currentTarget.style.background = '#f5f5f7';
                                                e.currentTarget.style.borderColor = '#0071e3';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (numFill < availableFillCount) {
                                                e.currentTarget.style.background = '#ffffff';
                                                e.currentTarget.style.borderColor = '#d2d2d7';
                                            }
                                        }}
                                    >
                                        +
                                    </Button>
                                    </Input.Group>
                                </div>
                            </Form.Item>
                        </Card>
                    </Col>
                    <Col xs={24} sm={24} md={12}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <Form.Item 
                                style={{ marginBottom: 0 }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px' }}>
                                        <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                            {t("ingredient.sauceCount")}
                                        </div>
                                        {availableCounts && (
                                            <Text type="secondary" style={{ fontSize: '15px' }}>
                                                {t("generate.available") || "Available"}: {availableSauceCount} / {totalSauceCount}
                                            </Text>
                                        )}
                                    </div>
                                    <Input.Group compact style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        onClick={() => {
                                            const newVal = Math.max(0, numSauce - 1);
                                            setNumSauce(newVal);
                                            localStorage.setItem("numSauce", String(newVal));
                                        }}
                                        disabled={numSauce <= 0}
                                        style={{ 
                                            flex: '0 0 auto',
                                            minWidth: '44px',
                                            width: '44px',
                                            height: '44px',
                                            fontSize: '24px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '12px',
                                            fontWeight: 500,
                                            border: '1px solid #d2d2d7',
                                            background: '#ffffff',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (numSauce > 0) {
                                                e.currentTarget.style.background = '#f5f5f7';
                                                e.currentTarget.style.borderColor = '#0071e3';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (numSauce > 0) {
                                                e.currentTarget.style.background = '#ffffff';
                                                e.currentTarget.style.borderColor = '#d2d2d7';
                                            }
                                        }}
                                    >
                                        −
                                    </Button>
                                    <InputNumber
                                        min={0}
                                        max={availableSauceCount}
                                        value={numSauce}
                                        onChange={(value) => {
                                            const val = value ?? 0;
                                            const clampedVal = Math.max(0, Math.min(val, availableSauceCount));
                                            setNumSauce(clampedVal);
                                            localStorage.setItem("numSauce", String(clampedVal));
                                        }}
                                        size="large"
                                        style={{ 
                                            flex: '1 1 auto',
                                            textAlign: 'center',
                                            fontSize: '20px',
                                            fontWeight: 600,
                                            height: '44px'
                                        }}
                                        controls={false}
                                    />
                                    <Button
                                        onClick={() => {
                                            const newVal = Math.min(availableSauceCount, numSauce + 1);
                                            setNumSauce(newVal);
                                            localStorage.setItem("numSauce", String(newVal));
                                        }}
                                        disabled={numSauce >= availableSauceCount}
                                        style={{ 
                                            flex: '0 0 auto',
                                            minWidth: '44px',
                                            width: '44px',
                                            height: '44px',
                                            fontSize: '24px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '12px',
                                            fontWeight: 500,
                                            border: '1px solid #d2d2d7',
                                            background: '#ffffff',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (numSauce < availableSauceCount) {
                                                e.currentTarget.style.background = '#f5f5f7';
                                                e.currentTarget.style.borderColor = '#0071e3';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (numSauce < availableSauceCount) {
                                                e.currentTarget.style.background = '#ffffff';
                                                e.currentTarget.style.borderColor = '#d2d2d7';
                                            }
                                        }}
                                    >
                                        +
                                    </Button>
                                    </Input.Group>
                                </div>
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>
                <Row style={{ marginBottom: '32px' }}>
                    <Col span={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '20px 24px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <Checkbox
                                    checked={rollPreparationType}
                                    onChange={(e) => setRollPreparationType(e.target.checked)}
                                    style={{ 
                                        fontSize: '17px',
                                        fontWeight: 400,
                                        letterSpacing: '-0.022em'
                                    }}
                                >
                                    {t("generate.rollPreparationType") || "Roll preparation type"}
                                </Checkbox>
                                <Checkbox
                                    checked={rollCheese}
                                    onChange={(e) => setRollCheese(e.target.checked)}
                                    style={{ 
                                        fontSize: '17px',
                                        fontWeight: 400,
                                        letterSpacing: '-0.022em'
                                    }}
                                >
                                    {t("generate.rollCheese") || "Roll cheese level"}
                                </Checkbox>
                            </div>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Button
                            type="primary"
                            block
                            size="large"
                            disabled={!canGenerate()}
                            onClick={onGenerateClicked}
                            style={{ 
                                height: '56px',
                                fontSize: '19px',
                                fontWeight: 500,
                                borderRadius: '12px',
                                letterSpacing: '-0.022em'
                            }}
                        >
                            {t("common.create")}
                        </Button>
                    </Col>
                </Row>
            </div>
        );
    }

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
            
            <Modal
                open={showResultModal}
                onCancel={closeModal}
                footer={null}
                width="90%"
                style={{ maxWidth: '900px' }}
                centered
                closable={true}
                styles={{
                    body: {
                        padding: '32px'
                    }
                }}
                className="generate-result-modal"
            >
                {renderResultContent()}
            </Modal>

            {waiting && !showAnimation && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '300px',
                    padding: '40px 24px'
                }}>
                    <Spin size="large" />
                </div>
            )}

            {!waiting && !showResultModal && (
                <div style={{ padding: '8px 0' }}>
                    <Tabs
                        defaultActiveKey="legacy"
                        items={[
                            {
                                key: "legacy",
                                label: <span style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-0.022em' }}>
                                    {t("generate.legacyMode") || "Legacy"}
                                </span>,
                                children: <LegacyView />
                            },
                            {
                                key: "bandit",
                                label: <span style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-0.022em' }}>
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

