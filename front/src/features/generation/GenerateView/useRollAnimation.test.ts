import { act, renderHook } from "@testing-library/react";
import { rollOutcome } from "../../../lib/api/__fixtures__/backendResponses";
import type { RollState } from "../rollSession";
import { useRollAnimation } from "./useRollAnimation";

const idle: RollState = { phase: "idle" };
const rolling: RollState = { phase: "rolling", animationDone: false, before: idle };
const revealing: RollState = { phase: "revealing", pan: rollOutcome.pan, leveledUp: false };
const result: RollState = { phase: "result", pan: rollOutcome.pan, leveledUp: false };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function render(initial: RollState) {
  const animationDone = vi.fn();
  const hook = renderHook((state: RollState) => useRollAnimation({ state, animationDone }), { initialProps: initial });
  return { ...hook, animationDone };
}

it("ends the animation once its duration has run out", () => {
  const { result: hook, animationDone } = render(idle);

  act(() => hook.current.start());
  act(() => {
    vi.advanceTimersByTime(2999);
  });
  expect(animationDone).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1);
  });

  expect(animationDone).toHaveBeenCalledTimes(1);
});

it("restarts the timer with the duration the animation picks while the roll waits for it", () => {
  const { result: hook, rerender, animationDone } = render(idle);
  act(() => hook.current.start());
  rerender(rolling);

  act(() => hook.current.onDurationChange(1000));
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(animationDone).toHaveBeenCalledTimes(1);
});

it("only remembers a duration picked while no roll waits, for the next roll", () => {
  const { result: hook, animationDone } = render(idle);

  act(() => hook.current.onDurationChange(500));
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(animationDone).not.toHaveBeenCalled();

  act(() => hook.current.start());
  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(animationDone).toHaveBeenCalledTimes(1);
});

it("stops timing a cancelled roll, and on unmount", () => {
  const { result: hook, unmount, animationDone } = render(idle);

  act(() => hook.current.start());
  act(() => hook.current.cancel());
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  act(() => hook.current.start());
  unmount();
  vi.advanceTimersByTime(5000);

  expect(animationDone).not.toHaveBeenCalled();
});

it("shows while rolling and revealing, and fades out once the result is shown", () => {
  const { result: hook, rerender } = render(idle);
  expect(hook.current.visible).toBe(false);

  rerender(rolling);
  expect(hook.current).toMatchObject({ visible: true, fading: false });
  rerender(revealing);
  expect(hook.current).toMatchObject({ visible: true, fading: false });
  rerender(result);
  expect(hook.current).toMatchObject({ visible: true, fading: true });

  act(() => {
    vi.advanceTimersByTime(250);
  });
  expect(hook.current).toMatchObject({ visible: false, fading: false });
});

it("doesn't fade in on a result that wasn't rolled just now", () => {
  const { result: hook } = render(result);

  expect(hook.current.visible).toBe(false);
});
