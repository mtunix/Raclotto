import { useEffect, useState } from "react";
import type { IngredientDto } from "../../../api/generated/model";
import { ChaoticGenerationAnimation } from "./ChaoticGenerationAnimation";
import { BlenderSpinAnimation } from "./BlenderSpinAnimation";
import { ChefHatExplosionAnimation } from "./ChefHatExplosionAnimation";
import { PinataPartyAnimation } from "./PinataPartyAnimation";
import { SlotMachineAnimation } from "./SlotMachineAnimation";
import { ShootingIngredientsAnimation } from "./ShootingIngredientsAnimation";

interface GenerationAnimationProps {
    ingredients?: IngredientDto[];
    duration?: number;
    fading?: boolean;
    onDurationChange?: (duration: number) => void;
    /** Picks the animation: a number in [0, 1), like `Math.random`. */
    random?: () => number;
}

const ANIMATION_TYPES = ["chaotic", "blender", "chefHat", "pinata", "slotMachine", "shooting"] as const;

const ANIMATION_DURATIONS: Record<(typeof ANIMATION_TYPES)[number], number> = {
    chaotic: 1000,
    blender: 3000,
    chefHat: 3000,
    pinata: 4000,
    slotMachine: 3000,
    shooting: 3500,
};

/** One of the roll animations, picked at random when it mounts; reports how long it plays. */
export function GenerationAnimation({ random = Math.random, ...props }: GenerationAnimationProps) {
    const { onDurationChange } = props;
    const [animationType] = useState(() => ANIMATION_TYPES[Math.floor(random() * ANIMATION_TYPES.length)]);
    const actualDuration = props.duration ?? ANIMATION_DURATIONS[animationType];

    useEffect(() => {
        onDurationChange?.(actualDuration);
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
