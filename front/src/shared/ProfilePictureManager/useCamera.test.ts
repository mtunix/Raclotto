import { act, renderHook, screen } from "@testing-library/react";
import { message } from "antd";
import { useCamera } from "./useCamera";

function installCamera(getUserMedia: () => Promise<unknown>) {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
}

function fakeStream() {
  const track = { stop: vi.fn() };
  return { track, stream: { getTracks: () => [track] } };
}

afterEach(() => {
  act(() => message.destroy());
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
});

it("streams until stopped", async () => {
  const { track, stream } = fakeStream();
  installCamera(() => Promise.resolve(stream));
  const { result } = renderHook(() => useCamera());

  await act(() => result.current.start());
  expect(result.current.active).toBe(true);

  act(() => result.current.stop());
  expect(result.current.active).toBe(false);
  expect(track.stop).toHaveBeenCalledTimes(1);
});

it("stops the stream on unmount", async () => {
  const { track, stream } = fakeStream();
  installCamera(() => Promise.resolve(stream));
  const { result, unmount } = renderHook(() => useCamera());
  await act(() => result.current.start());

  unmount();

  expect(track.stop).toHaveBeenCalledTimes(1);
});

it("captures nothing before the video has a frame", async () => {
  const { stream } = fakeStream();
  installCamera(() => Promise.resolve(stream));
  const { result } = renderHook(() => useCamera());
  await act(() => result.current.start());

  expect(result.current.capture()).toBeNull();
  expect(result.current.active).toBe(true);
});

it("says why the camera could not start", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  installCamera(() => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })));
  const { result } = renderHook(() => useCamera());

  await act(() => result.current.start());

  expect(result.current.active).toBe(false);
  expect(await screen.findByText("auth.cameraPermissionDenied")).toBeInTheDocument();
});
