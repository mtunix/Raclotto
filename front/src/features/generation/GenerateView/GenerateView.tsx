import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Button,
  Row,
  Col,
  Form,
  Rate,
  Spin,
  Card,
  Typography,
  Divider,
  Checkbox,
  Tabs,
  Modal,
  InputNumber,
  Input,
  Slider,
} from "antd";
import { BanditView } from "../BanditView";
import { Api } from "../../../lib/api";
import {
  useIngredients,
  usePrepTypes,
  useAvailableIngredientCounts,
} from "../../../lib/api/swrHooks";
import { IngredientType } from "../../../model/ingredient";
import { Pan } from "../../../model/pan";
import { Util } from "../../../lib/util";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../AppSlice";
import { useAuthStore } from "../../../AuthSlice";
import { useIngredientStore, getLocalStorageNumber } from "./ingredientStore";
import { GenerationAnimation } from "../animations/GenerationAnimation";
// Import CSS module with type assertion
import styles from "./GenerateView.module.css";

// Type assertion for CSS module classes
const typedStyles = styles as {
  loadingContainer: string;
  paddingVertical8: string;
  tabLabel: string;
  [key: string]: string;
};
import { PanResultModal } from "../PanResultModal";
import { IngredientCountControl } from "../IngredientCountControl";
import { LegacyView } from "../LegacyView";
import {
  getRandomEmoji,
  getIngredientTypeCount,
  getTotalIngredientTypeCount,
  SAUCE_ICONS,
  INGREDIENT_ICONS,
} from "./generateViewUtils";

const { Title, Text } = Typography;

export function GenerateView() {
  // Define state and hooks at the top
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const currentUser = useAuthStore((state) => state.user);
  const showXpNotification = useAppStore((state) => state.showXpNotification);
  const setUser = useAuthStore((state) => state.setUser);

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
  const { data: ingredients = [] } = useIngredients(sessionKey);
  const { data: prepTypes = [] } = usePrepTypes(sessionKey);

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
  }, []); // Empty dependency array to run only once on mount

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
  const [generated, setGenerated] = useState<Pan | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [animationFading, setAnimationFading] = useState(false);
  const [apiComplete, setApiComplete] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(3000); // Default duration
  const [visibleIngredients, setVisibleIngredients] = useState<Set<number>>(
    new Set(),
  );

  // Refs for animation and API state
  const animationStartTimeRef = useRef<number | null>(null);
  const apiCompleteRef = useRef<boolean>(false);
  const animationCompleteRef = useRef<boolean>(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationTriggerRef = useRef<number[]>([]);

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
    setVisibleIngredients(new Set());
    animationTriggerRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    animationTriggerRef.current = [];
  }

  function onRating(rating: number) {
    if (generated && sessionKey) {
      Api.rate(sessionKey, generated.id, rating)
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
      // Store old XP before generation
      const oldXP = currentUser?.experience_points || 0;
      const oldLevelId = currentUser?.level?.id;

      const data = await Api.generate(
        sessionKey,
        numFill,
        numSauce,
        preparationTypeId,
        rollCheese,
      );
      if (data && "generated" in data && data.generated) {
        setGenerated(data.generated);
        apiCompleteRef.current = true;
        setApiComplete(true);

        // Extract achievements from response
        const achievements = data.achievements || [];

        // Fetch updated user profile to get new XP
        if (currentUser?.id) {
          try {
            const updatedProfile = await Api.getUserProfile(currentUser.id);
            const newXP = updatedProfile.experience_points || 0;
            const newLevel = updatedProfile.level;
            const nextLevel = updatedProfile.next_level || null;
            const levelUp =
              oldLevelId !== undefined &&
              newLevel?.id !== oldLevelId &&
              newLevel?.id !== undefined;

            // Update auth store with new user data
            if (currentUser) {
              setUser({
                ...currentUser,
                experience_points: newXP,
                level: newLevel,
                next_level: nextLevel,
              });
            }

            // Show XP notification if XP increased
            if (newXP > oldXP && newLevel) {
              const xpGained = newXP - oldXP;
              showXpNotification(
                xpGained,
                oldXP,
                newXP,
                newLevel,
                nextLevel,
                levelUp,
                achievements,
              );
            }
          } catch (profileError) {
            console.error(
              "Failed to fetch updated user profile:",
              profileError,
            );
            // Continue even if profile fetch fails
          }
        }
      } else {
        // If no data, still mark as complete
        apiCompleteRef.current = true;
        setApiComplete(true);
        if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
        setWaiting(false);
        setShowAnimation(false);
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

  async function handleBanditGenerate(pan: Pan): Promise<void> {
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
    Api.rate(sessionKey, panId, rating)
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

  // Effect to trigger slot machine animations when modal opens
  useEffect(() => {
    if (showResultModal && generated && !isBanditResult) {
      // Reset visible ingredients
      setVisibleIngredients(new Set());

      // Get all ingredients and sauces
      const fillIngredients = generated.ingredients.filter(
        (i) => i.type === IngredientType.FILL,
      );
      const sauceIngredients = generated.ingredients.filter(
        (i) => i.type === IngredientType.SAUCE,
      );
      const allItems = [...fillIngredients, ...sauceIngredients];

      // Animate items one by one with staggered delays
      const timeoutIds: number[] = [];
      allItems.forEach((item, index) => {
        const timeoutId = window.setTimeout(() => {
          setVisibleIngredients((prev) => {
            const newSet = new Set(prev);
            newSet.add(item.id);
            return newSet;
          });
        }, index * 150); // 150ms delay between each item
        timeoutIds.push(timeoutId);
      });
      animationTriggerRef.current = timeoutIds;

      return () => {
        timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      };
    }
  }, [showResultModal, generated, isBanditResult]);

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
                    prepTypes={prepTypes}
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
