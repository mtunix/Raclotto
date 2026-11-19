const MAX_PICTURE_BYTES = 2 * 1024 * 1024;

/** The translation key saying why `file` can't be a profile picture, or null when it can. */
export function pictureFileProblem(file: Pick<File, "type" | "size">): string | null {
  if (!file.type.startsWith("image/")) return "auth.invalidImageType";
  if (file.size > MAX_PICTURE_BYTES) return "auth.imageTooLarge";
  return null;
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The picture could not be read as a data URL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("The picture could not be read"));
    reader.readAsDataURL(file);
  });
}

/** The letter an avatar shows for a user without a picture. */
export const initialOf = (name?: string) => name?.charAt(0).toUpperCase() || "U";
