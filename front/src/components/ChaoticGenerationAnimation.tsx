import React, { useEffect, useState } from "react";
import { Util } from "../lib/util";

interface ChaoticGenerationAnimationProps {
    ingredients?: any[]; // Optional, not used but kept for API compatibility
    duration?: number; // in milliseconds
    fading?: boolean; // Whether the animation should fade out
}

interface FlyingIngredient {
    id: number;
    icon: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    rotation: number;
    scale: number;
}

// Food-related emojis for the chaotic animation
const FOOD_ICONS = [
    "🥗", "🍯", "🍕", "🍔", "🌮", "🌯", "🥙", "🌭", "🍖", "🍗",
    "🥩", "🥓", "🍳", "🧀", "🥚", "🥑", "🥒", "🥕", "🌽", "🥔",
    "🍅", "🥬", "🥦", "🥑", "🍄", "🌶️", "🫑", "🥒", "🥕", "🌶️",
    "🧄", "🧅", "🍠", "🥜", "🌰", "🥖", "🥐", "🥨", "🥯", "🥞",
    "🧇", "🍞", "🥪", "🌮", "🌯", "🥙", "🍝", "🍜", "🍲", "🍛",
    "🍣", "🍱", "🥟", "🥠", "🥡", "🍤", "🦐", "🦑", "🦞", "🦀",
    "🐟", "🐠", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🍰", "🎂",
    "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🥨"
];

export function ChaoticGenerationAnimation(props: ChaoticGenerationAnimationProps) {
    const { duration = 1000, fading = false } = props;
    const [flyingIngredients, setFlyingIngredients] = useState<FlyingIngredient[]>([]);

    useEffect(() => {
        // Reduce particle count on mobile for better performance
        const isMobile = Util.isMobile();
        const isLowPerf = Util.isLowPerformanceDevice();
        const count = isLowPerf ? 15 : isMobile ? 20 : 35;
        const newFlyingIngredients: FlyingIngredient[] = [];

        for (let i = 0; i < count; i++) {
            // Randomly select a food icon
            const randomIcon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];

            // Random starting position (from various edges)
            const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            let startX = 0;
            let startY = 0;
            
            if (edge === 0) {
                // Top edge
                startX = Math.random() * window.innerWidth;
                startY = -100;
            } else if (edge === 1) {
                // Right edge
                startX = window.innerWidth + 100;
                startY = Math.random() * window.innerHeight;
            } else if (edge === 2) {
                // Bottom edge
                startX = Math.random() * window.innerWidth;
                startY = window.innerHeight + 100;
            } else {
                // Left edge
                startX = -100;
                startY = Math.random() * window.innerHeight;
            }

            // Random ending position (opposite side or random)
            const endX = Math.random() * window.innerWidth;
            const endY = Math.random() * window.innerHeight;

            newFlyingIngredients.push({
                id: i,
                icon: randomIcon,
                startX,
                startY,
                endX,
                endY,
                rotation: Math.random() * 360,
                scale: 0.9 + Math.random() * 0.3 // Random scale between 0.9 and 1.2
            });
        }

        setFlyingIngredients(newFlyingIngredients);
    }, []);

    return (
        <div
            className={fading ? "chaotic-animation-fading" : ""}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: "none",
                overflow: "hidden",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                backdropFilter: Util.isMobile() ? "none" : "blur(2px)",
                transition: fading ? "opacity 250ms ease-out" : "none",
                opacity: fading ? 0 : 1
            }}
        >
            {flyingIngredients.map((item) => {
                const deltaX = item.endX - item.startX;
                const deltaY = item.endY - item.startY;
                const baseSize = 64; // Increased from 24 to 64
                
                return (
                    <div
                        key={item.id}
                        className="chaotic-flying-ingredient"
                        style={{
                            position: "absolute",
                            left: `${item.startX}px`,
                            top: `${item.startY}px`,
                            fontSize: `${baseSize * item.scale}px`,
                            animation: `flyChaotic${item.id} ${duration}ms ease-out forwards`,
                            animationDelay: `${Math.random() * 200}ms`,
                            willChange: "transform",
                            filter: Util.isMobile() ? "none" : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))",
                            lineHeight: 1,
                            contain: "layout style paint",
                        }}
                    >
                        <style>{`
                            @keyframes flyChaotic${item.id} {
                                0% {
                                    transform: translate3d(0, 0, 0) rotate(${item.rotation}deg) scale(0.5);
                                    opacity: 0.8;
                                }
                                50% {
                                    transform: translate3d(${deltaX * 0.5}px, ${deltaY * 0.5}px, 0) rotate(${item.rotation + 180}deg) scale(1.05);
                                    opacity: 1;
                                }
                                100% {
                                    transform: translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${item.rotation + 360}deg) scale(0.8);
                                    opacity: 0;
                                }
                            }
                        `}</style>
                        {item.icon}
                    </div>
                );
            })}
        </div>
    );
}
