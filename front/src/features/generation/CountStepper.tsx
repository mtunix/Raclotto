import { Button, InputNumber, Space } from "antd";
import styles from "./GenerateView/GenerateView.module.css";

interface CountStepperProps {
    value: number;
    min: number;
    max: number;
    disabled?: boolean;
    onDecrement: () => void;
    onIncrement: () => void;
    /** A number typed in, already kept within `min` and `max`. */
    onChange: (value: number) => void;
}

/** A count with − and + on either side. */
export function CountStepper({ value, min, max, disabled = false, onDecrement, onIncrement, onChange }: CountStepperProps) {
    return (
        <Space.Compact className={styles.stepper}>
            <Button onClick={onDecrement} disabled={disabled || value <= min} className={styles.incrementButton}>
                −
            </Button>
            <InputNumber
                min={min}
                max={max}
                value={value}
                onChange={(next) => onChange(Math.max(min, Math.min(next ?? min, max)))}
                size="large"
                className={styles.inputNumber}
                controls={false}
                disabled={disabled}
            />
            <Button onClick={onIncrement} disabled={disabled || value >= max} className={styles.incrementButton}>
                +
            </Button>
        </Space.Compact>
    );
}
