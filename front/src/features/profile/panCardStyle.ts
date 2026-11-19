import type { CSSProperties } from "react";
import type { UserSummaryDto } from "../../api/generated/model";
import { getTextureBorderImage } from "../../lib/borderTextures";

export interface PanCardStyle {
  card: CSSProperties;
  cardClassName: string;
  /** Set for a textured border: border-image can't round corners, so a padded wrapper draws it. */
  wrapper?: CSSProperties;
  wrapperClassName: string;
}

const BORDER_WIDTH = "5px";
const RADIUS = "18px";
const DEFAULT_COLOR = "#d9d9d9";

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
  const color = author?.color ?? DEFAULT_COLOR;
  const texture = getTextureBorderImage(author?.border_texture ?? null);
  const boxShadow = author?.glow_effect ? glowShadow(color || DEFAULT_COLOR) : undefined;
  const glow = boxShadow ? { boxShadow } : {};
  const cardClassName = boxShadow ? "pan-card-glow-card" : "";
  const wrapperClassName = boxShadow ? "pan-card-glow-wrapper" : "";

  if (!texture) {
    const border = `${BORDER_WIDTH} ${author?.border_style ?? "solid"} ${color}`;
    return {
      card: {
        height: "100%",
        marginBottom: "16px",
        borderTop: border,
        borderRight: border,
        borderBottom: border,
        borderLeft: border,
        borderRadius: RADIUS,
        ...glow,
      },
      cardClassName,
      wrapperClassName,
    };
  }

  const imageUrl = texture.match(/url\(([^)]+)\)/)?.[1];
  return {
    card: {
      height: "100%",
      marginBottom: "0",
      border: "none",
      borderRadius: RADIUS,
      backgroundColor: "#ffffff",
      position: "relative",
      ...glow,
    },
    cardClassName,
    wrapper: {
      borderRadius: RADIUS,
      padding: BORDER_WIDTH,
      background: imageUrl ? `url(${imageUrl})` : color,
      backgroundSize: "auto",
      backgroundRepeat: "repeat",
      marginBottom: "16px",
      position: "relative",
      overflow: "hidden",
      ...glow,
    },
    wrapperClassName,
  };
}
