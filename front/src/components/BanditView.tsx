import React, {useState, useEffect, useRef} from "react";
import {Button, Row, Col, Form, InputNumber, Checkbox, Card, Typography, Space, Alert, message, Modal, Rate} from "antd";
import {Ingredient, IngredientType} from "../model/ingredient";
import {PrepType} from "../model/prepType";
import {Pan} from "../model/pan";
import {useTranslation} from "react-i18next";
import {IngredientDisplay} from "./common/IngredientDisplay";
import {Api} from "../lib/api";
import {useAuthStore} from "../AuthSlice";
import {useAppStore} from "../AppSlice";

const {Text, Title} = Typography;

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

interface BanditViewProps {
    ingredients: Ingredient[];
    prepTypes: PrepType[];
    availableCounts: {fill_count: number; sauce_count: number} | null;
    sessionKey: string;
    rollPreparationType: boolean;
    onRollPreparationTypeChange: (checked: boolean) => void;
    rollCheese: boolean;
    onRollCheeseChange: (checked: boolean) => void;
    onGenerate: (pan: Pan) => Promise<void>;
    onRating?: (rating: number, panId: number) => void;
}

interface ColumnState {
    isSpinning: boolean;
    currentIndex: number;
    targetIndex: number;
    items: Ingredient[];
    currentEmoji: string;
    targetEmoji: string;
}

export function BanditView(props: BanditViewProps) {
    const {t} = useTranslation();
    const currentUser = useAuthStore((state) => state.user);
    const showXpNotification = useAppStore((state) => state.showXpNotification);
    const setUser = useAuthStore((state) => state.setUser);
    const {
        ingredients,
        prepTypes,
        availableCounts,
        sessionKey,
        rollPreparationType,
        onRollPreparationTypeChange,
        rollCheese,
        onRollCheeseChange,
        onGenerate
    } = props;

    const [numColumns, setNumColumns] = useState(3);
    const [isSpinning, setIsSpinning] = useState(false);
    const [columnStates, setColumnStates] = useState<ColumnState[]>([]);
    const [apiResultPan, setApiResultPan] = useState<Pan | null>(null);
    const [lockedColumns, setLockedColumns] = useState<Set<number>>(new Set());
    const [showBanditModal, setShowBanditModal] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [currentRating, setCurrentRating] = useState<number>(0);
    const animationRefs = useRef<number[]>([]);
    const stopTimeouts = useRef<NodeJS.Timeout[]>([]);
    const stoppedColumnsRef = useRef<Set<number>>(new Set());

    // Get available ingredients and sauces (respecting dietary restrictions)
    const availableIngredients = ingredients.filter(i => i.available && (i.applicable !== false));
    const fillIngredients = availableIngredients.filter(i => i.type === IngredientType.FILL);
    const sauceIngredients = availableIngredients.filter(i => i.type === IngredientType.SAUCE);
    const allAvailableItems = [...fillIngredients, ...sauceIngredients];

    const totalFillCount = fillIngredients.length;
    const totalSauceCount = sauceIngredients.length;
    const availableFillCount = availableCounts?.fill_count ?? totalFillCount;
    const availableSauceCount = availableCounts?.sauce_count ?? totalSauceCount;
    const hasRestrictions = availableCounts && (availableFillCount < totalFillCount || availableSauceCount < totalSauceCount);

    // Calculate max columns based on available items
    const maxColumns = Math.min(allAvailableItems.length, availableFillCount + availableSauceCount);

    // Initialize column states when numColumns changes
    useEffect(() => {
        if (allAvailableItems.length === 0) return;

        const newColumnStates: ColumnState[] = [];
        for (let i = 0; i < numColumns; i++) {
            // Each column gets all available items
            const shuffled = [...allAvailableItems].sort(() => Math.random() - 0.5);
            // Use a default emoji (will be updated when spinning starts)
            const defaultEmoji = INGREDIENT_ICONS[Math.floor(Math.random() * INGREDIENT_ICONS.length)];
            newColumnStates.push({
                isSpinning: false,
                currentIndex: Math.floor(Math.random() * shuffled.length),
                targetIndex: Math.floor(Math.random() * shuffled.length),
                items: shuffled,
                currentEmoji: defaultEmoji,
                targetEmoji: defaultEmoji
            });
        }
        setColumnStates(newColumnStates);
        setApiResultPan(null);
    }, [numColumns, allAvailableItems.length]);

    // Cleanup animations on unmount
    useEffect(() => {
        return () => {
            animationRefs.current.forEach(ref => cancelAnimationFrame(ref));
            stopTimeouts.current.forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    async function handleSpin() {
        if (isSpinning || allAvailableItems.length === 0) return;

        // Open modal first
        setShowBanditModal(true);
        setIsSpinning(true);
        setShowResult(false);
        setApiResultPan(null);
        setCurrentRating(0);
        stoppedColumnsRef.current.clear();
        setLockedColumns(new Set());

        // Clear any existing timeouts and animations
        stopTimeouts.current.forEach(timeout => clearTimeout(timeout));
        stopTimeouts.current = [];
        animationRefs.current.forEach(ref => cancelAnimationFrame(ref));
        animationRefs.current = [];

        try {
            // Store old XP before generation
            const oldXP = currentUser?.experience_points || 0;
            const oldLevelId = currentUser?.level?.id;

            // Call API first to get the result
            const response = await Api.generateBandit(sessionKey, numColumns, rollPreparationType, rollCheese);
            
            if (!response || !response.generated) {
                throw new Error("Invalid response from bandit API");
            }

            const pan = response.generated;
            setApiResultPan(pan);

            // Extract achievements from response
            const achievements = response.achievements || [];

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

            // Extract ingredients from the pan result
            const resultIngredients = pan.ingredients || [];
            
            // Ensure we have enough ingredients for all columns
            if (resultIngredients.length < numColumns) {
                throw new Error(`Not enough ingredients in result: expected ${numColumns}, got ${resultIngredients.length}`);
            }

            // Prepare column states with API results
            // Each column will show one ingredient from the API result
            const newColumnStates = columnStates.map((state, index) => {
                // Find the target ingredient in the available items list
                const targetIngredient = resultIngredients[index];
                
                // Ensure the target ingredient is in the items list
                let itemsList = [...state.items];
                let targetIndex = itemsList.findIndex(item => item.id === targetIngredient.id);
                
                // If ingredient not found in items, add it to the list
                if (targetIndex < 0) {
                    itemsList.push(targetIngredient);
                    targetIndex = itemsList.length - 1;
                }
                
                // Select emoji based on ingredient type
                const isSauce = targetIngredient.type === IngredientType.SAUCE;
                const emojiArray = isSauce ? SAUCE_ICONS : INGREDIENT_ICONS;
                const randomEmoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
                // Final emoji will be randomly selected from appropriate array
                const finalEmoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
                
                return {
                    ...state,
                    isSpinning: true,
                    targetIndex: targetIndex,
                    items: itemsList,
                    currentEmoji: randomEmoji,
                    targetEmoji: finalEmoji
                };
            });

            setColumnStates(newColumnStates);

            // Start spinning animation for each column with staggered stops
            // Use a single animation loop to batch updates and reduce re-renders
            const startTime = Date.now();
            const baseDuration = 6000; // Base 6 seconds
            const spinSpeed = 50; // ms per item change
            const emojiChangeSpeed = 100; // Change emoji every 100ms during spinning
            
            // Store local state for each column to avoid frequent React updates
            const columnLocalState = newColumnStates.map((state, idx) => ({
                currentIndex: state.currentIndex,
                currentEmoji: state.currentEmoji,
                lastItemUpdate: startTime,
                lastEmojiUpdate: startTime,
                stopTime: baseDuration + (idx * 800),
                items: state.items,
                targetIndex: state.targetIndex,
                targetEmoji: state.targetEmoji,
                targetItem: state.items[state.targetIndex]
            }));

            let lastBatchUpdate = startTime;
            const batchUpdateInterval = 100; // Batch state updates every 100ms instead of every frame

            const animate = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                let needsUpdate = false;
                let allStopped = true;

                // Update all columns in a single loop
                columnLocalState.forEach((colState, columnIndex) => {
                    if (elapsed < colState.stopTime) {
                        allStopped = false;
                        
                        // Update item index
                        if (now - colState.lastItemUpdate >= spinSpeed) {
                            colState.currentIndex = (colState.currentIndex + 1) % colState.items.length;
                            colState.lastItemUpdate = now;
                            needsUpdate = true;
                        }
                        
                        // Update emoji
                        if (now - colState.lastEmojiUpdate >= emojiChangeSpeed) {
                            const isSauce = colState.targetItem?.type === IngredientType.SAUCE;
                            const emojiArray = isSauce ? SAUCE_ICONS : INGREDIENT_ICONS;
                            colState.currentEmoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];
                            colState.lastEmojiUpdate = now;
                            needsUpdate = true;
                        }
                    } else if (!stoppedColumnsRef.current.has(columnIndex)) {
                        // Column just finished - mark as stopped
                        colState.currentIndex = colState.targetIndex;
                        colState.currentEmoji = colState.targetEmoji;
                        stoppedColumnsRef.current.add(columnIndex);
                        needsUpdate = true;
                    }
                });

                // Batch state updates to reduce re-renders (only update every 100ms)
                if (needsUpdate && (now - lastBatchUpdate >= batchUpdateInterval)) {
                    setColumnStates(prev => {
                        const updated = [...prev];
                        columnLocalState.forEach((colState, idx) => {
                            if (updated[idx]) {
                                updated[idx] = {
                                    ...updated[idx],
                                    currentIndex: colState.currentIndex,
                                    currentEmoji: colState.currentEmoji,
                                    isSpinning: elapsed < colState.stopTime
                                };
                            }
                        });
                        return updated;
                    });
                    
                    // Update locked columns
                    const newLockedColumns = new Set<number>();
                    stoppedColumnsRef.current.forEach(idx => newLockedColumns.add(idx));
                    setLockedColumns(newLockedColumns);
                    
                    lastBatchUpdate = now;
                }

                if (allStopped && stoppedColumnsRef.current.size === numColumns && pan) {
                    // All columns stopped - show result
                    setIsSpinning(false);
                    setShowResult(true);
                    onGenerate(pan).catch(err => {
                        console.error("Failed to process pan:", err);
                    });
                } else {
                    const frameId = requestAnimationFrame(animate);
                    // Store frame ID for cleanup (use first slot)
                    animationRefs.current[0] = frameId;
                }
            };

            animate();
        } catch (error) {
            console.error("Failed to generate bandit pan:", error);
            message.error(t("generate.banditError") || "Failed to spin the bandit. Please try again.");
            setIsSpinning(false);
            setShowBanditModal(false);
        }
    }

    function canSpin(): boolean {
        return !isSpinning && allAvailableItems.length > 0 && numColumns > 0 && numColumns <= maxColumns;
    }

    function renderSlotMachine() {
        return (
            <Card
                style={{
                    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
                    border: '3px solid #4a5568',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 8px rgba(255, 255, 255, 0.1)',
                    cursor: canSpin() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                bodyStyle={{ 
                    padding: '40px',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                onClick={canSpin() ? handleSpin : undefined}
                onMouseEnter={(e) => {
                    if (canSpin()) {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.15)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 8px rgba(255, 255, 255, 0.1)';
                }}
            >
                {/* Decorative elements */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    height: '60px',
                    background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.3) 0%, transparent 100%)',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 215, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Text style={{ 
                        color: '#ffd700', 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
                        letterSpacing: '4px'
                    }}>
                        🎰 RACLOTTO 🎰
                    </Text>
                </div>

                {/* Slot machine reels - empty/mysterious */}
                <Row gutter={16} style={{ width: '100%', marginTop: '100px', marginBottom: '40px' }}>
                    {Array.from({ length: numColumns }).map((_, index) => {
                        // Calculate responsive column spans for preview
                        const getPreviewColSpan = () => {
                            if (numColumns === 1) {
                                return { xs: 24, sm: 24, md: 24, lg: 24 };
                            } else if (numColumns === 2) {
                                return { xs: 24, sm: 12, md: 12, lg: 12 };
                            } else if (numColumns === 3) {
                                return { xs: 24, sm: 12, md: 8, lg: 8 };
                            } else if (numColumns === 4) {
                                return { xs: 24, sm: 12, md: 6, lg: 6 };
                            } else if (numColumns === 5) {
                                return { xs: 24, sm: 12, md: 6, lg: Math.floor(24 / 5) };
                            } else if (numColumns === 6) {
                                return { xs: 24, sm: 12, md: 6, lg: 4 };
                            } else {
                                const span = Math.floor(24 / Math.min(numColumns, 8));
                                return { xs: 24, sm: 12, md: span, lg: span };
                            }
                        };
                        const previewColSpan = getPreviewColSpan();

                        return (
                        <Col 
                            key={index}
                            xs={previewColSpan.xs}
                            sm={previewColSpan.sm}
                            md={previewColSpan.md}
                            lg={previewColSpan.lg}
                        >
                            <div
                                style={{
                                    height: '200px',
                                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)',
                                    border: '3px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '12px',
                                    boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Mysterious question mark or sparkle */}
                                <div style={{
                                    fontSize: '60px',
                                    opacity: 0.6,
                                    animation: 'mysteryPulse 2s ease-in-out infinite',
                                    filter: 'blur(1px)'
                                }}>
                                    {index % 2 === 0 ? '❓' : '✨'}
                                </div>
                                
                                {/* Shine effect */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                                    animation: 'shine 3s infinite'
                                }} />
                            </div>
                        </Col>
                        );
                    })}
                </Row>

                {/* Pull lever area */}
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        display: 'inline-block',
                        padding: '16px 32px',
                        background: canSpin() 
                            ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                            : 'linear-gradient(135deg, #666 0%, #555 100%)',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '12px',
                        boxShadow: canSpin()
                            ? '0 4px 16px rgba(255, 107, 107, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                            : '0 4px 16px rgba(0, 0, 0, 0.3)',
                        cursor: canSpin() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease'
                    }}>
                        <Text style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                            display: 'block'
                        }}>
                            {canSpin() 
                                ? (t("generate.banditSpin") || "Pull the Lever! 🎰")
                                : (t("generate.banditCannotSpin") || "Cannot Spin")
                            }
                        </Text>
                    </div>
                </div>

                <style>{`
                    @keyframes mysteryPulse {
                        0%, 100% {
                            opacity: 0.4;
                            transform: scale(1);
                        }
                        50% {
                            opacity: 0.8;
                            transform: scale(1.1);
                        }
                    }
                    
                    @keyframes shine {
                        0% {
                            left: -100%;
                        }
                        100% {
                            left: 100%;
                        }
                    }
                `}</style>
            </Card>
        );
    }

    function renderBanditColumns() {
        // Calculate responsive column spans based on number of columns
        const getColSpan = () => {
            if (numColumns === 1) {
                return { xs: 24, sm: 24, md: 24, lg: 24 };
            } else if (numColumns === 2) {
                return { xs: 24, sm: 12, md: 12, lg: 12 };
            } else if (numColumns === 3) {
                return { xs: 24, sm: 12, md: 8, lg: 8 };
            } else if (numColumns === 4) {
                return { xs: 24, sm: 12, md: 6, lg: 6 };
            } else if (numColumns === 5) {
                return { xs: 24, sm: 12, md: 6, lg: Math.floor(24 / 5) };
            } else if (numColumns === 6) {
                return { xs: 24, sm: 12, md: 6, lg: 4 };
            } else {
                // For 7+ columns, use flexible calculation
                const span = Math.floor(24 / Math.min(numColumns, 8));
                return { xs: 24, sm: 12, md: span, lg: span };
            }
        };

        const colSpan = getColSpan();

        return (
            <Row gutter={[16, 16]} style={{ marginBottom: '16px', minHeight: '300px' }}>
                {columnStates.map((state, index) => {
                    const currentItem = state.items[state.currentIndex];
                    const isSpinningColumn = state.isSpinning;
                    const isLocked = lockedColumns.has(index);

                    return (
                        <Col 
                            key={index} 
                            xs={colSpan.xs}
                            sm={colSpan.sm}
                            md={colSpan.md}
                            lg={colSpan.lg}
                        >
                            <Card
                                style={{
                                    height: '100%',
                                    border: isLocked 
                                        ? '2px solid #52c41a' 
                                        : isSpinningColumn 
                                            ? '2px solid #1890ff' 
                                            : '1px solid #d9d9d9',
                                    boxShadow: isLocked 
                                        ? '0 0 15px rgba(82, 196, 26, 0.6)' 
                                        : isSpinningColumn 
                                            ? '0 0 10px rgba(24, 144, 255, 0.5)' 
                                            : 'none',
                                    transition: 'all 0.3s ease',
                                    backgroundColor: isLocked 
                                        ? '#f6ffed' 
                                        : isSpinningColumn 
                                            ? '#f0f8ff' 
                                            : '#fff'
                                }}
                                bodyStyle={{ 
                                    padding: '16px',
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
                                        border: isLocked 
                                            ? '2px solid #52c41a' 
                                            : isSpinningColumn 
                                                ? '2px solid #1890ff' 
                                                : '1px solid #e8e8e8',
                                        boxShadow: isLocked 
                                            ? 'inset 0 0 20px rgba(82, 196, 26, 0.3)' 
                                            : isSpinningColumn 
                                                ? 'inset 0 0 20px rgba(24, 144, 255, 0.2)' 
                                                : 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {currentItem ? (
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
                                                className={isLocked 
                                                    ? 'bandit-locked-emoji' 
                                                    : isSpinningColumn 
                                                        ? 'bandit-spinning-emoji' 
                                                        : 'bandit-stopped-emoji'}
                                                style={{
                                                    fontSize: '80px',
                                                    lineHeight: '1',
                                                    transform: isLocked 
                                                        ? 'scale(1.1)' 
                                                        : isSpinningColumn 
                                                            ? 'scale(0.9)' 
                                                            : 'scale(1)',
                                                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                                                    opacity: isSpinningColumn ? 0.8 : 1,
                                                    filter: isSpinningColumn ? 'blur(2px)' : 'none',
                                                    marginBottom: '16px'
                                                }}
                                            >
                                                {state.currentEmoji}
                                            </div>
                                            
                                            {/* Ingredient label below */}
                                            <div
                                                style={{
                                                    width: '100%',
                                                    padding: '0 8px',
                                                    opacity: isSpinningColumn ? 0.6 : 1,
                                                    transition: 'opacity 0.3s ease',
                                                    display: 'flex',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <IngredientDisplay
                                                    ingredient={currentItem}
                                                    variant="compact"
                                                    showIcon={true}
                                                    showTags={false}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <Text type="secondary">{t("generate.banditNoItems") || "No items"}</Text>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        );
    }

    return (
        <div>
            {hasRestrictions && (
                <Alert
                    type="info"
                    message={t("generate.restrictionsApplied") || "Dietary restrictions applied"}
                    description={
                        <div>
                            {availableFillCount < totalFillCount && (
                                <Text>
                                    {t("generate.availableIngredients") || "Available ingredients"}: {availableFillCount} / {totalFillCount}
                                    {totalFillCount - availableFillCount > 0 && (
                                        <Text type="secondary"> ({totalFillCount - availableFillCount} {t("generate.excluded") || "excluded"})</Text>
                                    )}
                                </Text>
                            )}
                            {availableFillCount < totalFillCount && availableSauceCount < totalSauceCount && <br />}
                            {availableSauceCount < totalSauceCount && (
                                <Text>
                                    {t("generate.availableSauces") || "Available sauces"}: {availableSauceCount} / {totalSauceCount}
                                    {totalSauceCount - availableSauceCount > 0 && (
                                        <Text type="secondary"> ({totalSauceCount - availableSauceCount} {t("generate.excluded") || "excluded"})</Text>
                                    )}
                                </Text>
                            )}
                        </div>
                    }
                    style={{ marginBottom: '16px' }}
                    showIcon
                />
            )}

            <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                <Col span={24}>
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
                                        {t("generate.banditColumnCount") || "Number of Columns"}
                                    </div>
                                    {maxColumns > 0 && (
                                        <Text type="secondary" style={{ fontSize: '15px' }}>
                                            {t("generate.banditColumnCountHelp") || "Choose how many columns to spin"} (1-{maxColumns})
                                        </Text>
                                    )}
                                </div>
                                <InputNumber
                                    min={1}
                                    max={maxColumns}
                                    value={numColumns}
                                    onChange={(value) => {
                                        const val = value || 1;
                                        setNumColumns(Math.max(1, Math.min(val, maxColumns)));
                                    }}
                                    size="large"
                                    style={{ 
                                        width: '100%',
                                        height: '44px',
                                        fontSize: '20px',
                                        fontWeight: 600
                                    }}
                                    disabled={isSpinning}
                                />
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
                                onChange={(e) => onRollPreparationTypeChange(e.target.checked)}
                                disabled={isSpinning}
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
                                onChange={(e) => onRollCheeseChange(e.target.checked)}
                                disabled={isSpinning}
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

            {/* Mysterious slot machine */}
            {renderSlotMachine()}

            {/* Modal with spinning animation */}
            <Modal
                open={showBanditModal}
                onCancel={() => {
                    if (!isSpinning) {
                        setShowBanditModal(false);
                        setShowResult(false);
                        setApiResultPan(null);
                        setCurrentRating(0);
                    }
                }}
                footer={null}
                width="90%"
                style={{ maxWidth: '1200px' }}
                centered
                closable={!isSpinning}
                maskClosable={!isSpinning}
            >
                <div style={{ padding: '20px 0' }}>
                    {showResult && apiResultPan ? (
                        <>
                            {/* Pan name and rating banner */}
                            <Card 
                                style={{ 
                                    marginBottom: '24px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none'
                                }}
                                bodyStyle={{ padding: '20px' }}
                            >
                                <Row align="middle" justify="space-between">
                                    <Col flex="auto">
                                        <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 700 }}>
                                            {apiResultPan.name}
                                        </Title>
                                        {apiResultPan.preparation_type && (
                                            <Text style={{ color: 'white', opacity: 0.9, fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
                                                {t("generate.preparationType") || "Preparation Type"}: {apiResultPan.preparation_type.name}
                                            </Text>
                                        )}
                                    </Col>
                                    <Col>
                                        <div style={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                                            padding: '8px 12px', 
                                            borderRadius: '8px',
                                            backdropFilter: 'blur(10px)'
                                        }}>
                                            <Text strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>
                                                {t("common.rate") || "Rate this pan"}
                                            </Text>
                                            <Rate 
                                                value={currentRating}
                                                onChange={(value) => {
                                                    setCurrentRating(value);
                                                    if (props.onRating) {
                                                        props.onRating(value, apiResultPan.id);
                                                    }
                                                }}
                                                style={{ fontSize: '1.2rem' }}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                            
                            {/* Keep the columns visible with emojis */}
                            {renderBanditColumns()}
                            
                            {/* Re-roll button */}
                            <Row style={{ marginTop: '24px' }}>
                                <Col span={24}>
                                    <Button 
                                        type="primary" 
                                        size="large"
                                        block 
                                        onClick={() => {
                                            setShowResult(false);
                                            setApiResultPan(null);
                                            setCurrentRating(0);
                                            handleSpin();
                                        }}
                                        style={{ 
                                            height: '48px',
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        {t("generate.rollAnotherDice") || "Roll Another Dice"}
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : (
                        <>
                            <Row gutter={16} style={{ marginBottom: '16px' }}>
                                <Col span={24} style={{ textAlign: 'center' }}>
                                    <Title level={3} style={{ marginBottom: '8px' }}>
                                        {isSpinning 
                                            ? (t("generate.banditSpinning") || "Spinning...") 
                                            : (t("generate.banditResult") || "Your Result!")
                                        }
                                    </Title>
                                </Col>
                            </Row>
                            {renderBanditColumns()}
                        </>
                    )}
                </div>
            </Modal>

            <style>{`
                @keyframes emojiSpin {
                    0%, 100% {
                        transform: scale(0.9) rotate(0deg);
                        opacity: 0.8;
                    }
                    50% {
                        transform: scale(0.85) rotate(5deg);
                        opacity: 0.6;
                    }
                }
                
                .bandit-spinning-emoji {
                    animation: emojiSpin 0.2s infinite ease-in-out;
                }
                
                .bandit-stopped-emoji {
                    animation: none;
                }
                
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

