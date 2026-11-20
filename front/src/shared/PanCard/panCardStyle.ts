import type { CSSProperties } from "react";
import type { UserSummaryDto } from "../../api/generated/model";
import { textureUrl } from "../../lib/borderTextures";

/** The parts of a pan card that depend on its author; the rest is in PanCard.css. */
export interface PanCardStyle {
  card: CSSProperties;
  /** Set for a textured border: border-image can't round corners, so a padded wrapper draws it. */
  wrapper?: CSSProperties;
  glow: boolean;
}

const BORDER_WIDTH = "5px";
const DEFAULT_COLOR = "var(--ant-color-border)";

function rgb(hex: string): [number, number, number] {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : [217, 217, 217];
}

function glowShadow(color: string): string {
  const [r, g, b] = rgb(color);
  const rgba = (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
  return `0 0 25px 6px ${rgba(1)}, 0 0 40px 10px ${rgba(0.7)}, 0 0 60px 15px ${rgba(0.4)}`;
}

/** How a pan card shows its author: their border colour, style or texture, and glow. */
export function panCardStyle(author: UserSummaryDto | null): PanCardStyle {
  const color = author?.color || DEFAULT_COLOR;
  const texture = textureUrl(author?.border_texture);
  const glow = Boolean(author?.glow_effect);
  const shadow = glow ? { boxShadow: glowShadow(color) } : {};

  if (!texture) {
    return { card: { border: `${BORDER_WIDTH} ${author?.border_style ?? "solid"} ${color}`, ...shadow }, glow };
  }
  return { card: shadow, wrapper: { backgroundImage: `url(${texture})`, ...shadow }, glow };
}
