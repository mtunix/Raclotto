import { Util } from "../../../lib/util";
import "./animations.css";

/** The classes of an animation's overlay: no blur on phones, and fading out at the end. */
export function overlayClassName(fading: boolean): string {
    return ["generation-overlay", Util.isMobile() && "generation-overlay-lite", fading && "generation-overlay-fading"]
        .filter(Boolean)
        .join(" ");
}
