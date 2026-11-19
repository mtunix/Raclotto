import { useState } from "react";
import type { IngredientForUserDto } from "../../api/generated/model";
import { useGetAvailableCounts } from "../../api/generated/endpoints/ingredients/ingredients";
import { LevelUpPictureModal } from "./LevelUpPictureModal";
import { BanditResultModal } from "./bandit/BanditResultModal";
import { banditLimits } from "./bandit/banditLimits";
import { ColumnCountControl } from "./bandit/ColumnCountControl";
import { RestrictionsAlert } from "./bandit/RestrictionsAlert";
import { RollOptionsCard } from "./bandit/RollOptionsCard";
import { SlotMachine } from "./bandit/SlotMachine";
import { useBanditSpin } from "./bandit/useBanditSpin";

interface BanditViewProps {
    ingredients: IngredientForUserDto[];
    sessionKey: string;
    rollPreparationType: boolean;
    onRollPreparationTypeChange: (checked: boolean) => void;
    rollCheese: boolean;
    onRollCheeseChange: (checked: boolean) => void;
}

/** A pan rolled as a slot machine: one reel per ingredient, each stopping on one of the pan's. */
export function BanditView(props: BanditViewProps) {
    const { ingredients, sessionKey, rollPreparationType, rollCheese } = props;
    const { data: counts } = useGetAvailableCounts({ session_key: sessionKey }, { swr: { enabled: !!sessionKey } });
    const { items, fills, sauces, maxColumns } = banditLimits(ingredients, counts);
    const [columns, setColumns] = useState(3);
    const bandit = useBanditSpin(sessionKey, items, { columns, rollPreparationType, rollCheese });
    const { state, spinning, result } = bandit;
    const canSpin = !spinning && items.length > 0 && columns > 0 && columns <= maxColumns;

    return (
        <div>
            <RestrictionsAlert fills={fills} sauces={sauces} />
            <ColumnCountControl value={columns} max={maxColumns} onChange={setColumns} disabled={spinning} />
            <RollOptionsCard
                rollPreparationType={rollPreparationType}
                onRollPreparationTypeChange={props.onRollPreparationTypeChange}
                rollCheese={rollCheese}
                onRollCheeseChange={props.onRollCheeseChange}
                disabled={spinning}
            />
            <SlotMachine columns={columns} canSpin={canSpin} onSpin={bandit.spin} />

            <BanditResultModal
                open={spinning || result !== null}
                spinning={spinning}
                pan={result?.pan ?? null}
                reels={bandit.reels}
                rating={bandit.rating}
                onRate={bandit.rate}
                onSpinAgain={bandit.spin}
                onClose={bandit.close}
            />

            <LevelUpPictureModal
                open={state.phase === "picture"}
                levelId={state.phase === "picture" ? state.levelUpId : undefined}
                onClose={bandit.pictureClosed}
            />
        </div>
    );
}
