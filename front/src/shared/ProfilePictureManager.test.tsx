import { useState } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import { pictureHistory } from "../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../lib/api/fakeTransport";
import { setTransport, type Transport } from "../lib/api/transport";
import { renderRoute } from "../testUtils";
import { ProfilePictureManager } from "./ProfilePictureManager";

const [current, older] = pictureHistory;
const historyPath = (userId: number) => `/images/profile-picture-history/${userId}`;
const historyFetches = (userId: number) =>
  fake.requests.filter((r) => r.method === "GET" && r.path === historyPath(userId)).length;

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport().on("GET", historyPath(1), pictureHistory);
  previous = setTransport(fake);
});

afterEach(() => {
  setTransport(previous);
  act(() => message.destroy());
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
});

function fakeCamera() {
  const track = { stop: vi.fn() };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => Promise.resolve({ getTracks: () => [track] }) },
  });
  return track;
}

function pickFile(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  fireEvent.change(input, { target: { files: [file] } });
}

const png = () => new File(["png"], "me.png", { type: "image/png" });

async function openDialog() {
  fireEvent.click(await screen.findByText("profile.clickToChange"));
  return screen.findByRole("dialog");
}

describe("on the user's own profile", () => {
  it("loads the picture history only once the dialog opens", async () => {
    renderRoute(<ProfilePictureManager currentPicture={current.profile_picture} onPictureChange={vi.fn()} userId={1} />);
    await screen.findByText("profile.clickToChange");
    expect(historyFetches(1)).toBe(0);

    const dialog = await openDialog();

    expect(within(dialog).getByText("profile.changeProfilePicture")).toBeInTheDocument();
    fireEvent.click(await within(dialog).findByText("profile.pictureHistory (2)"));
    expect(await within(dialog).findByText(/image\.generationCandidate/)).toBeInTheDocument();
    expect(within(dialog).getByText("image.candidateSelected").closest("button")).toBeDisabled();
    expect(historyFetches(1)).toBe(1);
  });

  it("saves only a changed picture, then closes", async () => {
    const onPictureChange = vi.fn();
    renderRoute(<ProfilePictureManager currentPicture={current.profile_picture} onPictureChange={onPictureChange} userId={1} />);
    const dialog = await openDialog();
    const save = within(dialog).getByText("common.save").closest("button");
    expect(save).toBeDisabled();

    fireEvent.click(within(dialog).getByText("auth.removePhoto"));
    expect(save).toBeEnabled();
    fireEvent.click(within(dialog).getByText("common.save"));

    await waitFor(() => expect(onPictureChange).toHaveBeenCalledWith(null));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("discards the edit on cancel", async () => {
    const onPictureChange = vi.fn();
    renderRoute(<ProfilePictureManager currentPicture={current.profile_picture} onPictureChange={onPictureChange} userId={1} />);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByText("auth.removePhoto"));
    fireEvent.click(within(dialog).getByText("auth.cancel"));

    const reopened = await openDialog();

    expect(within(reopened).getByText("auth.removePhoto")).toBeInTheDocument();
    expect(onPictureChange).not.toHaveBeenCalled();
  });

  it("takes a picked image file as the new picture", async () => {
    const onPictureChange = vi.fn();
    renderRoute(<ProfilePictureManager currentPicture={null} onPictureChange={onPictureChange} userId={1} userName="ada" />);
    const dialog = await openDialog();
    expect(within(dialog).getByText("A")).toBeInTheDocument();

    pickFile(png());
    await within(dialog).findByText("auth.removePhoto");
    fireEvent.click(within(dialog).getByText("common.save"));

    await waitFor(() => expect(onPictureChange).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/)));
  });

  it("refuses a file that is no image", async () => {
    renderRoute(<ProfilePictureManager currentPicture={null} onPictureChange={vi.fn()} userId={1} />);
    const dialog = await openDialog();

    pickFile(new File(["text"], "notes.txt", { type: "text/plain" }));

    expect(await screen.findByText("auth.invalidImageType")).toBeInTheDocument();
    expect(within(dialog).queryByText("auth.removePhoto")).not.toBeInTheDocument();
  });

  it("makes an older picture the generation candidate", async () => {
    let stored = pictureHistory;
    fake
      .on("GET", historyPath(7), () => stored)
      .on("POST", `/images/set-candidate-picture/${older.id}`, () => {
        stored = [{ ...current, is_candidate: false }, { ...older, is_candidate: true }];
        return undefined;
      });
    renderRoute(<ProfilePictureManager currentPicture={current.profile_picture} onPictureChange={vi.fn()} userId={7} />, {
      sharedCache: true,
    });
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByText("profile.pictureHistory (2)"));

    fireEvent.click(await within(dialog).findByText("image.setAsCandidate"));

    expect(await screen.findByText("image.candidatePictureSet")).toBeInTheDocument();
    expect(fake.last("POST", `/images/set-candidate-picture/${older.id}`)).toBeDefined();
    expect(historyFetches(7)).toBe(2);
    await waitFor(() => expect(within(dialog).getAllByText("image.candidateSelected")).toHaveLength(1));
    expect(within(dialog).getByText("image.setAsCandidate")).toBeInTheDocument();
  });

  it("stops the camera when the dialog closes", async () => {
    const track = fakeCamera();
    renderRoute(<ProfilePictureManager currentPicture={null} onPictureChange={vi.fn()} userId={1} />);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByText("auth.takePhoto"));
    await within(dialog).findByText("auth.capture");

    fireEvent.click(within(dialog).getAllByText("auth.cancel")[1]);

    expect(track.stop).toHaveBeenCalled();
  });

  it("says so when the browser has no camera", async () => {
    renderRoute(<ProfilePictureManager currentPicture={null} onPictureChange={vi.fn()} userId={1} />);
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByText("auth.takePhoto"));

    expect(await screen.findByText("auth.cameraNotSupported")).toBeInTheDocument();
    expect(within(dialog).getByText("auth.takePhoto")).toBeInTheDocument();
  });

  it("opens nothing while disabled", async () => {
    const { container } = renderRoute(
      <ProfilePictureManager currentPicture={null} onPictureChange={vi.fn()} userId={1} userName="ada" disabled />,
    );

    fireEvent.click(await within(container).findByText("A"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("profile.clickToChange")).not.toBeInTheDocument();
  });
});

describe("on someone else's profile", () => {
  it("shows their picture and history read-only", async () => {
    renderRoute(
      <ProfilePictureManager currentPicture={current.profile_picture} onPictureChange={vi.fn()} userId={1} isOwnProfile={false} />,
    );
    const dialog = await openDialog();

    expect(within(dialog).getByText("profile.viewProfilePicture")).toBeInTheDocument();
    fireEvent.click(await within(dialog).findByText("profile.pictureHistory (2)"));
    expect(await within(dialog).findByText("Level: level.kaeseKnauserer (ID: 2)")).toBeInTheDocument();
    expect(within(dialog).queryByText("image.setAsCandidate")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/image\.generationCandidate/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("auth.removePhoto")).not.toBeInTheDocument();
  });

  it("says when they have no history yet", async () => {
    fake.on("GET", historyPath(1), []);
    renderRoute(<ProfilePictureManager currentPicture={null} onPictureChange={vi.fn()} userId={1} isOwnProfile={false} />);
    const dialog = await openDialog();

    expect(await within(dialog).findByText("profile.noHistoryYet")).toBeInTheDocument();
  });
});

describe("in direct mode", () => {
  function Registration({ onChange }: { onChange: (picture: string | null) => void }) {
    const [picture, setPicture] = useState<string | null>(null);
    const change = (next: string | null) => {
      setPicture(next);
      onChange(next);
    };
    return <ProfilePictureManager currentPicture={picture} onPictureChange={change} showLabel={false} directMode hideAvatar />;
  }

  it("reports every pick and removal at once, without a dialog or requests", async () => {
    const onChange = vi.fn();
    renderRoute(<Registration onChange={onChange} />);

    pickFile(png());
    fireEvent.click(await screen.findByText("auth.removePhoto"));

    expect(onChange.mock.calls).toEqual([[expect.stringMatching(/^data:image\/png;base64,/)], [null]]);
    expect(await screen.findByText("auth.selectImage")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fake.requests).toEqual([]);
  });
});
