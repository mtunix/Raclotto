import React, { useEffect, useState } from "react";
import { Util } from "../lib/util";

interface SlotMachineAnimationProps {
    ingredients?: any[]; // Optional, not used but kept for API compatibility
    duration?: number; // in milliseconds
    fading?: boolean; // Whether the animation should fade out
}

interface FlyingIngredient {
    id: number;
    icon: string;
    angle: number; // Direction in degrees (0-360)
    distance: number; // How far to fly
    rotation: number;
    scale: number;
    delay: number; // Animation delay in milliseconds
    side: "left" | "right"; // Which side to fly from
}

// Food-related emojis for the slot machine animation
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

export function SlotMachineAnimation(props: SlotMachineAnimationProps) {
    const { duration = 3000, fading = false } = props;
    const [flyingIngredients, setFlyingIngredients] = useState<FlyingIngredient[]>([]);
    const [centerX, setCenterX] = useState(0);
    const [centerY, setCenterY] = useState(0);
    const [reelIcons, setReelIcons] = useState<string[]>(["🍕", "🍔", "🌮"]);

    useEffect(() => {
        // Randomly select icons for the three reels
        const reel1Icon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];
        const reel2Icon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];
        const reel3Icon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];
        setReelIcons([reel1Icon, reel2Icon, reel3Icon]);

        // Calculate center of screen
        const centerXPos = window.innerWidth / 2;
        const centerYPos = window.innerHeight / 2;
        setCenterX(centerXPos);
        setCenterY(centerYPos);

        // Reduce particle count on mobile for better performance
        const isMobile = Util.isMobile();
        const isLowPerf = Util.isLowPerformanceDevice();
        const count = isLowPerf ? 15 : isMobile ? 20 : 35;
        const newFlyingIngredients: FlyingIngredient[] = [];

        // Calculate max distance (diagonal of screen)
        const maxDistance = Math.sqrt(
            Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
        );

        // Slot machine spins for 1.5 seconds, then ingredients fly out
        const spinDuration = 1500; // ms
        
        // Calculate delay spread: ingredients fly out one by one AFTER reels stop
        const remainingDuration = duration - spinDuration;
        const flightDuration = remainingDuration * 0.7; // Individual flight duration
        const maxDelay = remainingDuration - flightDuration;
        const delayStep = count > 1 ? maxDelay / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
            // Randomly select a food icon
            const randomIcon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];

            // Ingredients fly from left or right side of screen
            const side = Math.random() > 0.5 ? "left" : "right";
            
            // Calculate angle based on side
            let angle: number;
            let startX: number;
            let startY: number;
            
            if (side === "left") {
                startX = -100;
                startY = centerY + (Math.random() - 0.5) * window.innerHeight * 0.6;
                // Angle towards center-right
                angle = Math.random() * 60 + 15; // 15-75 degrees
            } else {
                startX = window.innerWidth + 100;
                startY = centerY + (Math.random() - 0.5) * window.innerHeight * 0.6;
                // Angle towards center-left
                angle = Math.random() * 60 + 105; // 105-165 degrees
            }
            
            // Random distance
            const distance = maxDistance * (0.5 + Math.random() * 0.5);

            newFlyingIngredients.push({
                id: i,
                icon: randomIcon,
                angle,
                distance,
                rotation: Math.random() * 360,
                scale: 0.9 + Math.random() * 0.3,
                delay: spinDuration + (i * delayStep),
                side
            });
        }

        setFlyingIngredients(newFlyingIngredients);
    }, [duration]);

    return (
        <div
            className={fading ? "slot-machine-animation-fading" : ""}
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
            {/* Slot machine frame */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate3d(-50%, -50%, 0)",
                    display: "flex",
                    willChange: "transform",
                    gap: Util.isMobile() ? "8px" : "20px",
                    alignItems: "center",
                    zIndex: 2,
                    padding: Util.isMobile() ? "12px" : "40px",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    borderRadius: Util.isMobile() ? "12px" : "20px",
                    border: Util.isMobile() ? "2px solid #ffd700" : "4px solid #ffd700",
                    boxShadow: "0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.2)",
                    maxWidth: "95vw",
                }}
            >
                {/* Three spinning reels */}
                {reelIcons.map((icon, index) => (
                    <div
                        key={index}
                        style={{
                            width: Util.isMobile() ? "60px" : "120px",
                            height: Util.isMobile() ? "75px" : "150px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            borderRadius: Util.isMobile() ? "6px" : "10px",
                            border: Util.isMobile() ? "1px solid #ffd700" : "2px solid #ffd700",
                            position: "relative",
                            overflow: "hidden",
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                fontSize: Util.isMobile() ? "40px" : "80px",
                                animation: `slotSpin${index} 1.5s ease-out forwards`,
                                animationDelay: `${index * 0.1}s`,
                                lineHeight: 1,
                            }}
                        >
                            <style>{`
                                @keyframes slotSpin${index} {
                                    0% {
                                        transform: translate3d(0, -200px, 0) rotate(0deg);
                                        opacity: 0.5;
                                    }
                                    70% {
                                        transform: translate3d(0, ${Math.random() * 100 - 50}px, 0) rotate(${360 * (index + 1)}deg);
                                        opacity: 0.8;
                                    }
                                    85% {
                                        transform: translate3d(0, ${Math.random() * 20 - 10}px, 0) rotate(${360 * (index + 1) + 180}deg);
                                        opacity: 1;
                                    }
                                    100% {
                                        transform: translate3d(0, 0, 0) rotate(${360 * (index + 1) + 360}deg);
                                        opacity: 1;
                                    }
                                }
                            `}</style>
                            {icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Casino-style lights effect */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate3d(-50%, -50%, 0)",
                    width: Util.isMobile() ? "90vw" : "500px",
                    height: Util.isMobile() ? "200px" : "300px",
                    zIndex: 1,
                    animation: "casinoLights 0.3s ease-in-out infinite",
                    pointerEvents: "none",
                }}
            >
                <style>{`
                    @keyframes casinoLights {
                        0%, 100% {
                            box-shadow: 
                                0 0 20px rgba(255, 215, 0, 0.3),
                                0 0 40px rgba(255, 0, 0, 0.2),
                                0 0 60px rgba(0, 255, 0, 0.2);
                        }
                        50% {
                            box-shadow: 
                                0 0 30px rgba(255, 215, 0, 0.5),
                                0 0 50px rgba(255, 0, 0, 0.4),
                                0 0 70px rgba(0, 255, 0, 0.4);
                        }
                    }
                `}</style>
            </div>

            {/* Flying ingredients from sides */}
            {flyingIngredients.map((item) => {
                // Calculate end position
                const angleRad = (item.angle * Math.PI) / 180;
                const endX = centerX + Math.cos(angleRad) * item.distance;
                const endY = centerY + Math.sin(angleRad) * item.distance;
                
                // Start position based on side
                let startX: number;
                let startY: number;
                if (item.side === "left") {
                    startX = -100;
                    startY = centerY + (Math.random() - 0.5) * window.innerHeight * 0.6;
                } else {
                    startX = window.innerWidth + 100;
                    startY = centerY + (Math.random() - 0.5) * window.innerHeight * 0.6;
                }
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const baseSize = 64;
                
                // Calculate transform values for each keyframe
                const translate20X = deltaX * 0.2;
                const translate20Y = deltaY * 0.2;
                const translate40X = deltaX * 0.4;
                const translate40Y = deltaY * 0.4;
                const translate60X = deltaX * 0.6;
                const translate60Y = deltaY * 0.6;
                const translate80X = deltaX * 0.8;
                const translate80Y = deltaY * 0.8;
                
                return (
                    <div
                        key={item.id}
                        className="slot-flying-ingredient"
                        style={{
                            position: "absolute",
                            left: `${startX}px`,
                            top: `${startY}px`,
                            fontSize: `${baseSize * item.scale}px`,
                            animation: `slotFly${item.id} ${(duration - 1500) * 0.7}ms ease-out forwards`,
                            animationDelay: `${item.delay}ms`,
                            willChange: "transform",
                            filter: Util.isMobile() ? "none" : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))",
                            lineHeight: 1,
                            transform: "translate3d(-50%, -50%, 0)",
                            contain: "layout style paint",
                        }}
                    >
                        <style>{`
                            @keyframes slotFly${item.id} {
                                0% {
                                    transform: translate3d(-50%, -50%, 0) rotate(${item.rotation}deg) scale(0.5);
                                    opacity: 0.8;
                                }
                                50% {
                                    transform: translate3d(calc(-50% + ${deltaX * 0.5}px), calc(-50% + ${deltaY * 0.5}px), 0) rotate(${item.rotation + 180}deg) scale(1.05);
                                    opacity: 1;
                                }
                                100% {
                                    transform: translate3d(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px), 0) rotate(${item.rotation + 360}deg) scale(0.8);
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


