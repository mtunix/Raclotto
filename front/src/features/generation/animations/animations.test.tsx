import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import type { MockInstance } from 'vitest';
import { IngredientType, type IngredientDto } from '../../../api/generated/model';
import { ingredientsForUser } from '../../../lib/api/__fixtures__/backendResponses';
import { BlenderSpinAnimation } from './BlenderSpinAnimation';
import { ChaoticGenerationAnimation } from './ChaoticGenerationAnimation';
import { ChefHatExplosionAnimation } from './ChefHatExplosionAnimation';
import { PinataPartyAnimation } from './PinataPartyAnimation';
import { ShootingIngredientsAnimation } from './ShootingIngredientsAnimation';
import { SlotMachineAnimation } from './SlotMachineAnimation';

interface AnimationProps {
    ingredients?: IngredientDto[];
    duration?: number;
    fading?: boolean;
}

let cores: MockInstance<() => number> | undefined;
afterEach(() => {
    cores?.mockRestore();
    cores = undefined;
});

// The width is restored after every test by setupTests.
function onPhone(device: 'phone' | 'low-end phone') {
    window.innerWidth = 500;
    cores ??= vi.spyOn(navigator, 'hardwareConcurrency', 'get');
    cores.mockReturnValue(device === 'phone' ? 8 : 2);
}

function milliseconds(value: string): number {
    return Number(/([\d.]+)ms/.exec(value)?.[1]);
}

/** When an element's CSS animation ends: its delay plus its own duration, the first time in the shorthand. */
function endsAt(element: HTMLElement): number {
    return milliseconds(element.style.animationDelay) + milliseconds(element.style.animation);
}

function all(container: HTMLElement, selector: string): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>(selector)];
}

const fill: IngredientDto = { ...ingredientsForUser[0], id: 1, type: IngredientType.FILL, available: true };
const sauce: IngredientDto = { ...ingredientsForUser[0], id: 2, type: IngredientType.SAUCE, available: true };

const throwingFood: [string, ComponentType<AnimationProps>, string][] = [
    ['ChaoticGenerationAnimation', ChaoticGenerationAnimation, '.chaotic-flying-ingredient'],
    ['BlenderSpinAnimation', BlenderSpinAnimation, '.blender-flying-ingredient'],
    ['ChefHatExplosionAnimation', ChefHatExplosionAnimation, '.chef-hat-flying-ingredient'],
    ['PinataPartyAnimation', PinataPartyAnimation, '.pinata-flying-ingredient'],
    ['SlotMachineAnimation', SlotMachineAnimation, '.slot-flying-ingredient'],
];

describe.each([
    ...throwingFood.map(([name, Animation]): [string, ComponentType<AnimationProps>] => [name, Animation]),
    ['ShootingIngredientsAnimation', ShootingIngredientsAnimation] as [string, ComponentType<AnimationProps>],
])('%s', (_name, Animation) => {
    test('keeps its scene as the roll view renders again and starts the fade-out', () => {
        // The roll view filters its ingredients on every render, so each render brings a new array.
        const { container, rerender } = render(<Animation ingredients={[fill, sauce]} />);
        const scene = container.querySelector('.generation-overlay')?.innerHTML;
        rerender(<Animation ingredients={[fill, sauce]} />);
        rerender(<Animation ingredients={[fill, sauce]} fading />);
        rerender(<Animation ingredients={[fill, sauce]} fading />);

        expect(container.querySelector('.generation-overlay-fading')?.innerHTML).toBe(scene);
    });
});

describe.each(throwingFood)('%s', (_name, Animation, ingredient) => {
    test('throws food across a dimmed overlay', () => {
        const { container } = render(<Animation />);

        expect(container.querySelector('.generation-overlay')).toBeInTheDocument();
        expect(container.querySelector('.generation-overlay-fading')).not.toBeInTheDocument();
        expect(all(container, ingredient)).toHaveLength(35);
    });

    test('throws less food and drops the blur on a phone', () => {
        onPhone('phone');
        const { container } = render(<Animation />);

        expect(container.querySelector('.generation-overlay-lite')).toBeInTheDocument();
        expect(all(container, ingredient)).toHaveLength(20);
    });

    test('throws least food on a low-end phone', () => {
        onPhone('low-end phone');
        const { container } = render(<Animation />);

        expect(all(container, ingredient)).toHaveLength(15);
    });

    test('fades out when told to', () => {
        const { container } = render(<Animation fading />);

        expect(container.querySelector('.generation-overlay-fading')).toBeInTheDocument();
    });
});

describe.each([
    ['BlenderSpinAnimation', BlenderSpinAnimation, '.blender-flying-ingredient', 3000],
    ['ChefHatExplosionAnimation', ChefHatExplosionAnimation, '.chef-hat-flying-ingredient', 3000],
    ['PinataPartyAnimation', PinataPartyAnimation, '.pinata-flying-ingredient', 4000],
    ['SlotMachineAnimation', SlotMachineAnimation, '.slot-flying-ingredient', 3000],
] as [string, ComponentType<AnimationProps>, string, number][])('%s', (_name, Animation, ingredient, ownDuration) => {
    test('lands its last ingredient as the given duration ends', () => {
        const { container } = render(<Animation duration={6000} />);

        const ends = all(container, ingredient).map(endsAt);
        expect(Math.max(...ends)).toBeCloseTo(6000);
    });

    test('plays for its own duration when given none', () => {
        const { container } = render(<Animation />);

        const ends = all(container, ingredient).map(endsAt);
        expect(Math.max(...ends)).toBeCloseTo(ownDuration);
    });
});

describe('ChaoticGenerationAnimation', () => {
    test('flies every ingredient for the given duration, or a second by default', () => {
        const { container: given } = render(<ChaoticGenerationAnimation duration={2500} />);
        const { container: own } = render(<ChaoticGenerationAnimation />);

        const flights = (container: HTMLElement) =>
            new Set(all(container, '.chaotic-flying-ingredient').map((element) => milliseconds(element.style.animation)));
        expect(flights(given)).toEqual(new Set([2500]));
        expect(flights(own)).toEqual(new Set([1000]));
    });
});

describe('PinataPartyAnimation', () => {
    test('bursts confetti only once the piñata has broken', () => {
        const { container } = render(<PinataPartyAnimation />);

        const confetti = all(container, '.pinata-confetti');
        expect(confetti).toHaveLength(20);
        for (const piece of confetti) expect(milliseconds(piece.style.animationDelay)).toBeGreaterThanOrEqual(1000);
        for (const piece of all(container, '.pinata-flying-ingredient')) {
            expect(milliseconds(piece.style.animationDelay)).toBeGreaterThanOrEqual(1000);
        }
    });

    test('bursts less confetti on a phone', () => {
        onPhone('low-end phone');
        const { container } = render(<PinataPartyAnimation />);

        expect(all(container, '.pinata-confetti')).toHaveLength(5);
    });
});

describe('ShootingIngredientsAnimation', () => {
    test('ejects the available ingredients it is given, as fill or sauce', () => {
        render(<ShootingIngredientsAnimation ingredients={[fill, { ...fill, id: 3, available: false }, sauce]} />);

        expect(screen.getAllByText('🥗')).toHaveLength(1);
        expect(screen.getAllByText('🍯')).toHaveLength(1);
    });

    test('ejects a single available ingredient mid-flight', () => {
        const { container } = render(<ShootingIngredientsAnimation ingredients={[fill]} />);

        expect(screen.getAllByText('🥗')).toHaveLength(1);
        expect(container.innerHTML).not.toContain('NaN');
    });

    test('ejects food of its own when given no ingredients', () => {
        render(<ShootingIngredientsAnimation />);

        expect(screen.getByText('🚀')).toBeInTheDocument();
        for (const food of ['🍕', '🍔', '🌮', '🥙', '🍖', '🍗', '🥩', '🥓', '🍳', '🧀']) {
            expect(screen.getByText(food)).toBeInTheDocument();
        }
        expect(screen.queryByText('🥗')).not.toBeInTheDocument();
    });

    test('ejects at most twelve ingredients, fewer on a phone', () => {
        const many = Array.from({ length: 20 }, (_, index) => ({ ...fill, id: index + 1 }));
        const { unmount } = render(<ShootingIngredientsAnimation ingredients={many} />);
        expect(screen.getAllByText('🥗')).toHaveLength(12);
        unmount();

        onPhone('phone');
        const { unmount: unmountPhone } = render(<ShootingIngredientsAnimation ingredients={many} />);
        expect(screen.getAllByText('🥗')).toHaveLength(8);
        unmountPhone();

        onPhone('low-end phone');
        render(<ShootingIngredientsAnimation ingredients={many} />);
        expect(screen.getAllByText('🥗')).toHaveLength(6);
    });

    test('flies the rocket across for the given duration, or its own', () => {
        const { unmount } = render(<ShootingIngredientsAnimation duration={5000} />);
        expect(milliseconds(screen.getByText('🚀').style.animation)).toBe(5000);
        unmount();

        render(<ShootingIngredientsAnimation fading />);
        expect(milliseconds(screen.getByText('🚀').style.animation)).toBe(3500);
        expect(document.querySelector('.generation-overlay-fading')).toBeInTheDocument();
    });
});
