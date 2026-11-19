import { initialOf, pictureFileProblem, readAsDataUrl } from "./pictureFile";

describe("pictureFileProblem", () => {
  it("accepts an image up to 2 MB", () => {
    expect(pictureFileProblem({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
  });

  it("refuses anything but an image", () => {
    expect(pictureFileProblem({ type: "application/pdf", size: 10 })).toBe("auth.invalidImageType");
  });

  it("refuses an image over 2 MB", () => {
    expect(pictureFileProblem({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toBe("auth.imageTooLarge");
  });
});

it("reads a file as a data URL", async () => {
  await expect(readAsDataUrl(new File(["hi"], "a.png", { type: "image/png" }))).resolves.toBe("data:image/png;base64,aGk=");
});

it("an avatar without a picture shows the name's initial, or U without a name", () => {
  expect([initialOf("ada"), initialOf(""), initialOf(undefined)]).toEqual(["A", "U", "U"]);
});
