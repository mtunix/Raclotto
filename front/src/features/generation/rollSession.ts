import { useReducer, useRef } from "react";
import type { PanDto, RollOutcomeDto } from "../../api/generated/model";
import { useImageGeneration } from "../../shared/imageGeneration";
import { ratePan } from "../rating/ratePan";
import { applyRollOutcome, type LevelUp } from "./applyRollOutcome";

/**
 * A roll from the click to the closed result: the request, its outcome applied, the animation
 * the view plays meanwhile, rating the result, and the level-up picture offered once it closes,
 * if the server can generate one.
 *
 *   idle → rolling → revealing (outcome in, animation playing) → result → picture → idle
 *
 * A roll that needs no animation goes straight from rolling to result. Rolling again from a
 * result keeps a level-up still to offer; a failed roll goes back to where it started.
 */
export type RollState =
  | { phase: "idle" }
  | { phase: "rolling"; animationDone: boolean; levelUpId?: number; before: Rollable }
  | { phase: "revealing"; pan: PanDto; leveledUp: boolean; levelUpId?: number }
  | { phase: "result"; pan: PanDto; leveledUp: boolean; levelUpId?: number }
  | { phase: "picture"; levelUpId: number };

type Rollable = Extract<RollState, { phase: "idle" | "result" }>;

export type RollEvent =
  | { type: "roll"; animated: boolean }
  | { type: "rolled"; pan: PanDto; levelUp: LevelUp }
  | { type: "failed" }
  | { type: "animationDone" }
  | { type: "close"; pictures: boolean }
  | { type: "pictureClosed" };

export const idle: RollState = { phase: "idle" };

export function rollSession(state: RollState, event: RollEvent): RollState {
  switch (event.type) {
    case "roll":
      if (state.phase !== "idle" && state.phase !== "result") return state;
      return {
        phase: "rolling",
        animationDone: !event.animated,
        levelUpId: state.phase === "result" ? state.levelUpId : undefined,
        before: state,
      };
    case "rolled": {
      if (state.phase !== "rolling") return state;
      const { leveledUp, newLevelId } = event.levelUp;
      const outcome = {
        pan: event.pan,
        leveledUp,
        levelUpId: leveledUp && newLevelId !== undefined ? newLevelId : state.levelUpId,
      };
      return state.animationDone ? { phase: "result", ...outcome } : { phase: "revealing", ...outcome };
    }
    case "failed":
      return state.phase === "rolling" ? state.before : state;
    case "animationDone":
      if (state.phase === "rolling") return { ...state, animationDone: true };
      if (state.phase === "revealing") return { ...state, phase: "result" };
      return state;
    case "close":
      if (state.phase !== "result") return state;
      return state.levelUpId !== undefined && event.pictures ? { phase: "picture", levelUpId: state.levelUpId } : idle;
    case "pictureClosed":
      return state.phase === "picture" ? idle : state;
  }
}

export interface RollSession {
  state: RollState;
  /** Rolls with `request`; resolves to the pan, or rejects as the request did. */
  roll: (request: () => Promise<RollOutcomeDto>, options: { animated: boolean }) => Promise<PanDto>;
  animationDone: () => void;
  /** Rates the result; resolves to the pan with its new average. */
  rate: (stars: number) => Promise<PanDto>;
  close: () => void;
  pictureClosed: () => void;
}

export function useRollSession(sessionKey: string): RollSession {
  const [state, dispatch] = useReducer(rollSession, idle);
  const pictures = useImageGeneration();
  // The same state, for `roll` and `rate`, which may run before the next render.
  const currentRef = useRef(idle);

  const send = (event: RollEvent) => {
    currentRef.current = rollSession(currentRef.current, event);
    dispatch(event);
  };

  const roll = async (request: () => Promise<RollOutcomeDto>, { animated }: { animated: boolean }) => {
    if (currentRef.current.phase !== "idle" && currentRef.current.phase !== "result") {
      throw new Error(`Cannot roll while ${currentRef.current.phase}`);
    }
    send({ type: "roll", animated });
    let outcome: RollOutcomeDto;
    try {
      outcome = await request();
    } catch (error) {
      send({ type: "failed" });
      throw error;
    }
    send({ type: "rolled", pan: outcome.pan, levelUp: applyRollOutcome(outcome, sessionKey) });
    return outcome.pan;
  };

  const rate = (stars: number) => {
    const shown = currentRef.current;
    if (shown.phase !== "result" && shown.phase !== "revealing") {
      return Promise.reject(new Error("No pan to rate"));
    }
    return ratePan(shown.pan.id, stars);
  };

  return {
    state,
    roll,
    rate,
    animationDone: () => send({ type: "animationDone" }),
    close: () => send({ type: "close", pictures }),
    pictureClosed: () => send({ type: "pictureClosed" }),
  };
}
