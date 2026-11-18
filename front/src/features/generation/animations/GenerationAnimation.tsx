import React, { useMemo, useEffect } from "react";
import { ChaoticGenerationAnimation } from "./ChaoticGenerationAnimation";
import { BlenderSpinAnimation } from "./BlenderSpinAnimation";
import { ChefHatExplosionAnimation } from "./ChefHatExplosionAnimation";
import { PinataPartyAnimation } from "./PinataPartyAnimation";
import { SlotMachineAnimation } from "./SlotMachineAnimation";
import { ShootingIngredientsAnimation } from "./ShootingIngredientsAnimation";

interface GenerationAnimationProps {
    ingredients?: any[];
    duration?: number;
    fading?: boolean;
    onDurationChange?: (duration: number) => void;
}

// Default durations for each animation type
const ANIMATION_DURATIONS: Record<string, number> = {
    chaotic: 1000,
    cloud: 3000,
    blender: 3000,
    chefHat: 3000,
    pinata: 4000,
    slotMachine: 3000,
    shooting: 3500,
};

export function GenerationAnimation(props: GenerationAnimationProps) {
    const { onDurationChange } = props;
    
    // Randomly select an animation type
    const animationType = useMemo(() => {
        const animations = [
            "chaotic",
            "blender",
            "chefHat",
            "pinata",
            "slotMachine",
            "shooting"
        ];
        return animations[Math.floor(Math.random() * animations.length)];
    }, []);

    // Calculate the actual duration (use prop if provided, otherwise use default for animation type)
    const actualDuration = props.duration ?? ANIMATION_DURATIONS[animationType] ?? 3000;

    // Notify parent of the duration
    useEffect(() => {
        if (onDurationChange) {
            onDurationChange(actualDuration);
        }
    }, [actualDuration, onDurationChange]);

    if (animationType === "blender") {
        return <BlenderSpinAnimation {...props} duration={actualDuration} />;
    }

    if (animationType === "chefHat") {
        return <ChefHatExplosionAnimation {...props} duration={actualDuration} />;
    }

    if (animationType === "pinata") {
        return <PinataPartyAnimation {...props} duration={actualDuration} />;
    }

    if (animationType === "slotMachine") {
        return <SlotMachineAnimation {...props} duration={actualDuration} />;
    }

    if (animationType === "shooting") {
        return <ShootingIngredientsAnimation {...props} duration={actualDuration} />;
    }

    return <ChaoticGenerationAnimation {...props} duration={actualDuration} />;
}
