import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Spin, Tabs } from "antd";
import { BanditView } from "../BanditView";
import { rollPan } from "../../../api/generated/endpoints/pans/pans";
import { createRating } from "../../../api/generated/endpoints/ratings/ratings";
import type { PanDto } from "../../../api/generated/model";
import { useListIngredients } from "../../../api/generated/endpoints/ingredients/ingredients";
import { useListPreparationTypes } from "../../../api/generated/endpoints/preparation-type/preparation-type";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { IngredientType } from "../../../api/generated/model";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../AppSlice";
import { useIngredientStore, getLocalStorageNumber } from "./ingredientStore";
import { GenerationAnimation } from "../animations/GenerationAnimation";
import { applyRollOutcome } from "../applyRollOutcome";
// Import CSS module with type assertion
import styles from "./GenerateView.module.css";
import { PanResultModal } from "../PanResultModal";
import { LegacyView } from "../LegacyView";
import { getTotalIngredientTypeCount } from "./generateViewUtils";

// Type assertion for CSS module classes
const typedStyles = styles as {
  loadingContainer: string;
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
  const [isBanditResult, setIsBanditResult] = useState(false);
  const sessionKey = session?.key || "";

  // Use SWR hooks for data fetching
  const swr = { enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true };
  const { data: ingredients = [] } = useListIngredients({ session_key: sessionKey }, { swr });
  const { data: prepTypes = [] } = useListPreparationTypes({ session_key: sessionKey }, { swr });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeds the counts once on mount; later changes go through the store
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

  // State for generated pan and UI
  const [generated, setGenerated] = useState<PanDto | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [animationFading, setAnimationFading] = useState(false);
  const [apiComplete, setApiComplete] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(3000); // Default duration
  const [hasLeveledUp, setHasLeveledUp] = useState(false);
  const [newLevelId, setNewLevelId] = useState<number | undefined>(undefined);

  // Refs for animation and API state
  const animationStartTimeRef = useRef<number | null>(null);
  const apiCompleteRef = useRef<boolean>(false);
  const animationCompleteRef = useRef<boolean>(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get available ingredients for animation
  const availableIngredients = ingredients.filter(
    (i) => i.available && i.applicable !== false,
  );

  function closeModal() {
    setShowResultModal(false);
    setShowAnimation(false);
    setGenerated(null);
    setIsBanditResult(false);
    apiCompleteRef.current = false;
    animationCompleteRef.current = false;
    setApiComplete(false);
    setAnimationComplete(false);
    setAnimationFading(false);
    animationStartTimeRef.current = null;
    setHasLeveledUp(false);
    setNewLevelId(undefined);
  }

  function onRating(rating: number) {
    if (generated && sessionKey) {
      createRating({ pan_id: generated.id, rating })
        .then(() => {
          // Rating successfully submitted
        })
        .catch((error) => {
          console.error("Failed to submit rating:", error);
        });
    }
  }

  function onGenerateClicked() {
    // If rolling preparation type, randomly select one
    let preparationTypeId: number | undefined = undefined;
    if (rollPreparationType && prepTypes.length > 0) {
      const randomIndex = Math.floor(Math.random() * prepTypes.length);
      preparationTypeId = prepTypes[randomIndex].id;
    }

    handleGenerate(numFill, numSauce, preparationTypeId, rollCheese);
  }

  async function handleGenerate(
    numFill: number,
    numSauce: number,
    preparationTypeId?: number,
    rollCheese?: boolean,
  ) {
    if (!sessionKey) return;

    // Reset state
    apiCompleteRef.current = false;
    animationCompleteRef.current = false;
    setApiComplete(false);
    setAnimationComplete(false);
    setAnimationFading(false);
    setGenerated(null);
    setIsBanditResult(false);
    setShowResultModal(false);
    setShowAnimation(false);

    // Start animation
    setShowAnimation(true);
    setWaiting(true);
    animationStartTimeRef.current = Date.now();
    localStorage.setItem("numFill", String(numFill));
    localStorage.setItem("numSauce", String(numSauce));

    // Update counts in the store
    updateCount("fill", numFill);
    updateCount("sauce", numSauce);

    // Start animation timer - will be updated when animation reports its duration
    animationTimerRef.current = setTimeout(() => {
      animationCompleteRef.current = true;
      setAnimationComplete(true);
    }, animationDuration);

    try {
      const outcome = await rollPan(
        {
          num_fill: numFill,
          num_sauce: numSauce,
          ...(preparationTypeId ? { preparation_type_id: preparationTypeId } : {}),
          ...(rollCheese !== undefined ? { roll_cheese: rollCheese } : {}),
        },
        { session_key: sessionKey },
      );
      setGenerated(outcome.pan);
      apiCompleteRef.current = true;
      setApiComplete(true);

      // Track level-up for profile picture generation
      const levelUp = applyRollOutcome(outcome, sessionKey);
      if (levelUp.leveledUp) {
        setHasLeveledUp(true);
        setNewLevelId(levelUp.newLevelId);
      }
    } catch (error) {
      console.error("Failed to generate pan:", error);
      apiCompleteRef.current = true;
      setApiComplete(true);
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      setWaiting(false);
      setShowAnimation(false);
    }
  }

  async function handleBanditGenerate(pan: PanDto): Promise<void> {
    // For bandit mode, the pan is already generated by the API
    // The result is shown in the bandit modal itself, not a separate modal
    if (!sessionKey) return;

    // Just track that generation is complete (for any background processing)
    apiCompleteRef.current = true;
    animationCompleteRef.current = true;
    setApiComplete(true);
    setAnimationComplete(true);
  }

  function handleBanditRating(rating: number, panId: number) {
    // Handle rating for bandit-generated pan
    if (!sessionKey) return;
    createRating({ pan_id: panId, rating })
      .then(() => {
        // Rating successfully submitted
      })
      .catch((error) => {
        console.error("Failed to rate pan:", error);
      });
  }

  // Effect to check when both API and animation are complete
  useEffect(() => {
    if (apiComplete && animationComplete && generated && !showResultModal) {
      // Show modal immediately, but keep animation visible for 250ms more
      setWaiting(false);
      setShowResultModal(true);
      setAnimationFading(true);

      // Hide animation after 250ms fade-out
      const fadeTimer = setTimeout(() => {
        setShowAnimation(false);
        setAnimationFading(false);
      }, 250);

      return () => clearTimeout(fadeTimer);
    }
  }, [apiComplete, animationComplete, generated, showResultModal]);

  // Effect to store generated ingredients in the ingredient store
  useEffect(() => {
    if (generated && showResultModal && !isBanditResult) {
      const fillIngredients = generated.ingredients.filter(
        (i) => i.type === IngredientType.FILL,
      );
      const sauceIngredients = generated.ingredients.filter(
        (i) => i.type === IngredientType.SAUCE,
      );
      updateCount("fill", fillIngredients.length);
      updateCount("sauce", sauceIngredients.length);
    }
  }, [generated, showResultModal, isBanditResult, updateCount]);

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
      {showAnimation && (
        <GenerationAnimation
          ingredients={availableIngredients}
          fading={animationFading}
          onDurationChange={(duration) => {
            setAnimationDuration(duration);
            // Update the timer if animation hasn't completed yet
            if (!animationCompleteRef.current && animationTimerRef.current) {
              clearTimeout(animationTimerRef.current);
              animationTimerRef.current = setTimeout(() => {
                animationCompleteRef.current = true;
                setAnimationComplete(true);
              }, duration);
            }
          }}
        />
      )}

      <PanResultModal
        open={showResultModal}
        pan={generated}
        isBanditResult={isBanditResult}
        rollCheese={rollCheese}
        onClose={closeModal}
        onRating={onRating}
        hasLeveledUp={hasLeveledUp}
        newLevelId={newLevelId}
      />

      {waiting && !showAnimation && (
        <div className={typedStyles.loadingContainer}>
          <Spin size="large" />
        </div>
      )}

      {!waiting && !showResultModal && (
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
                    onGenerate={handleBanditGenerate}
                    onRating={handleBanditRating}
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
