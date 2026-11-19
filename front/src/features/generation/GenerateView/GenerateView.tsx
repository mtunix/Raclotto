import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Tabs } from "antd";
import { BanditView } from "../BanditView";
import { rollPan } from "../../../api/generated/endpoints/pans/pans";
import { useListIngredients } from "../../../api/generated/endpoints/ingredients/ingredients";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { IngredientType } from "../../../api/generated/model";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../AppSlice";
import { useIngredientStore, getLocalStorageNumber } from "./ingredientStore";
import { GenerationAnimation } from "../animations/GenerationAnimation";
import { LevelUpPictureModal } from "../LevelUpPictureModal";
import { useRollSession } from "../rollSession";
// Import CSS module with type assertion
import styles from "./GenerateView.module.css";
import { PanResultModal } from "../PanResultModal";
import { LegacyView } from "../LegacyView";
import { getTotalIngredientTypeCount } from "./generateViewUtils";

// Type assertion for CSS module classes
const typedStyles = styles as {
  paddingVertical8: string;
  tabLabel: string;
  [key: string]: string;
};

export function GenerateView() {
  // Define state and hooks at the top
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);

  // Ingredient store hooks - only managing the entered counts
  const {
    ingredientCount: storedFillCount,
    sauceCount: storedSauceCount,
    updateCount,
    increment,
    decrement,
  } = useIngredientStore();

  // Define count variables at the top of the component
  const numFill = storedFillCount;
  const numSauce = storedSauceCount;

  const [rollPreparationType, setRollPreparationType] = useState(false);
  const [rollCheese, setRollCheese] = useState(false);
  const sessionKey = session?.key || "";

  // Use SWR hooks for data fetching
  const swr = { enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true };
  const { data: ingredients = [] } = useListIngredients({ session_key: sessionKey }, { swr });

  // Calculate total counts from ingredients (all ingredients regardless of availability)
  const totalFillCount = getTotalIngredientTypeCount(
    ingredients,
    IngredientType.FILL,
  );
  const totalSauceCount = getTotalIngredientTypeCount(
    ingredients,
    IngredientType.SAUCE,
  );

  // Initialize counts from store or localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize fill count
    const initialFill = storedFillCount || getLocalStorageNumber("numFill");
    if (initialFill > 0) {
      updateCount("fill", initialFill);
    }

    // Initialize sauce count
    const initialSauce = storedSauceCount || getLocalStorageNumber("numSauce");
    if (initialSauce > 0) {
      updateCount("sauce", initialSauce);
    }
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- seeds the counts once on mount; later changes go through the store
  }, []);

  // Check if we can generate based on counts and available ingredients
  const canGenerate = useCallback((): boolean => {
    // Just check if we have at least one ingredient selected
    // The actual availability check is now handled in the child components
    return numFill > 0 || numSauce > 0;
  }, [numFill, numSauce]);

  // Memoize the canGenerate result to prevent unnecessary re-renders
  const canGenerateResult = useMemo(() => canGenerate(), [canGenerate]);

  // Wrapper functions for count management
  const handleFillCountChange = (newCount: number) => {
    updateCount("fill", newCount, totalFillCount);
  };

  const handleSauceCountChange = (newCount: number) => {
    updateCount("sauce", newCount, totalSauceCount);
  };

  const handleFillIncrement = () => {
    increment("fill", totalFillCount);
  };

  const handleFillDecrement = () => {
    decrement("fill");
  };

  const handleSauceIncrement = () => {
    increment("sauce", totalSauceCount);
  };

  const handleSauceDecrement = () => {
    decrement("sauce");
  };

  // These functions are now defined above with the other handler functions

  const panRoll = useRollSession(sessionKey);
  const { state } = panRoll;
  const result = state.phase === "result" ? state : null;
  const rolling = state.phase === "rolling" || state.phase === "revealing";
  const [animationDuration, setAnimationDuration] = useState(3000);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The animation stays up for a 250 ms fade-out once the result is shown.
  const [fading, setFading] = useState(false);
  const [previousPhase, setPreviousPhase] = useState(state.phase);
  if (previousPhase !== state.phase) {
    setPreviousPhase(state.phase);
    setFading(state.phase === "result" && (previousPhase === "rolling" || previousPhase === "revealing"));
  }
  useEffect(() => {
    if (!fading) return;
    const fadeTimer = setTimeout(() => setFading(false), 250);
    return () => clearTimeout(fadeTimer);
  }, [fading]);

  const { animationDone } = panRoll;
  const startAnimationTimer = useCallback((duration: number) => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    animationTimerRef.current = setTimeout(animationDone, duration);
  }, [animationDone]);
  useEffect(() => () => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
  }, []);

  // Get available ingredients for animation
  const availableIngredients = ingredients.filter(
    (i) => i.available && i.applicable !== false,
  );

  function onRating(rating: number) {
    panRoll.rate(rating).catch((error) => {
      console.error("Failed to submit rating:", error);
    });
  }

  function onGenerateClicked() {
    if (!sessionKey) return;
    localStorage.setItem("numFill", String(numFill));
    localStorage.setItem("numSauce", String(numSauce));
    updateCount("fill", numFill);
    updateCount("sauce", numSauce);

    startAnimationTimer(animationDuration);
    panRoll
      .roll(
        () =>
          rollPan(
            {
              num_fill: numFill,
              num_sauce: numSauce,
              ...(rollPreparationType ? { roll_prep_type: true } : {}),
              roll_cheese: rollCheese,
            },
            { session_key: sessionKey },
          ),
        { animated: true },
      )
      .catch((error) => {
        console.error("Failed to generate pan:", error);
        if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      });
  }

  // The counts follow what the pan actually got.
  const resultPan = result?.pan;
  useEffect(() => {
    if (resultPan) {
      updateCount("fill", resultPan.ingredients.filter((i) => i.type === IngredientType.FILL).length);
      updateCount("sauce", resultPan.ingredients.filter((i) => i.type === IngredientType.SAUCE).length);
    }
  }, [resultPan, updateCount]);

  // CheeseSlider component (moved to separate file)
  // CheeseSlider is now imported from CheeseSlider.tsx

  const handleUpdateFill = (value: number) => {
    handleFillCountChange(value);
  };

  const handleUpdateSauce = (value: number) => {
    handleSauceCountChange(value);
  };

  return (
    <>
      {(rolling || fading) && (
        <GenerationAnimation
          ingredients={availableIngredients}
          fading={fading}
          onDurationChange={(duration) => {
            setAnimationDuration(duration);
            if (state.phase === "rolling" ? !state.animationDone : state.phase === "revealing") {
              startAnimationTimer(duration);
            }
          }}
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
        <div className={typedStyles.paddingVertical8}>
          <Tabs
            defaultActiveKey="legacy"
            items={[
              {
                key: "legacy",
                label: (
                  <span className={typedStyles.tabLabel}>
                    {t("generate.legacyMode") || "Legacy"}
                  </span>
                ),
                children: (
                  <LegacyView
                    t={t}
                    numFill={numFill}
                    numSauce={numSauce}
                    totalFillCount={totalFillCount}
                    totalSauceCount={totalSauceCount}
                    canGenerate={canGenerateResult}
                    onGenerateClicked={onGenerateClicked}
                    rollPreparationType={rollPreparationType}
                    setRollPreparationType={setRollPreparationType}
                    rollCheese={rollCheese}
                    setRollCheese={setRollCheese}
                    onUpdateFill={handleUpdateFill}
                    onUpdateSauce={handleUpdateSauce}
                    onFillIncrement={handleFillIncrement}
                    onFillDecrement={handleFillDecrement}
                    onSauceIncrement={handleSauceIncrement}
                    onSauceDecrement={handleSauceDecrement}
                    onFillChange={handleFillCountChange}
                    onSauceChange={handleSauceCountChange}
                  />
                ),
              },
              {
                key: "bandit",
                label: (
                  <span className={typedStyles.tabLabel}>
                    {t("generate.banditMode") || "Bandit"}
                  </span>
                ),
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
