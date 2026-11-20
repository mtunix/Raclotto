import { useState } from "react";
import { Tabs } from "antd";
import { BanditView } from "../BanditView";
import { rollPan } from "../../../api/generated/endpoints/pans/pans";
import { useListIngredients } from "../../../api/generated/endpoints/ingredients/ingredients";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../AppSlice";
import { GenerationAnimation } from "../animations/GenerationAnimation";
import { LevelUpPictureModal } from "../LevelUpPictureModal";
import { useRollSession } from "../rollSession";
import styles from "./GenerateView.module.css";
import { PanResultModal } from "../PanResultModal";
import { ClassicRollView } from "../ClassicRollView";
import { IngredientOfTheHourCard } from "../../../shared/IngredientOfTheHour/IngredientOfTheHourCard";
import { useClassicRollCounts } from "./useClassicRollCounts";
import { useRollAnimation } from "./useRollAnimation";

export function GenerateView() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const sessionKey = session?.key || "";
  const [rollPreparationType, setRollPreparationType] = useState(false);
  const [rollCheese, setRollCheese] = useState(false);

  const swr = { enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true };
  const { data: ingredients = [] } = useListIngredients({ session_key: sessionKey }, { swr });
  const counts = useClassicRollCounts(ingredients);

  const panRoll = useRollSession(sessionKey);
  const { state } = panRoll;
  const result = state.phase === "result" ? state : null;
  const animation = useRollAnimation(panRoll);
  const availableIngredients = ingredients.filter((i) => i.available && i.applicable !== false);

  function onRating(rating: number) {
    panRoll.rate(rating).catch((error) => {
      console.error("Failed to submit rating:", error);
    });
  }

  function onGenerateClicked() {
    if (!sessionKey) return;
    animation.start();
    panRoll
      .roll(
        () =>
          rollPan(
            {
              num_fill: counts.fill.count,
              num_sauce: counts.sauce.count,
              ...(rollPreparationType ? { roll_prep_type: true } : {}),
              roll_cheese: rollCheese,
            },
            { session_key: sessionKey },
          ),
        { animated: true },
      )
      .then(counts.follow)
      .catch((error) => {
        console.error("Failed to generate pan:", error);
        animation.cancel();
      });
  }

  return (
    <>
      {animation.visible && (
        <GenerationAnimation
          ingredients={availableIngredients}
          fading={animation.fading}
          onDurationChange={animation.onDurationChange}
        />
      )}

      <PanResultModal
        open={result !== null}
        pan={result?.pan ?? null}
        rollCheese={rollCheese}
        onClose={panRoll.close}
        onRating={onRating}
        hasLeveledUp={result?.leveledUp}
      />

      <LevelUpPictureModal
        open={state.phase === "picture"}
        levelId={state.phase === "picture" ? state.levelUpId : undefined}
        onClose={panRoll.pictureClosed}
      />

      {(state.phase === "idle" || state.phase === "picture") && (
        <div className={styles.paddingVertical8}>
          <IngredientOfTheHourCard sessionKey={sessionKey} optIn />
          <Tabs
            defaultActiveKey="classic"
            items={[
              {
                key: "classic",
                label: <span className={styles.tabLabel}>{t("generate.classicMode")}</span>,
                children: (
                  <ClassicRollView
                    fill={counts.fill}
                    sauce={counts.sauce}
                    canGenerate={counts.canRoll}
                    onGenerateClicked={onGenerateClicked}
                    rollPreparationType={rollPreparationType}
                    setRollPreparationType={setRollPreparationType}
                    rollCheese={rollCheese}
                    setRollCheese={setRollCheese}
                  />
                ),
              },
              {
                key: "bandit",
                label: <span className={styles.tabLabel}>{t("generate.banditMode")}</span>,
                children: (
                  <BanditView
                    ingredients={ingredients}
                    sessionKey={sessionKey}
                    rollPreparationType={rollPreparationType}
                    onRollPreparationTypeChange={setRollPreparationType}
                    rollCheese={rollCheese}
                    onRollCheeseChange={setRollCheese}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </>
  );
}
