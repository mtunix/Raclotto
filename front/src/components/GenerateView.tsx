import React, {useState, useEffect, useRef} from "react";
import {Button, Row, Col, Form, Rate, Spin, Card, Typography, Divider, Alert, Checkbox, Tabs, Modal, InputNumber, Input} from "antd";
import {BanditView} from "./BanditView";
import {Api} from "../lib/api";
import {Ingredient, IngredientType} from "../model/ingredient";
import {Pan} from "../model/pan";
import {PrepType} from "../model/prepType";
import {Util} from "../lib/util";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../AppSlice";
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
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [prepTypes, setPrepTypes] = useState<PrepType[]>([]);
    const [availableCounts, setAvailableCounts] = useState<{fill_count: number; sauce_count: number} | null>(null);
    const [rollPreparationType, setRollPreparationType] = useState(false);
    const [isBanditResult, setIsBanditResult] = useState(false);
    const sessionKey = session?.key || "";

    useEffect(() => {
        if (sessionKey) {
            Api.get("ingredients", sessionKey).then((data) => {
                const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                setIngredients(ingredientsData);
            }).catch((error) => {
                console.error("Failed to load ingredients:", error);
                setIngredients([]);
            });
            
            Api.get("preparation_type", sessionKey).then((data) => {
                const prepTypesData = Array.isArray(data) ? data as PrepType[] : [];
                setPrepTypes(prepTypesData);
            }).catch((error) => {
                console.error("Failed to load preparation types:", error);
                setPrepTypes([]);
            });
            
            Api.getAvailableIngredientCounts(sessionKey).then((counts) => {
                setAvailableCounts(counts);
            }).catch((error) => {
                console.error("Failed to load available counts:", error);
                setAvailableCounts(null);
            });
        }
    }, [sessionKey]);

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

    // Update to maximum when available counts change
    useEffect(() => {
        if (availableCounts) {
            if (availableCounts.fill_count > 0) {
                setNumFill(availableCounts.fill_count);
                localStorage.setItem("numFill", String(availableCounts.fill_count));
            }
            if (availableCounts.sauce_count > 0) {
                setNumSauce(availableCounts.sauce_count);
                localStorage.setItem("numSauce", String(availableCounts.sauce_count));
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


    function onRating(rating: number) {
        if (generated && sessionKey) {
            Api.rate(sessionKey, generated.id, rating).then(() => {
                // Rating successfully submitted
            }).catch((error) => {
                console.error("Failed to submit rating:", error);
            });
        }
    }

    async function handleGenerate(numFill: number, numSauce: number, preparationTypeId?: number) {
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
            const data = await Api.generate(sessionKey, numFill, numSauce, preparationTypeId);
            if (data && "generated" in data && data.generated) {
                setGenerated(data.generated);
                apiCompleteRef.current = true;
                setApiComplete(true);
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
        
        handleGenerate(numFill, numSauce, preparationTypeId);
    }

    function canGenerate(): boolean {
        if (!Util.isNumeric(numFill) || !Util.isNumeric(numSauce)) {
            return false;
        }

        if (availableCounts) {
            return numFill > 0
                && numSauce > 0
                && numFill <= availableCounts.fill_count
                && numSauce <= availableCounts.sauce_count;
        }

        // Fallback to total ingredients if available counts not loaded
        return numFill > 0
            && numSauce > 0
            && numFill <= ingredients.filter(i => i.type === IngredientType.FILL && i.available).length
            && numSauce <= ingredients.filter(i => i.type === IngredientType.SAUCE && i.available).length;
    }
    
    const totalFillCount = ingredients.filter(i => i.type === IngredientType.FILL && i.available).length;
    const totalSauceCount = ingredients.filter(i => i.type === IngredientType.SAUCE && i.available).length;
    const availableFillCount = availableCounts?.fill_count ?? totalFillCount;
    const availableSauceCount = availableCounts?.sauce_count ?? totalSauceCount;
    const hasRestrictions = availableCounts && (availableFillCount < totalFillCount || availableSauceCount < totalSauceCount);

    // Get available ingredients for animation
    const availableIngredients = ingredients.filter(i => i.available && (i.applicable !== false));

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
                        marginBottom: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
                    }}
                    bodyStyle={{ padding: '20px' }}
                >
                    <Row align="middle" justify="space-between">
                        <Col flex="auto">
                            <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 700 }}>
                                {generated.name}
                            </Title>
                            {generated.preparation_type && (
                                <Text style={{ color: 'white', opacity: 0.9, fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
                                    {t("generate.preparationType") || "Preparation Type"}: {generated.preparation_type.name}
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
                                    onChange={onRating}
                                    style={{ fontSize: '1.2rem' }}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col xs={24} sm={24} md={12}>
                        <Card 
                            title={<span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{t("ingredient.ingredients")}</span>}
                            style={{ height: '100%' }}
                        >
                            {fillIngredients.length > 0 ? (
                                <div>
                                    {fillIngredients.map((ingredient) => (
                                        <IngredientDisplay 
                                            key={ingredient.id}
                                            ingredient={ingredient}
                                            variant="card"
                                            showTags={true}
                                            showIcon={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Text type="secondary">{t("ingredient.noIngredients") || "No ingredients"}</Text>
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} sm={24} md={12}>
                        <Card 
                            title={<span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{t("ingredient.sauces")}</span>}
                            style={{ height: '100%' }}
                        >
                            {sauceIngredients.length > 0 ? (
                                <div>
                                    {sauceIngredients.map((ingredient) => (
                                        <IngredientDisplay 
                                            key={ingredient.id}
                                            ingredient={ingredient}
                                            variant="card"
                                            showTags={true}
                                            showIcon={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Text type="secondary">{t("ingredient.noSauces") || "No sauces"}</Text>
                            )}
                        </Card>
                    </Col>
                </Row>

                <Divider />

                <Row>
                    <Col span={24}>
                        <Button 
                            type="primary" 
                            size="large"
                            block 
                            onClick={closeModal}
                            style={{ 
                                height: '48px',
                                fontSize: '1rem',
                                fontWeight: 600
                            }}
                        >
                            {t("generate.rollAnotherDice")}
                        </Button>
                    </Col>
                </Row>
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
                        marginBottom: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
                    }}
                    bodyStyle={{ padding: '20px' }}
                >
                    <Row align="middle" justify="space-between">
                        <Col flex="auto">
                            <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 700 }}>
                                {generated.name}
                            </Title>
                            {generated.preparation_type && (
                                <Text style={{ color: 'white', opacity: 0.9, fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
                                    {t("generate.preparationType") || "Preparation Type"}: {generated.preparation_type.name}
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
                                    onChange={onRating}
                                    style={{ fontSize: '1.2rem' }}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                <Row gutter={8} style={{ marginBottom: '16px', minHeight: '300px' }}>
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
                                        boxShadow: '0 0 15px rgba(82, 196, 26, 0.6)',
                                        transition: 'all 0.3s ease',
                                        backgroundColor: '#f6ffed'
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
                                                    showTags={false}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>

                <Divider />

                <Row>
                    <Col span={24}>
                        <Button 
                            type="primary" 
                            size="large"
                            block 
                            onClick={closeModal}
                            style={{ 
                                height: '48px',
                                fontSize: '1rem',
                                fontWeight: 600
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
                <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col xs={24} sm={24} md={12}>
                        <Form.Item 
                            label={
                                <div>
                                    <div>{t("ingredient.ingredientCount")}</div>
                                    {availableCounts && (
                                        <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                            {t("generate.available") || "Available"}: {availableFillCount}
                                        </Text>
                                    )}
                                </div>
                            }
                        >
                            <Input.Group compact style={{ display: 'flex' }}>
                                <Button
                                    onClick={() => {
                                        const newVal = Math.max(1, numFill - 1);
                                        setNumFill(newVal);
                                        localStorage.setItem("numFill", String(newVal));
                                    }}
                                    disabled={numFill <= 1}
                                    style={{ 
                                        flex: '0 0 auto',
                                        minWidth: '48px',
                                        height: '40px',
                                        fontSize: '20px',
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    −
                                </Button>
                                <InputNumber
                                    min={1}
                                    max={availableFillCount}
                                    value={numFill}
                                    onChange={(value) => {
                                        const val = value || 1;
                                        const clampedVal = Math.max(1, Math.min(val, availableFillCount));
                                        setNumFill(clampedVal);
                                        localStorage.setItem("numFill", String(clampedVal));
                                    }}
                                    style={{ 
                                        flex: '1 1 auto',
                                        textAlign: 'center'
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
                                        minWidth: '48px',
                                        height: '40px',
                                        fontSize: '20px',
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    +
                                </Button>
                            </Input.Group>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={24} md={12}>
                        <Form.Item 
                            label={
                                <div>
                                    <div>{t("ingredient.sauceCount")}</div>
                                    {availableCounts && (
                                        <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                            {t("generate.available") || "Available"}: {availableSauceCount}
                                        </Text>
                                    )}
                                </div>
                            }
                        >
                            <Input.Group compact style={{ display: 'flex' }}>
                                <Button
                                    onClick={() => {
                                        const newVal = Math.max(1, numSauce - 1);
                                        setNumSauce(newVal);
                                        localStorage.setItem("numSauce", String(newVal));
                                    }}
                                    disabled={numSauce <= 1}
                                    style={{ 
                                        flex: '0 0 auto',
                                        minWidth: '48px',
                                        height: '40px',
                                        fontSize: '20px',
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    −
                                </Button>
                                <InputNumber
                                    min={1}
                                    max={availableSauceCount}
                                    value={numSauce}
                                    onChange={(value) => {
                                        const val = value || 1;
                                        const clampedVal = Math.max(1, Math.min(val, availableSauceCount));
                                        setNumSauce(clampedVal);
                                        localStorage.setItem("numSauce", String(clampedVal));
                                    }}
                                    style={{ 
                                        flex: '1 1 auto',
                                        textAlign: 'center'
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
                                        minWidth: '48px',
                                        height: '40px',
                                        fontSize: '20px',
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    +
                                </Button>
                            </Input.Group>
                        </Form.Item>
                    </Col>
                </Row>
                <Row style={{ marginBottom: '16px' }}>
                    <Col span={24}>
                        <Form.Item>
                            <Checkbox
                                checked={rollPreparationType}
                                onChange={(e) => setRollPreparationType(e.target.checked)}
                            >
                                {t("generate.rollPreparationType") || "Roll preparation type"}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Button
                            type="primary"
                            block
                            disabled={!canGenerate()}
                            onClick={onGenerateClicked}
                            style={{ marginTop: '8px' }}
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
                style={{ maxWidth: '800px' }}
                centered
                closable={true}
            >
                {renderResultContent()}
            </Modal>

            {waiting && !showAnimation && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Spin size="large" />
                </div>
            )}

            {!waiting && !showResultModal && (
                <Tabs
                    defaultActiveKey="legacy"
                    items={[
                        {
                            key: "legacy",
                            label: t("generate.legacyMode") || "Legacy",
                            children: <LegacyView />
                        },
                        {
                            key: "bandit",
                            label: t("generate.banditMode") || "Bandit",
                            children: (
                                <BanditView
                                    ingredients={ingredients}
                                    prepTypes={prepTypes}
                                    availableCounts={availableCounts}
                                    sessionKey={sessionKey}
                                    rollPreparationType={rollPreparationType}
                                    onRollPreparationTypeChange={setRollPreparationType}
                                    onGenerate={handleBanditGenerate}
                                    onRating={handleBanditRating}
                                />
                            )
                        }
                    ]}
                />
            )}
        </>
    );
}

