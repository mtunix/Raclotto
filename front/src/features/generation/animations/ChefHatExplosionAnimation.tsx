import { useState } from "react";
import type { IngredientDto } from "../../../api/generated/model";
import { Util } from "../../../lib/util";
import { overlayClassName } from "./overlay";

interface ChefHatExplosionAnimationProps {
    ingredients?: IngredientDto[]; // Optional, not used but kept for API compatibility
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

// Food-related emojis for the chef hat animation
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

// Chef hat emoji options for center
const CHEF_HAT_EMOJIS = ["👨‍🍳", "👩‍🍳", "🧑‍🍳", "🎩", "👒"];

export function ChefHatExplosionAnimation(props: ChefHatExplosionAnimationProps) {
    const { duration = 3000, fading = false } = props;

    const [scene] = useState(() => {
        // Randomly select a chef hat emoji
        const randomChefHatEmoji = CHEF_HAT_EMOJIS[Math.floor(Math.random() * CHEF_HAT_EMOJIS.length)];

        // Calculate center of screen
        const centerXPos = window.innerWidth / 2;
        const centerYPos = window.innerHeight / 2;

        // Reduce particle count on mobile for better performance
        const isMobile = Util.isMobile();
        const isLowPerf = Util.isLowPerformanceDevice();
        const count = isLowPerf ? 15 : isMobile ? 20 : 35;
        const newFlyingIngredients: FlyingIngredient[] = [];

        // Calculate max distance (diagonal of screen)
        const maxDistance = Math.sqrt(
            Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
        );

        // Calculate delay spread: ingredients fly out one by one
        // Each ingredient's flight takes about 60% of total duration
        const flightDuration = duration * 0.6; // Individual flight duration
        const maxDelay = duration - flightDuration; // Maximum delay so last ingredient finishes in time
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
                delay: i * delayStep // Staggered delay: one by one
            });
        }

        return { centerEmoji: randomChefHatEmoji, centerX: centerXPos, centerY: centerYPos, flyingIngredients: newFlyingIngredients };
    });
    const { flyingIngredients, centerX, centerY, centerEmoji } = scene;

    return (
        <div
            className={overlayClassName(fading)}
        >
            {/* Chef hat element in center */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    fontSize: "250px",
                    zIndex: 1,
                    animation: "chefHatBounce 0.6s ease-in-out infinite",
                    filter: Util.isMobile() ? "none" : "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))",
                    lineHeight: 1,
                    willChange: "transform",
                    transform: "translate3d(-50%, -50%, 0)",
                }}
            >
                <style>{`
                    @keyframes chefHatBounce {
                        0%, 100% {
                            transform: translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1);
                        }
                        25% {
                            transform: translate3d(-50%, -50%, 0) translate3d(0, -15px, 0) scale(1.05);
                        }
                        50% {
                            transform: translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1);
                        }
                        75% {
                            transform: translate3d(-50%, -50%, 0) translate3d(0, -10px, 0) scale(1.03);
                        }
                    }
                `}</style>
                {centerEmoji}
            </div>

            {/* Flying ingredients */}
            {flyingIngredients.map((item) => {
                // Calculate end position using angle and distance
                const angleRad = (item.angle * Math.PI) / 180;
                const endX = centerX + Math.cos(angleRad) * item.distance;
                const endY = centerY + Math.sin(angleRad) * item.distance;
                const deltaX = endX - centerX;
                const deltaY = endY - centerY;
                const baseSize = 64;
                
                return (
                    <div
                        key={item.id}
                        className="chef-hat-flying-ingredient"
                        style={{
                            position: "absolute",
                            left: `${centerX}px`,
                            top: `${centerY}px`,
                            fontSize: `${baseSize * item.scale}px`,
                            animation: `chefHatFly${item.id} ${duration * 0.6}ms ease-out forwards`,
                            animationDelay: `${item.delay}ms`,
                            willChange: "transform",
                            filter: Util.isMobile() ? "none" : "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))",
                            lineHeight: 1,
                            transform: "translate3d(-50%, -50%, 0)",
                            contain: "layout style paint",
                        }}
                    >
                        <style>{`
                            @keyframes chefHatFly${item.id} {
                                0% {
                                    transform: translate3d(-50%, -50%, 0) translate3d(0, 0, 0) rotate(${item.rotation}deg) scale(0.5);
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
