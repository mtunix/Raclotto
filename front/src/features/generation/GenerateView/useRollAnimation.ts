import { useEffect, useRef, useState } from "react";
import type { RollSession } from "../rollSession";

const FADE_OUT_MS = 250;

/**
 * The animation a roll plays: it ends `animationDone` once its duration has run out, and stays up
 * for a fade-out once the result is shown. The animation picks its duration after it mounts, so
 * `onDurationChange` restarts the timer of a roll still waiting for it.
 */
export function useRollAnimation({ state, animationDone }: Pick<RollSession, "state" | "animationDone">) {
  const [duration, setDuration] = useState(3000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fading, setFading] = useState(false);
  const [previousPhase, setPreviousPhase] = useState(state.phase);
  if (previousPhase !== state.phase) {
    setPreviousPhase(state.phase);
    setFading(state.phase === "result" && (previousPhase === "rolling" || previousPhase === "revealing"));
  }
  useEffect(() => {
    if (!fading) return;
    const fadeTimer = setTimeout(() => setFading(false), FADE_OUT_MS);
    return () => clearTimeout(fadeTimer);
  }, [fading]);

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const startTimer = (ms: number) => {
    cancel();
    timerRef.current = setTimeout(animationDone, ms);
  };
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const waiting = state.phase === "rolling" ? !state.animationDone : state.phase === "revealing";

  return {
    visible: state.phase === "rolling" || state.phase === "revealing" || fading,
    fading,
    /** Starts timing the animation of a roll that is just starting. */
    start: () => startTimer(duration),
    cancel,
    onDurationChange: (ms: number) => {
      setDuration(ms);
      if (waiting) startTimer(ms);
    },
  };
}
