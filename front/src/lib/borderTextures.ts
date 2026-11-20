import type { UserSummaryDtoBorderTexture } from "../api/generated/model";
import bread from "../assets/textures/bread.webp";
import cheese from "../assets/textures/cheese.webp";
import herbs01 from "../assets/textures/herbs-01.webp";
import herbs02 from "../assets/textures/herbs-02.webp";
import sauce01 from "../assets/textures/sauce-01.webp";
import sauce02 from "../assets/textures/sauce-02.webp";

const TEXTURES: Record<NonNullable<UserSummaryDtoBorderTexture>, string> = {
  cheese,
  bread,
  "sauce-01": sauce01,
  "sauce-02": sauce02,
  "herbs-01": herbs01,
  "herbs-02": herbs02,
};

/** The image of the border texture a user picked, if any. */
export function textureUrl(textureName: UserSummaryDtoBorderTexture | undefined): string | undefined {
  return textureName ? TEXTURES[textureName] : undefined;
}
