import React from 'react';
import { Card, Typography, InputNumber, Button, Form, Input } from 'antd';
import styles from '../GenerateView.module.css';

const { Text } = Typography;

interface IngredientCountControlProps {
    label: string;
    count: number;
    availableCount: number;
    onIncrement: () => void;
    onDecrement: () => void;
    onChange: (value: number) => void;
    availableCounts?: { fill_count?: number; sauce_count?: number } | null;
    totalCount: number;
}

export function IngredientCountControl({ 
    label, 
    count, 
    availableCount, 
    onIncrement, 
    onDecrement, 
    onChange,
    availableCounts,
    totalCount 
}: IngredientCountControlProps) {
    return (
        <Card className={styles.card}>
            <Form.Item style={{ marginBottom: 0 }}>
                <div className={styles.flexColumn} style={{ gap: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px', paddingBottom: '8px' }}>
                        <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {label}
                        </div>
                        {availableCounts && (
                            <Text type="secondary" style={{ fontSize: '15px' }}>
                                Available: {availableCount} / {totalCount}
                            </Text>
                        )}
                    </div>
                    <Input.Group compact style={{ display: 'flex', gap: '8px' }}>
                        <Button
                            onClick={onDecrement}
                            disabled={count <= 0}
                            className={styles.incrementButton}
                            onMouseEnter={(e) => {
                                if (count > 0) {
                                    e.currentTarget.style.background = '#f5f5f7';
                                    e.currentTarget.style.borderColor = '#0071e3';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (count > 0) {
                                    e.currentTarget.style.background = '#ffffff';
                                    e.currentTarget.style.borderColor = '#d2d2d7';
                                }
                            }}
                        >
                            −
                        </Button>
                        <InputNumber
                            min={0}
                            max={availableCount}
                            value={count}
                            onChange={(value: number | null) => {
                                const val = value ?? 0;
                                const clampedVal = Math.max(0, Math.min(val, availableCount));
                                onChange(clampedVal);
                            }}
                            size="large"
                            className={styles.inputNumber}
                            controls={false}
                        />
                        <Button
                            onClick={onIncrement}
                            disabled={count >= availableCount}
                            className={styles.incrementButton}
                            onMouseEnter={(e) => {
                                if (count < availableCount) {
                                    e.currentTarget.style.background = '#f5f5f7';
                                    e.currentTarget.style.borderColor = '#0071e3';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (count < availableCount) {
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
    );
}
