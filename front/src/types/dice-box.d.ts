declare module '@3d-dice/dice-box' {
    interface RollResult {
        groupId?: string;
        rollId?: string;
        value?: number;
        [key: string]: any;
    }

    interface DiceBoxConfig {
        assetPath?: string;
        theme?: string;
        themeColor?: string;
        scale?: number;
        gravity?: number;
        mass?: number;
        friction?: number;
        restitution?: number;
        linearDamping?: number;
        angularDamping?: number;
        lightIntensity?: number;
        shadowTransparency?: number;
        sound?: boolean;
        offscreen?: boolean;
        themeColors?: {
            background?: string;
            foreground?: string;
        };
        onRollComplete?: (results: RollResult[]) => void;
    }

    interface DiceBox {
        init(): Promise<void>;
        roll(notation: string): void;
        clear(): void;
    }

    class DiceBox {
        constructor(container: HTMLElement | string, config?: DiceBoxConfig);
    }

    export default DiceBox;
}
