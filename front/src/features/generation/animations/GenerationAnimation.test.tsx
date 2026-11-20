import { render } from '@testing-library/react';
import { GenerationAnimation } from './GenerationAnimation';

function shownAnimation(container: HTMLElement): string {
    const markers: [string, string][] = [
        ['.chaotic-flying-ingredient', 'chaotic'],
        ['.blender-flying-ingredient', 'blender'],
        ['.chef-hat-flying-ingredient', 'chefHat'],
        ['.pinata-flying-ingredient', 'pinata'],
        ['.slot-flying-ingredient', 'slotMachine'],
    ];
    const marker = markers.find(([selector]) => container.querySelector(selector));
    if (marker) return marker[1];
    return container.textContent.includes('🚀') ? 'shooting' : 'none';
}

test('chooses among all six animations, each with its own duration', () => {
    const shown = [0, 1, 2, 3, 4, 5].map((slot) => {
        const onDurationChange = vi.fn<(duration: number) => void>();
        const { container, unmount } = render(
            <GenerationAnimation random={() => (slot + 0.5) / 6} onDurationChange={onDurationChange} />,
        );
        const animation = shownAnimation(container);
        unmount();
        return [animation, onDurationChange.mock.lastCall?.[0]];
    });

    expect(shown).toEqual([
        ['chaotic', 1000],
        ['blender', 3000],
        ['chefHat', 3000],
        ['pinata', 4000],
        ['slotMachine', 3000],
        ['shooting', 3500],
    ]);
});

test('covers the whole range of the random number', () => {
    const { container: lowest } = render(<GenerationAnimation random={() => 0} />);
    const { container: highest } = render(<GenerationAnimation random={() => 0.9999} />);

    expect(shownAnimation(lowest)).toBe('chaotic');
    expect(shownAnimation(highest)).toBe('shooting');
});

test.each([0, 1, 2, 3, 4, 5])('keeps the animation it picked in slot %i as it renders again and fades', (slot) => {
    const random = vi.fn(() => (slot + 0.5) / 6);
    const onDurationChange = vi.fn<(duration: number) => void>();
    const { container, rerender } = render(<GenerationAnimation random={random} onDurationChange={onDurationChange} />);
    const picked = shownAnimation(container);
    rerender(<GenerationAnimation random={random} onDurationChange={onDurationChange} />);
    rerender(<GenerationAnimation random={random} onDurationChange={onDurationChange} fading />);

    expect(random).toHaveBeenCalledTimes(1);
    expect(onDurationChange).toHaveBeenCalledTimes(1);
    expect(shownAnimation(container)).toBe(picked);
    expect(container.querySelector('.generation-overlay-fading')).toBeInTheDocument();
});

test('plays for the duration it is given instead of its own', () => {
    const onDurationChange = vi.fn();
    const { container } = render(
        <GenerationAnimation random={() => 0} duration={1500} onDurationChange={onDurationChange} />,
    );

    expect(onDurationChange).toHaveBeenLastCalledWith(1500);
    const ingredient = container.querySelector<HTMLElement>('.chaotic-flying-ingredient');
    expect(ingredient?.style.animation).toContain('1500ms');
});

test('picks with Math.random by default', () => {
    const { container } = render(<GenerationAnimation />);

    expect(shownAnimation(container)).not.toBe('none');
});
