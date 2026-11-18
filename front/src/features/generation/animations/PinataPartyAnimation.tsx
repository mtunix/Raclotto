import React, { useEffect, useState } from "react";
import { Util } from "../../../lib/util";

interface PinataPartyAnimationProps {
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
}

// Food-related emojis for the piñata animation
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

// Piñata emoji options for center
const PINATA_EMOJIS = ["🎉", "🎊", "🎈", "🪅", "🎁"];

// Boom emoji options for explosion
const BOOM_EMOJIS = ["💥", "💣", "⚡", "🔥", "✨"];

// Confetti emoji options
const CONFETTI_EMOJIS = ["✨", "⭐", "🌟", "💫", "🎊", "🎉"];

export function PinataPartyAnimation(props: PinataPartyAnimationProps) {
    const { duration = 4000, fading = false } = props;
    const [flyingIngredients, setFlyingIngredients] = useState<FlyingIngredient[]>([]);
    const [confetti, setConfetti] = useState<FlyingIngredient[]>([]);
    const [centerX, setCenterX] = useState(0);
    const [centerY, setCenterY] = useState(0);
    const [pinataEmoji, setPinataEmoji] = useState("🎉");
    const [boomEmoji, setBoomEmoji] = useState("💥");

    useEffect(() => {
        // Randomly select a piñata emoji and boom emoji
        const randomPinataEmoji = PINATA_EMOJIS[Math.floor(Math.random() * PINATA_EMOJIS.length)];
        const randomBoomEmoji = BOOM_EMOJIS[Math.floor(Math.random() * BOOM_EMOJIS.length)];
        setPinataEmoji(randomPinataEmoji);
        setBoomEmoji(randomBoomEmoji);

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
        const newConfetti: FlyingIngredient[] = [];

        // Calculate max distance (diagonal of screen)
        const maxDistance = Math.sqrt(
            Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
        );

        // Piñata break (600ms) + boom explosion (400ms) = 1000ms total before ingredients start
        const pinataBreakDuration = 1000; // ms
        
        // Calculate delay spread: ingredients fly out one by one AFTER piñata breaks
        // Each ingredient's flight takes about 70% of remaining duration (longer for visibility)
        const remainingDuration = duration - pinataBreakDuration;
        const flightDuration = remainingDuration * 0.7; // Individual flight duration (longer for better visibility)
        const maxDelay = remainingDuration - flightDuration; // Maximum delay so last ingredient finishes in time
        const delayStep = count > 1 ? maxDelay / (count - 1) : 0; // Even spacing between ingredient starts

        for (let i = 0; i < count; i++) {
            // Randomly select a food icon
            const randomIcon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];

            // Random angle in degrees (0-360)
            const angle = Math.random() * 360;
            
            // Random distance (60% to 100% of max distance to ensure ingredients go off screen)
            const distance = maxDistance * (0.6 + Math.random() * 0.4);

            newFlyingIngredients.push({
                id: i,
                icon: randomIcon,
                angle,
                distance,
                rotation: Math.random() * 360,
                scale: 0.9 + Math.random() * 0.3, // Random scale between 0.9 and 1.2
                delay: pinataBreakDuration + (i * delayStep) // Start after piñata breaks, then stagger
            });
        }

        // Create confetti particles (smaller, faster, more numerous)
        // Confetti also starts after piñata breaks
        // Reduce confetti on mobile
        const confettiCount = isLowPerf ? 5 : isMobile ? 10 : 20;
        for (let i = 0; i < confettiCount; i++) {
            const randomConfetti = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
            const angle = Math.random() * 360;
            const distance = maxDistance * (0.4 + Math.random() * 0.3); // Shorter distance for confetti

            newConfetti.push({
                id: i + 1000, // Offset ID to avoid conflicts
                icon: randomConfetti,
                angle,
                distance,
                rotation: Math.random() * 360,
                scale: 0.5 + Math.random() * 0.3, // Smaller scale for confetti
                delay: pinataBreakDuration + (Math.random() * 200) // Start after piñata breaks, then random small delay
            });
        }

        setFlyingIngredients(newFlyingIngredients);
        setConfetti(newConfetti);
    }, [duration]);

    return (
        <div
            className={fading ? "pinata-animation-fading" : ""}
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
            {/* Piñata element in center - breaks first */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    fontSize: "250px",
                    zIndex: 2,
                    animation: "pinataBreak 0.6s ease-out forwards",
                    filter: Util.isMobile() ? "none" : "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))",
                    lineHeight: 1,
                    willChange: "transform",
                    transform: "translate3d(-50%, -50%, 0)",
                }}
            >
                <style>{`
                    @keyframes pinataBreak {
                        0% {
                            transform: translate3d(-50%, -50%, 0) scale(1) rotate(0deg);
                            opacity: 1;
                        }
                        30% {
                            transform: translate3d(-50%, -50%, 0) scale(1.2) rotate(5deg);
                            opacity: 1;
                        }
                        60% {
                            transform: translate3d(-50%, -50%, 0) scale(1.1) rotate(-5deg);
                            opacity: 0.8;
                        }
                        100% {
                            transform: translate3d(-50%, -50%, 0) scale(0.8) rotate(0deg);
                            opacity: 0;
                        }
                    }
                `}</style>
                {pinataEmoji}
            </div>

            {/* Boom emoji - appears when piñata breaks and scales up quickly */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    fontSize: "300px",
                    zIndex: 2,
                    animation: "boomExplosion 0.4s ease-out 0.6s forwards",
                    filter: Util.isMobile() ? "none" : "drop-shadow(0 8px 16px rgba(255, 100, 0, 0.5))",
                    lineHeight: 1,
                    opacity: 0,
                    willChange: "transform",
                    transform: "translate3d(-50%, -50%, 0)",
                }}
            >
                <style>{`
                    @keyframes boomExplosion {
                        0% {
                            transform: translate3d(-50%, -50%, 0) scale(0) rotate(0deg);
                            opacity: 1;
                            visibility: visible;
                        }
                        50% {
                            transform: translate3d(-50%, -50%, 0) scale(1.5) rotate(180deg);
                            opacity: 1;
                            visibility: visible;
                        }
                        100% {
                            transform: translate3d(-50%, -50%, 0) scale(1.2) rotate(360deg);
                            opacity: 0;
                            visibility: hidden;
                        }
                    }
                `}</style>
                {boomEmoji}
            </div>

            {/* Confetti particles */}
            {confetti.map((item) => {
                const angleRad = (item.angle * Math.PI) / 180;
                const endX = centerX + Math.cos(angleRad) * item.distance;
                const endY = centerY + Math.sin(angleRad) * item.distance;
                const deltaX = endX - centerX;
                const deltaY = endY - centerY;
                
                return (
                    <div
                        key={item.id}
                        className="pinata-confetti"
                        style={{
                            position: "absolute",
                            left: `${centerX}px`,
                            top: `${centerY}px`,
                            fontSize: `${32 * item.scale}px`,
                            animation: `pinataConfetti${item.id} ${(duration - 1000) * 0.6}ms ease-out forwards`,
                            animationDelay: `${item.delay}ms`,
                            willChange: "transform",
                            filter: Util.isMobile() ? "none" : "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                            lineHeight: 1,
                            transform: "translate3d(-50%, -50%, 0)",
                            contain: "layout style paint",
                        }}
                    >
                        <style>{`
                            @keyframes pinataConfetti${item.id} {
                                0% {
                                    transform: translate3d(-50%, -50%, 0) rotate(${item.rotation}deg) scale(0.5);
                                    opacity: 1;
                                }
                                50% {
                                    transform: translate3d(calc(-50% + ${deltaX * 0.5}px), calc(-50% + ${deltaY * 0.5}px), 0) rotate(${item.rotation + 180}deg) scale(1);
                                    opacity: 1;
                                }
                                100% {
                                    transform: translate3d(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px), 0) rotate(${item.rotation + 360}deg) scale(0.3);
                                    opacity: 0;
                                }
                            }
                        `}</style>
                        {item.icon}
                    </div>
                );
            })}

            {/* Flying ingredients */}
            {flyingIngredients.map((item) => {
                // Calculate end position using angle and distance
                const angleRad = (item.angle * Math.PI) / 180;
                const endX = centerX + Math.cos(angleRad) * item.distance;
                const endY = centerY + Math.sin(angleRad) * item.distance;
                const deltaX = endX - centerX;
                const deltaY = endY - centerY;
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
                        className="pinata-flying-ingredient"
                        style={{
                            position: "absolute",
                            left: `${centerX}px`,
                            top: `${centerY}px`,
                            fontSize: `${baseSize * item.scale}px`,
                            animation: `pinataFly${item.id} ${(duration - 1000) * 0.7}ms ease-out forwards`,
                            animationDelay: `${item.delay}ms`,
                            willChange: "transform",
                            filter: Util.isMobile() ? "none" : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))",
                            lineHeight: 1,
                            transform: "translate3d(-50%, -50%, 0)",
                            contain: "layout style paint",
                        }}
                    >
                        <style>{`
                            @keyframes pinataFly${item.id} {
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
