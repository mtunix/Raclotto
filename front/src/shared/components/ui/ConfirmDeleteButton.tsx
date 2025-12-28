import React, { useState, useEffect, useRef } from "react";
import { Button } from "antd";
import { VectorGraphics } from "../../../lib/vectorGraphics";

interface ConfirmDeleteButtonProps {
    onConfirm: () => void;
    danger?: boolean;
    className?: string;
    style?: React.CSSProperties;
    confirmationTimeout?: number; // in milliseconds, default 5000
    icon?: string | React.ReactNode; // Icon to display, defaults to REMOVE
}

export function ConfirmDeleteButton(props: ConfirmDeleteButtonProps) {
    const { onConfirm, danger = true, className = "", style = {}, confirmationTimeout = 5000, icon = VectorGraphics.REMOVE } = props;
    const [isConfirming, setIsConfirming] = useState(false);
    const [progress, setProgress] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isConfirming) {
            startTimeRef.current = Date.now();
            setProgress(0);
            
            // Update progress every 50ms for smooth animation
            intervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    const elapsed = Date.now() - startTimeRef.current;
                    const newProgress = Math.min((elapsed / confirmationTimeout) * 100, 100);
                    setProgress(newProgress);
                }
            }, 50);

            timeoutRef.current = setTimeout(() => {
                setIsConfirming(false);
                setProgress(0);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                timeoutRef.current = null;
            }, confirmationTimeout);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setProgress(0);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isConfirming, confirmationTimeout]);

    const handleClick = () => {
        if (!isConfirming) {
            // First click - start confirmation
            setIsConfirming(true);
        } else {
            // Second click - confirm deletion
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsConfirming(false);
            setProgress(0);
            onConfirm();
        }
    };

    // Calculate stroke-dasharray and stroke-dashoffset for circular progress
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <Button
            type="text"
            danger={danger}
            size="small"
            className={`${className} confirm-delete-button ${isConfirming ? 'confirming' : ''}`}
            style={style}
            onClick={handleClick}
        >
            {icon}
            {isConfirming && (
                <svg className="confirm-delete-progress" viewBox="0 0 24 24">
                    <circle
                        className="progress-bg"
                        cx="12"
                        cy="12"
                        r={radius}
                    />
                    <circle
                        className="progress-fill"
                        cx="12"
                        cy="12"
                        r={radius}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                    />
                </svg>
            )}
        </Button>
    );
}
