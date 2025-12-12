import React, { useEffect, useState } from "react";

interface BlenderSpinAnimationProps {
    ingredients?: any[]; // Optional, not used but kept for API compatibility
    duration?: number; // in milliseconds
    fading?: boolean; // Whether the animation should fade out
}

interface FlyingIngredient {
    id: number;
    icon: string;
    angle: number; // Final direction in degrees (0-360)
    distance: number; // How far to fly outward
    rotation: number;
    scale: number;
    delay: number; // Animation delay in milliseconds
    orbitAngle: number; // Starting angle for the orbit around blender
}

// Food-related emojis for the blender animation
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

// Blender/mixer emoji options for center
const BLENDER_EMOJIS = ["🍹", "🥤", "🧊", "🥛", "🍶", "🧃"];

export function BlenderSpinAnimation(props: BlenderSpinAnimationProps) {
    const { duration = 3000, fading = false } = props;
    const [flyingIngredients, setFlyingIngredients] = useState<FlyingIngredient[]>([]);
    const [centerX, setCenterX] = useState(0);
    const [centerY, setCenterY] = useState(0);
    const [centerEmoji, setCenterEmoji] = useState("🍹");

    useEffect(() => {
        // Randomly select a blender/mixer emoji
        const randomBlenderEmoji = BLENDER_EMOJIS[Math.floor(Math.random() * BLENDER_EMOJIS.length)];
        setCenterEmoji(randomBlenderEmoji);

        // Calculate center of screen
        const centerXPos = window.innerWidth / 2;
        const centerYPos = window.innerHeight / 2;
        setCenterX(centerXPos);
        setCenterY(centerYPos);

        // Create 30-40 flying food icon elements
        const count = 35;
        const newFlyingIngredients: FlyingIngredient[] = [];

        // Calculate max distance (diagonal of screen)
        const maxDistance = Math.sqrt(
            Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
        );

        // Orbit radius around the blender
        const orbitRadius = 120; // Distance from blender center for orbiting

        // Calculate delay spread: ingredients fly out one by one
        // Each ingredient's flight takes about 60% of total duration
        const flightDuration = duration * 0.6; // Individual flight duration
        const maxDelay = duration - flightDuration; // Maximum delay so last ingredient finishes in time
        const delayStep = count > 1 ? maxDelay / (count - 1) : 0; // Even spacing between ingredient starts

        for (let i = 0; i < count; i++) {
            // Randomly select a food icon
            const randomIcon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];

            // Random final angle in degrees (0-360) for outward flight
            const finalAngle = Math.random() * 360;
            
            // Random distance (60% to 100% of max distance to ensure ingredients go off screen)
            const finalDistance = maxDistance * (0.6 + Math.random() * 0.4);

            // Starting angle for orbit (evenly distributed around the blender)
            const orbitAngle = (i / count) * 360;

            newFlyingIngredients.push({
                id: i,
                icon: randomIcon,
                angle: finalAngle,
                distance: finalDistance,
                rotation: Math.random() * 360,
                scale: 0.9 + Math.random() * 0.3, // Random scale between 0.9 and 1.2
                delay: i * delayStep, // Staggered delay: one by one
                orbitAngle: orbitAngle
            });
        }

        setFlyingIngredients(newFlyingIngredients);
    }, [duration]);

    return (
        <div
            className={fading ? "blender-animation-fading" : ""}
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
                backdropFilter: "blur(2px)",
                transition: fading ? "opacity 250ms ease-out" : "none",
                opacity: fading ? 0 : 1
            }}
        >
            {/* Blender element in center */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: "200px",
                    zIndex: 1,
                    animation: "blenderSpin 0.5s linear infinite",
                    filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))",
                    lineHeight: 1,
                }}
            >
                <style>{`
                    @keyframes blenderSpin {
                        0% {
                            transform: translate(-50%, -50%) rotate(0deg);
                        }
                        100% {
                            transform: translate(-50%, -50%) rotate(360deg);
                        }
                    }
                `}</style>
                {centerEmoji}
            </div>

            {/* Flying ingredients */}
            {flyingIngredients.map((item) => {
                // Calculate orbit starting position
                const orbitAngleRad = (item.orbitAngle * Math.PI) / 180;
                const orbitStartX = centerX + Math.cos(orbitAngleRad) * 120; // 120px orbit radius
                const orbitStartY = centerY + Math.sin(orbitAngleRad) * 120;

                // Calculate final position using angle and distance
                const finalAngleRad = (item.angle * Math.PI) / 180;
                const endX = centerX + Math.cos(finalAngleRad) * item.distance;
                const endY = centerY + Math.sin(finalAngleRad) * item.distance;
                
                // Delta from orbit start to final position
                const deltaX = endX - orbitStartX;
                const deltaY = endY - orbitStartY;
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
                        className="blender-flying-ingredient"
                        style={{
                            position: "absolute",
                            left: `${orbitStartX}px`,
                            top: `${orbitStartY}px`,
                            fontSize: `${baseSize * item.scale}px`,
                            animation: `blenderFly${item.id} ${duration * 0.6}ms ease-out forwards`,
                            animationDelay: `${item.delay}ms`,
                            willChange: "transform",
                            filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))",
                            lineHeight: 1,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <style>{`
                            @keyframes blenderFly${item.id} {
                                0% {
                                    transform: translate(-50%, -50%) rotate(${item.rotation}deg) scale(0.8);
                                    opacity: 0.9;
                                }
                                20% {
                                    transform: translate(calc(-50% + ${translate20X}px), calc(-50% + ${translate20Y}px)) rotate(${item.rotation + 72}deg) scale(1);
                                    opacity: 1;
                                }
                                40% {
                                    transform: translate(calc(-50% + ${translate40X}px), calc(-50% + ${translate40Y}px)) rotate(${item.rotation + 144}deg) scale(1.1);
                                    opacity: 1;
                                }
                                60% {
                                    transform: translate(calc(-50% + ${translate60X}px), calc(-50% + ${translate60Y}px)) rotate(${item.rotation + 216}deg) scale(1.1);
                                    opacity: 1;
                                }
                                80% {
                                    transform: translate(calc(-50% + ${translate80X}px), calc(-50% + ${translate80Y}px)) rotate(${item.rotation + 288}deg) scale(1);
                                    opacity: 1;
                                }
                                100% {
                                    transform: translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) rotate(${item.rotation + 360}deg) scale(0.8);
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
