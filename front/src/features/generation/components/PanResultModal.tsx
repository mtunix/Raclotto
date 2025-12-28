import React, { useEffect, useState } from "react";
import { Modal, Card, Row, Col, Typography, Rate, Divider, Button } from "antd";
import { IngredientDisplay } from "../../../shared/components/common/IngredientDisplay";
import { PreparationTypeCard } from "./PreparationTypeCard";
import { CheeseSlider } from "./CheeseSlider";
import { Pan } from "../../../model/pan";
import { IngredientType } from "../../../model/ingredient";
import { useTranslation } from "react-i18next";
import styles from "../GenerateView.module.css";

const { Title, Text } = Typography;

interface PanResultModalProps {
    open: boolean;
    pan: Pan | null;
    isBanditResult: boolean;
    rollCheese: boolean;
    onClose: () => void;
    onRating: (rating: number) => void;
}

export const PanResultModal: React.FC<PanResultModalProps> = ({
    open,
    pan,
    isBanditResult,
    rollCheese,
    onClose,
    onRating,
}) => {
    const { t } = useTranslation();
    const [visibleIngredients, setVisibleIngredients] = useState<Set<number>>(new Set());

    // Slot-machine style animation for standard view
    useEffect(() => {
        if (open && pan && !isBanditResult) {
            setVisibleIngredients(new Set());

            const fillIngredients = pan.ingredients.filter(i => i.type === IngredientType.FILL);
            const sauceIngredients = pan.ingredients.filter(i => i.type === IngredientType.SAUCE);
            const allItems = [...fillIngredients, ...sauceIngredients];

            const timeoutIds: number[] = [];
            allItems.forEach((item, index) => {
                const timeoutId = window.setTimeout(() => {
                    setVisibleIngredients(prev => {
                        const next = new Set(prev);
                        next.add(item.id);
                        return next;
                    });
                }, index * 150);
                timeoutIds.push(timeoutId);
            });

            return () => {
                timeoutIds.forEach(id => clearTimeout(id));
            };
        }
    }, [open, pan, isBanditResult]);

    if (!pan) return null;

    // Bandit-style view from GenerateView
    if (isBanditResult) {
        const ingredients = pan.ingredients || [];
        const numColumns = ingredients.length;

        return (
            <Modal
                open={open}
                onCancel={onClose}
                footer={null}
                width="90%"
                className={`${styles.modalContainer} generate-result-modal`}
                centered
                closable
                styles={{
                    body: {
                        padding: "32px",
                    },
                }}
            >
                <div>
                    <Card
                        className={styles.gradientCard}
                        bodyStyle={{ padding: "28px" }}
                    >
                        <Row align="middle" justify="space-between" gutter={[16, 16]}>
                            <Col flex="auto" xs={24} sm={24} md={16}>
                                <Title level={2} className={styles.whiteTitle}>
                                    {pan.name}
                                </Title>
                            </Col>
                            <Col xs={24} sm={24} md={8}>
                                <div className={styles.ratingContainer}>
                                    <Text strong className={styles.whiteText}>
                                        {t("common.rate") || "Rate this pan"}
                                    </Text>
                                    <Rate
                                        onChange={onRating}
                                        className={styles.ratingStars}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    {pan.preparation_type && (
                        <PreparationTypeCard preparationType={pan.preparation_type} />
                    )}

                    {rollCheese &&
                        pan.cheese_level !== undefined &&
                        pan.cheese_level !== null && (
                            <CheeseSlider cheeseLevel={pan.cheese_level} />
                        )}

                    <Row
                        gutter={[16, 16]}
                        className={`${styles.marginBottom24} ${styles.minHeight300}`}
                    >
                        {ingredients.map((ingredient, index) => {
                            // In the original bandit view, random emoji and compact ingredient cards are shown.
                            // For reuse, we focus on showing the ingredient cards with consistent styling.
                            return (
                                <Col
                                    key={ingredient.id || index}
                                    xs={numColumns <= 2 ? 24 : 12}
                                    sm={numColumns <= 3 ? 12 : 8}
                                    md={numColumns <= 4 ? 6 : 4}
                                    lg={24 / Math.min(numColumns, 6)}
                                    className={styles.minWidth120}
                                >
                                    <Card
                                        className={styles.banditCard}
                                        bodyStyle={{
                                            padding: "20px",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            minHeight: "250px",
                                        }}
                                    >
                                        <IngredientDisplay
                                            ingredient={ingredient}
                                            variant="compact"
                                            showIcon={true}
                                            showTags={true}
                                        />
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>

                    <Divider className={styles.customDivider} />

                    <Row>
                        <Col span={24}>
                            <Button
                                type="primary"
                                size="large"
                                block
                                onClick={onClose}
                                className={styles.closeButton}
                            >
                                {t("common.close") || "Close"}
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Modal>
        );
    }

    // Standard view from GenerateView.renderResultContent
    const fillIngredients = pan.ingredients.filter(
        (i) => i.type === IngredientType.FILL
    );
    const sauceIngredients = pan.ingredients.filter(
        (i) => i.type === IngredientType.SAUCE
    );

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="90%"
            className={`${styles.modalContainer} generate-result-modal`}
            centered
            closable
            styles={{
                body: {
                    padding: "32px",
                },
            }}
        >
            <div>
                <Card
                    className={styles.gradientCard}
                    bodyStyle={{ padding: "28px" }}
                >
                    <Row align="middle" justify="space-between" gutter={[16, 16]}>
                        <Col flex="auto" xs={24} sm={24} md={16}>
                            <Title level={2} className={styles.whiteTitle}>
                                {pan.name}
                            </Title>
                        </Col>
                        <Col xs={24} sm={24} md={8}>
                            <div className={styles.ratingContainer}>
                                <Text strong className={styles.whiteText}>
                                    {t("common.rate") || "Rate this pan"}
                                </Text>
                                <Rate
                                    onChange={onRating}
                                    className={styles.ratingStars}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                {pan.preparation_type && (
                    <PreparationTypeCard preparationType={pan.preparation_type} />
                )}

                {rollCheese &&
                    pan.cheese_level !== undefined &&
                    pan.cheese_level !== null && (
                        <CheeseSlider cheeseLevel={pan.cheese_level} />
                    )}

                <Row gutter={[24, 24]} className={styles.marginBottom32}>
                    <Col xs={24}>
                        <Card className={styles.card}>
                            {fillIngredients.length > 0 || sauceIngredients.length > 0 ? (
                                <div className={styles.ingredientContainer}>
                                    {fillIngredients.map((ingredient) => {
                                        const isVisible = visibleIngredients.has(ingredient.id);
                                        return (
                                            <div
                                                key={ingredient.id}
                                                className={`${styles.slotMachineItem} ${
                                                    isVisible
                                                        ? styles.slotVisible
                                                        : styles.slotHidden
                                                }`}
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
                                    {sauceIngredients.map((ingredient) => {
                                        const isVisible = visibleIngredients.has(ingredient.id);
                                        return (
                                            <div
                                                key={ingredient.id}
                                                className={`${styles.slotMachineItem} ${
                                                    isVisible
                                                        ? styles.slotVisible
                                                        : styles.slotHidden
                                                }`}
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
                                <Text
                                    type="secondary"
                                    className={styles.subtitle}
                                >
                                    {t("ingredient.noIngredients") || "No ingredients"}
                                </Text>
                            )}
                        </Card>
                    </Col>
                </Row>

                <Divider className={styles.customDivider} />

                <Row>
                    <Col span={24}>
                        <Button
                            type="primary"
                            size="large"
                            block
                            onClick={onClose}
                            className={styles.closeButton}
                        >
                            {t("common.close") || "Close"}
                        </Button>
                    </Col>
                </Row>
            </div>
        </Modal>
    );
};
