import React from "react";
import { Row, Col, Card, Checkbox, Button } from "antd";
import { IngredientCountControl } from "./IngredientCountControl";
import styles from "../GenerateView.module.css";

interface LegacyViewProps {
    t: (key: string) => string;
    numFill: number;
    numSauce: number;
    availableFillCount: number;
    availableSauceCount: number;
    totalFillCount: number;
    totalSauceCount: number;
    canGenerate: () => boolean;
    onGenerateClicked: () => void;
    rollPreparationType: boolean;
    setRollPreparationType: (value: boolean) => void;
    rollCheese: boolean;
    setRollCheese: (value: boolean) => void;
    onUpdateFill: (value: number) => void;
    onUpdateSauce: (value: number) => void;
}

export const LegacyView: React.FC<LegacyViewProps> = ({
    t,
    numFill,
    numSauce,
    availableFillCount,
    availableSauceCount,
    totalFillCount,
    totalSauceCount,
    canGenerate,
    onGenerateClicked,
    rollPreparationType,
    setRollPreparationType,
    rollCheese,
    setRollCheese,
    onUpdateFill,
    onUpdateSauce,
}) => {
    return (
        <div className={styles.flexColumn} style={{ padding: "8px 0" }}>
            <Row gutter={[24, 24]} className={styles.marginBottom16}>
                <Col xs={24} sm={24} md={12}>
                    <IngredientCountControl
                        label={t("ingredient.ingredientCount")}
                        count={numFill}
                        availableCount={availableFillCount}
                        onIncrement={() => {
                            const newVal = Math.min(availableFillCount, numFill + 1);
                            onUpdateFill(newVal);
                        }}
                        onDecrement={() => {
                            const newVal = Math.max(0, numFill - 1);
                            onUpdateFill(newVal);
                        }}
                        onChange={(value) => {
                            onUpdateFill(value);
                        }}
                        availableCounts={{ fill_count: availableFillCount }}
                        totalCount={totalFillCount}
                    />
                </Col>
                <Col xs={24} sm={24} md={12}>
                    <IngredientCountControl
                        label={t("ingredient.sauceCount")}
                        count={numSauce}
                        availableCount={availableSauceCount}
                        onIncrement={() => {
                            const newVal = Math.min(availableSauceCount, numSauce + 1);
                            onUpdateSauce(newVal);
                        }}
                        onDecrement={() => {
                            const newVal = Math.max(0, numSauce - 1);
                            onUpdateSauce(newVal);
                        }}
                        onChange={(value) => {
                            onUpdateSauce(value);
                        }}
                        availableCounts={{ sauce_count: availableSauceCount }}
                        totalCount={totalSauceCount}
                    />
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <Card className={styles.cardNoMargin}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Checkbox
                                checked={rollPreparationType}
                                onChange={(e) => setRollPreparationType(e.target.checked)}
                                className={styles.checkbox}
                            >
                                {t("generate.rollPreparationType") || "Roll preparation type"}
                            </Checkbox>
                            <Checkbox
                                checked={rollCheese}
                                onChange={(e) => setRollCheese(e.target.checked)}
                                className={styles.checkbox}
                            >
                                {t("generate.rollCheese") || "Roll cheese level"}
                            </Checkbox>
                        </div>
                    </Card>
                </Col>
            </Row>
            <Row style={{ marginTop: '24px' }}>
                <Col span={24}>
                    <Button
                        type="primary"
                        block
                        size="large"
                        disabled={!canGenerate()}
                        onClick={onGenerateClicked}
                        className={styles.button}
                    >
                        {t("common.create")}
                    </Button>
                </Col>
            </Row>
        </div>
    );
};
