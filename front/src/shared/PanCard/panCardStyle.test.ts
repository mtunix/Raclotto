import type { UserSummaryDto } from "../../api/generated/model";
import { textureUrl } from "../../lib/borderTextures";
import { panCardStyle } from "./panCardStyle";

const author: UserSummaryDto = {
  border_style: "dashed",
  border_texture: null,
  color: "#ff8800",
  glow_effect: false,
  id: 1,
  name: "Ada",
  profile_picture: null,
};

it("draws a plain border in the author's colour and style", () => {
  expect(panCardStyle(author)).toEqual({ card: { border: "5px dashed #ff8800" }, glow: false });
});

it("draws a pan without an author in the theme's border colour", () => {
  expect(panCardStyle(null).card.border).toBe("5px solid var(--ant-color-border)");
});

it("draws a texture with a wrapper around a borderless card", () => {
  const style = panCardStyle({ ...author, border_texture: "cheese" });

  expect(style.wrapper).toEqual({ backgroundImage: `url(${textureUrl("cheese")})` });
  expect(style.card.border).toBeUndefined();
});

it("lets a glowing author's card glow in their colour", () => {
  const style = panCardStyle({ ...author, border_texture: "bread", glow_effect: true });
  const shadow =
    "0 0 25px 6px rgba(255, 136, 0, 1), 0 0 40px 10px rgba(255, 136, 0, 0.7), 0 0 60px 15px rgba(255, 136, 0, 0.4)";

  expect(style.card.boxShadow).toBe(shadow);
  expect(style.wrapper?.boxShadow).toBe(shadow);
  expect(style.glow).toBe(true);
});

it("glows grey for a colour that is no hex colour", () => {
  expect(panCardStyle({ ...author, color: "red", glow_effect: true }).card.boxShadow).toContain("rgba(217, 217, 217, 1)");
});
