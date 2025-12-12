import React, { useEffect, useState } from "react";
import { VectorGraphics } from "../lib/vectorGraphics";

interface ShootingIngredientsAnimationProps {
    ingredients?: any[];
    duration?: number;
    fading?: boolean;
}

interface RocketPosition {
    x: number;
    y: number;
    angle: number;
    time: number; // Time along the rocket's flight path (0 to 1)
}

interface IngredientEjection {
    id: number;
    ingredient: string;
    rocketTime: number; // When during rocket flight this ingredient is ejected (0 to 1)
    ejectionAngle: number; // Angle relative to rocket's direction
    speed: number;
}

interface SmokeParticle {
    id: number;
    rocketTime: number; // When during rocket flight this smoke appears
    offsetX: number;
    offsetY: number;
    size: number;
    opacity: number;
}

export function ShootingIngredientsAnimation(props: ShootingIngredientsAnimationProps) {
    const { duration = 3500, fading = false, ingredients = [] } = props;
    const [ejections, setEjections] = useState<IngredientEjection[]>([]);
    const [rocketPath, setRocketPath] = useState<{ startX: number; startY: number; endX: number; endY: number; angle: number } | null>(null);
    const [exhaustParticles, setExhaustParticles] = useState<SmokeParticle[]>([]);

    useEffect(() => {
        // Use actual ingredients if available, otherwise use food emojis
        const availableIngredients = ingredients.length > 0 
            ? ingredients.filter((i: any) => i.available !== false)
            : [];

        // Number of ingredient ejections (8-12 ingredients)
        const ejectionCount = Math.min(availableIngredients.length || 10, 12);
        const newEjections: IngredientEjection[] = [];

        // Rocket flight path - diagonal across screen
        const startX = -100; // Start off-screen left
        const startY = window.innerHeight * 0.3; // Upper third
        const endX = window.innerWidth + 100; // End off-screen right
        const endY = window.innerHeight * 0.7; // Lower third
        const rocketAngle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

        setRocketPath({ startX, startY, endX, endY, angle: rocketAngle });

        // Create ingredient ejections - spread throughout rocket flight
        for (let i = 0; i < ejectionCount; i++) {
            // Select ingredient or use emoji
            let ingredientDisplay: string;
            if (availableIngredients.length > 0 && availableIngredients[i % availableIngredients.length]) {
                const ing = availableIngredients[i % availableIngredients.length];
                ingredientDisplay = ing.type === 1 ? VectorGraphics.INGREDIENT : VectorGraphics.SAUCE;
            } else {
                // Fallback emojis
                const emojis = ["🍕", "🍔", "🌮", "🥙", "🍖", "🍗", "🥩", "🥓", "🍳", "🧀", "🥚", "🥑"];
                ingredientDisplay = emojis[i % emojis.length];
            }

            // Eject ingredients throughout the flight (from 10% to 90% of flight)
            const rocketTime = 0.1 + (i / (ejectionCount - 1)) * 0.8;
            
            // Ejection angle - behind the rocket (opposite direction + some spread)
            const baseEjectionAngle = rocketAngle + 180; // Behind rocket
            const ejectionAngle = baseEjectionAngle + (Math.random() - 0.5) * 60; // ±30 degrees spread

            newEjections.push({
                id: i,
                ingredient: ingredientDisplay,
                rocketTime,
                ejectionAngle,
                speed: 0.3 + Math.random() * 0.4 // Random speed
            });
        }

        setEjections(newEjections);

        // Create exhaust smoke particles
        const exhaustCount = 30;
        const newExhaust: SmokeParticle[] = [];
        for (let i = 0; i < exhaustCount; i++) {
            newExhaust.push({
                id: i,
                rocketTime: i / exhaustCount, // Spread throughout flight
                offsetX: (Math.random() - 0.5) * 40,
                offsetY: (Math.random() - 0.5) * 40,
                size: 12 + Math.random() * 20,
                opacity: 0.5 + Math.random() * 0.4
            });
        }
        setExhaustParticles(newExhaust);
    }, [duration, ingredients]);

    if (!rocketPath) return null;

    const rocketDeltaX = rocketPath.endX - rocketPath.startX;
    const rocketDeltaY = rocketPath.endY - rocketPath.startY;

    return (
        <div
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
            {/* Rocket exhaust smoke */}
            {exhaustParticles.map((particle) => {
                const rocketX = rocketPath.startX + (rocketDeltaX * particle.rocketTime);
                const rocketY = rocketPath.startY + (rocketDeltaY * particle.rocketTime);
                const exhaustDelay = particle.rocketTime * duration;
                const exhaustDuration = duration * 0.3;

                return (
                    <div
                        key={`exhaust-${particle.id}`}
                        style={{
                            position: "absolute",
                            left: `${rocketX}px`,
                            top: `${rocketY}px`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            borderRadius: "50%",
                            background: `radial-gradient(circle, rgba(255, 150, 50, ${particle.opacity}) 0%, rgba(200, 100, 0, ${particle.opacity * 0.6}) 50%, rgba(150, 50, 0, 0) 100%)`,
                            filter: "blur(10px)",
                            animation: `exhaustFade${particle.id} ${exhaustDuration}ms ease-out forwards`,
                            animationDelay: `${exhaustDelay}ms`,
                            pointerEvents: "none",
                            zIndex: 2,
                            transform: "translate(-50%, -50%)"
                        }}
                    >
                        <style>{`
                            @keyframes exhaustFade${particle.id} {
                                0% {
                                    transform: translate(-50%, -50%) translate(${particle.offsetX}px, ${particle.offsetY}px) scale(0.5);
                                    opacity: ${particle.opacity};
                                }
                                50% {
                                    transform: translate(-50%, -50%) translate(${particle.offsetX * 1.5}px, ${particle.offsetY * 1.5}px) scale(1.2);
                                    opacity: ${particle.opacity * 0.8};
                                }
                                100% {
                                    transform: translate(-50%, -50%) translate(${particle.offsetX * 2.5}px, ${particle.offsetY * 2.5}px) scale(2);
                                    opacity: 0;
                                }
                            }
                        `}</style>
                    </div>
                );
            })}

            {/* Rocket */}
            <div
                style={{
                    position: "absolute",
                    left: `${rocketPath.startX}px`,
                    top: `${rocketPath.startY}px`,
                    fontSize: "60px",
                    filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))",
                    zIndex: 10,
                    animation: `rocketFlight ${duration}ms linear forwards`,
                    transform: "translate(-50%, -50%)",
                    transformOrigin: "center center"
                }}
            >
                <style>{`
                    @keyframes rocketFlight {
                        0% {
                            transform: translate(-50%, -50%) translate(0, 0) rotate(${rocketPath.angle}deg);
                        }
                        100% {
                            transform: translate(-50%, -50%) translate(${rocketDeltaX}px, ${rocketDeltaY}px) rotate(${rocketPath.angle}deg);
                        }
                    }
                `}</style>
                🚀
            </div>

            {/* Ingredients ejected from rocket engine */}
            {ejections.map((ejection) => {
                const rocketX = rocketPath.startX + (rocketDeltaX * ejection.rocketTime);
                const rocketY = rocketPath.startY + (rocketDeltaY * ejection.rocketTime);
                const ejectionDelay = ejection.rocketTime * duration;
                const ingredientDuration = duration * 0.6;
                
                // Calculate ingredient trajectory (behind rocket)
                const ejectionRad = (ejection.ejectionAngle * Math.PI) / 180;
                const distance = 200 * ejection.speed;
                const ingredientEndX = rocketX + Math.cos(ejectionRad) * distance;
                const ingredientEndY = rocketY + Math.sin(ejectionRad) * distance;
                const ingredientDeltaX = ingredientEndX - rocketX;
                const ingredientDeltaY = ingredientEndY - rocketY;

                return (
                    <React.Fragment key={ejection.id}>
                        {/* Ingredient smoke trail */}
                        {Array.from({ length: 8 }).map((_, smokeIdx) => {
                            const smokeDelay = ejectionDelay + (smokeIdx * 30);
                            const smokeDuration = ingredientDuration * 0.4;
                            const smokeProgress = smokeIdx / 8;
                            const smokeX = rocketX + (ingredientDeltaX * smokeProgress * 0.3);
                            const smokeY = rocketY + (ingredientDeltaY * smokeProgress * 0.3);
                            const smokeDeltaX = ingredientDeltaX * 0.3;
                            const smokeDeltaY = ingredientDeltaY * 0.3;

                            return (
                                <div
                                    key={`smoke-${ejection.id}-${smokeIdx}`}
                                    style={{
                                        position: "absolute",
                                        left: `${smokeX}px`,
                                        top: `${smokeY}px`,
                                        width: `${12 + smokeIdx * 2}px`,
                                        height: `${12 + smokeIdx * 2}px`,
                                        borderRadius: "50%",
                                        background: `radial-gradient(circle, rgba(180, 180, 180, ${0.6 - smokeIdx * 0.05}) 0%, rgba(120, 120, 120, 0) 100%)`,
                                        filter: "blur(6px)",
                                        animation: `ingredientSmoke${ejection.id}_${smokeIdx} ${smokeDuration}ms ease-out forwards`,
                                        animationDelay: `${smokeDelay}ms`,
                                        pointerEvents: "none",
                                        zIndex: 3,
                                        transform: "translate(-50%, -50%)"
                                    }}
                                >
                                    <style>{`
                                        @keyframes ingredientSmoke${ejection.id}_${smokeIdx} {
                                            0% {
                                                transform: translate(-50%, -50%) translate(0, 0) scale(0.3);
                                                opacity: ${0.6 - smokeIdx * 0.05};
                                            }
                                            50% {
                                                transform: translate(-50%, -50%) translate(${smokeDeltaX * 0.5}px, ${smokeDeltaY * 0.5}px) scale(1);
                                                opacity: ${(0.6 - smokeIdx * 0.05) * 0.8};
                                            }
                                            100% {
                                                transform: translate(-50%, -50%) translate(${smokeDeltaX}px, ${smokeDeltaY}px) scale(1.8);
                                                opacity: 0;
                                            }
                                        }
                                    `}</style>
                                </div>
                            );
                        })}

                        {/* Ejected ingredient */}
                        <div
                            style={{
                                position: "absolute",
                                left: `${rocketX}px`,
                                top: `${rocketY}px`,
                                fontSize: "40px",
                                animation: `ejectIngredient${ejection.id} ${ingredientDuration}ms ease-out forwards`,
                                animationDelay: `${ejectionDelay}ms`,
                                willChange: "transform",
                                filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))",
                                lineHeight: 1,
                                transform: "translate(-50%, -50%)",
                                zIndex: 5
                            }}
                        >
                            <style>{`
                                @keyframes ejectIngredient${ejection.id} {
                                    0% {
                                        transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(0.6);
                                        opacity: 1;
                                    }
                                    30% {
                                        transform: translate(-50%, -50%) translate(${ingredientDeltaX * 0.3}px, ${ingredientDeltaY * 0.3}px) rotate(180deg) scale(1.1);
                                        opacity: 1;
                                    }
                                    70% {
                                        transform: translate(-50%, -50%) translate(${ingredientDeltaX * 0.7}px, ${ingredientDeltaY * 0.7}px) rotate(300deg) scale(1);
                                        opacity: 0.9;
                                    }
                                    100% {
                                        transform: translate(-50%, -50%) translate(${ingredientDeltaX}px, ${ingredientDeltaY}px) rotate(360deg) scale(0.8);
                                        opacity: 0.7;
                                    }
                                }
                            `}</style>
                            {ejection.ingredient}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
