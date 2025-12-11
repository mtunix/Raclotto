import React, {useState, useEffect} from "react";
import {InputNumber, Button, Input} from "antd";
import {Util} from "../lib/util";
import {Ingredient} from "../model/ingredient";

type DialViewProps = {
    num: number;
    ingredients: Ingredient[];
    onChange: (value: number) => void;
    max?: number;
};

export function DialView(props: DialViewProps) {
    const { num: propNum, max, ingredients, onChange } = props;
    let [num, setNum] = useState(propNum);
    let [dragY, setDragY] = useState(0);
    const maxValue = max !== undefined ? max : ingredients.length;

    useEffect(() => {
        setNum(propNum);
    }, [propNum]);
    
    useEffect(() => {
        // If current value exceeds max, adjust it
        if (num > maxValue) {
            setNum(maxValue);
            onChange(maxValue);
        }
    }, [maxValue, num, onChange]);

    function isInRange(): boolean {
        return 0 < num && num <= maxValue;
    }

    function onInputChanged(value: number | null) {
        let v = value || 1;
        if (Util.isNumeric(v)) {
            v = parseInt(String(v));
        }
        setNum(v);
        onChange(v);
    }

    function decrement() {
        if (num > 1) {
            let newNum = num - 1;
            setNum(newNum);
            onChange(newNum);
        }
    }

    function increment() {
        if (num < maxValue) {
            let newNum = num + 1;
            setNum(newNum);
            onChange(newNum);
        }
    }

    function onDrag(e: React.DragEvent | React.TouchEvent) {
        let screenY = 0;
        if ('touches' in e && e.touches.length > 0) {
            screenY = e.touches[0].screenY;
        } else if ('screenY' in e) {
            screenY = e.screenY;
        }

        if (screenY === 0) return;

        if (num > 1 && screenY > dragY) {
            let newNum = num - 1;
            setNum(newNum);
            setDragY(screenY);
            onChange(newNum);
        } else if (num < maxValue && screenY < dragY) {
            let newNum = num + 1;
            setNum(newNum);
            setDragY(screenY);
            onChange(newNum);
        }

        setDragY(screenY);
    }

    function bodyScroll() {
        document.body.style.overflow = "visible";
        document.body.style.position = "";
    }

    function noBodyScroll() {
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
    }

    function hideDragImage(e: React.DragEvent) {
        e.dataTransfer.setDragImage(new Image(), 0, 0);
    }

    return (
        <div
            style={{ touchAction: "none" }}
            onDragStart={hideDragImage}
            onDrag={onDrag}
            onTouchStart={noBodyScroll}
            onTouchEnd={bodyScroll}
            onTouchMove={(e) => onDrag(e)}
            onClick={(e) => e.preventDefault()}
            draggable={true}
        >
            <Input.Group compact>
                <Button onClick={decrement}>-</Button>
                <InputNumber
                    value={num}
                    onChange={onInputChanged}
                    style={{
                        width: 'calc(100% - 80px)',
                        textAlign: 'center',
                        borderColor: isInRange() ? undefined : '#ff4d4f'
                    }}
                    min={1}
                    max={maxValue}
                />
                <Button onClick={increment}>+</Button>
            </Input.Group>
        </div>
    );
}

