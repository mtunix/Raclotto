import React, { useState, useRef, useEffect } from 'react';
import { Slider, Typography, Card } from 'antd';
import styles from './GenerateView/GenerateView.module.css';

const { Text } = Typography;

interface CheeseSliderProps {
    cheeseLevel: number;
}

export function CheeseSlider({ cheeseLevel }: CheeseSliderProps) {
    const [animatedValue, setAnimatedValue] = useState(0);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (cheeseLevel === undefined || cheeseLevel === null) return;

        // Reset animation
        setAnimatedValue(0);
        startTimeRef.current = Date.now();

        let lastUpdate = startTimeRef.current;
        const updateInterval = 16; // ~60fps, but we can throttle more on mobile
        
        const animate = () => {
            if (!startTimeRef.current) return;

            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const duration = 3000; // 3 seconds total
            const progress = Math.min(elapsed / duration, 1);

            // Throttle updates to reduce re-renders (only update every ~16ms)
            if (now - lastUpdate >= updateInterval || progress >= 1) {
                // Smooth oscillation from 0 to 9 and back, slowing down over time
                // Start with fast oscillations, gradually slow down and settle on target
                
                // Frequency decreases over time (starts fast, ends slow)
                const frequency = 0.08 * (1 - progress * 0.95); // Start at 0.08, end near 0
                
                // Amplitude decreases over time (starts at full range, ends at 0)
                const amplitude = 4.5 * (1 - progress) * (1 - progress); // Quadratic decay
                
                // Smooth sine wave oscillation
                const oscillation = Math.sin(elapsed * frequency) * amplitude;
                
                // Base value that eases towards target (ease-out cubic)
                const targetProgress = 1 - Math.pow(1 - progress, 3);
                const baseValue = targetProgress * cheeseLevel;
                
                // Combine: smooth oscillation around the base value
                const currentValue = Math.max(0, Math.min(9, baseValue + oscillation));
                
                setAnimatedValue(currentValue);
                lastUpdate = now;
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // Ensure we end at the exact target value
                setAnimatedValue(cheeseLevel);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [cheeseLevel]);

    // Calculate handle position for emoji overlay
    const percentage = (animatedValue / 9) * 100;

    return (
        <Card
            className={styles.card}
            bodyStyle={{ padding: '24px' }}
        >
            <div className={styles.flexColumn}>
                <Text strong className={styles.subtitle}>
                    Cheese Level
                </Text>
                <div 
                    className="cheese-slider-container"
                    style={{ 
                        position: 'relative',
                        padding: '20px 0',
                        marginBottom: '8px'
                    }}
                >
                    <Slider
                        min={0}
                        max={9}
                        value={animatedValue}
                        disabled={false}
                        onChange={() => {}}
                        tooltip={{ formatter: (value) => `${value}` }}
                        styles={{
                            track: {
                                background: '#ffd700',
                                backgroundColor: '#ffd700'
                            },
                            rail: {
                                background: '#f0f0f0',
                                backgroundColor: '#f0f0f0'
                            },
                            handle: {
                                borderColor: '#ffd700',
                                backgroundColor: 'transparent',
                                width: '40px',
                                height: '40px',
                                marginTop: '-16px',
                                boxShadow: 'none',
                                border: 'none',
                                opacity: 0
                            }
                        }}
                    />
                    {/* Custom cheese emoji handle overlay */}
                    <div
                        className={styles.cheeseHandle}
                        style={{
                            left: `${percentage}%`,
                        }}
                    >
                        🧀
                    </div>
                    <style>{`
                        .cheese-slider-container .ant-slider .ant-slider-track {
                            background: #ffd700 !important;
                            background-color: #ffd700 !important;
                            height: 8px !important;
                        }
                        .cheese-slider-container .ant-slider .ant-slider-rail {
                            background: #f0f0f0 !important;
                            background-color: #f0f0f0 !important;
                            height: 8px !important;
                        }
                        .cheese-slider-container .ant-slider .ant-slider-handle {
                            pointer-events: none !important;
                            cursor: default !important;
                        }
                        .cheese-slider-container .ant-slider:hover .ant-slider-handle {
                            border-color: transparent !important;
                        }
                    `}</style>
                </div>
            </div>
        </Card>
    );
}
