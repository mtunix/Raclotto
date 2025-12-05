import React, {useState, useEffect} from "react";
import {InputNumber, Button, Input} from "antd";
import {Util} from "../lib/util";
import {Ingredient} from "../model/ingredient";

type DialViewProps = {
    num: number;
    ingredients: Ingredient[];
    onChange: (value: number) => void;
};

export function DialView(props: DialViewProps) {
    let [num, setNum] = useState(props.num);
    let [dragY, setDragY] = useState(0);

    useEffect(() => {
        setNum(props.num);
    }, [props.num]);

    function isInRange(): boolean {
        return 0 < num && num <= props.ingredients.length;
    }

    function onInputChanged(value: number | null) {
        let v = value || 1;
        if (Util.isNumeric(v)) {
            v = parseInt(String(v));
        }
        setNum(v);
        props.onChange(v);
    }

    function decrement() {
        if (num > 1) {
            let newNum = num - 1;
            setNum(newNum);
            props.onChange(newNum);
        }
    }

    function increment() {
        if (num < props.ingredients.length) {
            let newNum = num + 1;
            setNum(newNum);
            props.onChange(newNum);
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
            props.onChange(newNum);
        } else if (num < props.ingredients.length && screenY < dragY) {
            let newNum = num + 1;
            setNum(newNum);
            setDragY(screenY);
            props.onChange(newNum);
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
                    max={props.ingredients.length}
                />
                <Button onClick={increment}>+</Button>
            </Input.Group>
        </div>
    );
}

