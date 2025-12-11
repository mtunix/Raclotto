import React, {useState, useEffect} from "react";
import {Button, Row, Col, Form, Rate, Spin, Card, Typography, Divider, Alert, Space, Checkbox} from "antd";
import {DialView} from "./DialView";
import {Api} from "../lib/api";
import {Ingredient, IngredientType} from "../model/ingredient";
import {Pan} from "../model/pan";
import {PrepType} from "../model/prepType";
import {Util} from "../lib/util";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../AppSlice";
import {IngredientDisplay} from "./common/IngredientDisplay";

const {Title, Text} = Typography;

export function GenerateView() {
    let { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [prepTypes, setPrepTypes] = useState<PrepType[]>([]);
    const [availableCounts, setAvailableCounts] = useState<{fill_count: number; sauce_count: number} | null>(null);
    const [rollPreparationType, setRollPreparationType] = useState(false);
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

    function restart() {
        const fillMax = availableCounts?.fill_count ?? ingredients.filter(i => i.type === IngredientType.FILL && i.available).length;
        const sauceMax = availableCounts?.sauce_count ?? ingredients.filter(i => i.type === IngredientType.SAUCE && i.available).length;
        setNumFill(fillMax > 0 ? fillMax : 1);
        setNumSauce(sauceMax > 0 ? sauceMax : 1);
        setGenerated(null);
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
        if (!sessionKey) return;
        setWaiting(true);
        localStorage.setItem("numFill", String(numFill));
        localStorage.setItem("numSauce", String(numSauce));
        
        // If rolling preparation type, randomly select one
        let preparationTypeId: number | undefined = undefined;
        if (rollPreparationType && prepTypes.length > 0) {
            const randomIndex = Math.floor(Math.random() * prepTypes.length);
            preparationTypeId = prepTypes[randomIndex].id;
        }
        
        Api.generate(sessionKey, numFill, numSauce, preparationTypeId).then((data) => {
            if (data && "generated" in data && data.generated) {
                setGenerated(data.generated);
            }
            setWaiting(false);
        }).catch((error) => {
            console.error("Failed to generate pan:", error);
            setWaiting(false);
        });
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

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (generated) {
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
                    <Col span={12}>
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
                    <Col span={12}>
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
                            onClick={restart}
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
                <Col span={12}>
                    <Form.Item 
                        label={
                            <Space>
                                <span>{t("ingredient.ingredientCount")}</span>
                                {availableCounts && (
                                    <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                        ({t("generate.available") || "Available"}: {availableFillCount})
                                    </Text>
                                )}
                            </Space>
                        }
                    >
                        <DialView
                            ingredients={ingredients.filter(i => i.type === IngredientType.FILL)}
                            onChange={(v) => setNumFill(v)}
                            num={numFill}
                            max={availableFillCount}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item 
                        label={
                            <Space>
                                <span>{t("ingredient.sauceCount")}</span>
                                {availableCounts && (
                                    <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                        ({t("generate.available") || "Available"}: {availableSauceCount})
                                    </Text>
                                )}
                            </Space>
                        }
                    >
                        <DialView
                            ingredients={ingredients.filter(i => i.type === IngredientType.SAUCE)}
                            onChange={(v) => setNumSauce(v)}
                            num={numSauce}
                            max={availableSauceCount}
                        />
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

