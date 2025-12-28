import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from './Toolbar';
import { mockApi, mockUseAppStore, createMockIngredient, createMockSession, resetAllMocks, mockLocalStorage } from '../../../components/__tests__/testUtils';
import { IngredientType } from '../../../model/ingredient';

describe('Toolbar', () => {
    const mockIngredients = [
        createMockIngredient({ id: 1, name: 'Ingredient 1', type: IngredientType.FILL }),
        createMockIngredient({ id: 2, name: 'Ingredient 2', type: IngredientType.SAUCE }),
    ];
    const sessionKey = 'test-session';
    const mockSessionClosed = jest.fn();

    const renderToolbar = () => render(
        <Toolbar
            ingredients={mockIngredients}
            session={sessionKey}
            sessionId="123"
            sessionClosed={mockSessionClosed}
        />
    );

    beforeEach(() => {
        resetAllMocks();
        mockApi.get.mockResolvedValue([]);
    });

    it('renders all toolbar buttons', () => {
        renderToolbar();
        expect(screen.getByText(/common\.shuffle/)).toBeInTheDocument();
        expect(screen.getByText(/common\.settings/)).toBeInTheDocument();
        expect(screen.getByText(/common\.history/)).toBeInTheDocument();
        expect(screen.getByText('+')).toBeInTheDocument();
        expect(screen.getByText(/common\.achievements/)).toBeInTheDocument();
        expect(screen.getByText(/common\.serverSettings/)).toBeInTheDocument();
    });

    it('opens generate view when shuffle button is clicked', async () => {
        const user = userEvent.setup();
        renderToolbar();
        await user.click(screen.getByText(/common\.shuffle/));
        expect(screen.getByText('toolbar.generateTitle')).toBeInTheDocument();
    });

    it('opens settings view when settings button is clicked', async () => {
        const user = userEvent.setup();
        renderToolbar();
        await user.click(screen.getByText(/common\.settings/));
        expect(screen.getByText('toolbar.userSettingsTitle')).toBeInTheDocument();
    });

    it('opens history view when history button is clicked', async () => {
        const user = userEvent.setup();
        renderToolbar();
        await user.click(screen.getByText(/common\.history/));
        expect(screen.getByText('toolbar.historyTitle')).toBeInTheDocument();
    });

    it('opens add ingredient view when plus button is clicked', async () => {
        const user = userEvent.setup();
        renderToolbar();
        await user.click(screen.getByText('+'));
        expect(screen.getByText('toolbar.addIngredientTitle')).toBeInTheDocument();
    });

    it('opens achievements view when achievements button is clicked', async () => {
        const user = userEvent.setup();
        renderToolbar();
        await user.click(screen.getByText(/common\.achievements/));
        expect(screen.getByText('toolbar.achievementsTitle')).toBeInTheDocument();
    });

    it('opens server settings view when server settings button is clicked', async () => {
        const user = userEvent.setup();
        mockApi.get.mockResolvedValue({ session: { name: 'Test Session' } });
        renderToolbar();
        await user.click(screen.getByText(/common\.serverSettings/));
        expect(screen.getByText('toolbar.serverSettingsTitle')).toBeInTheDocument();
    });

    it('closes tool when same button is clicked again', async () => {
        const user = userEvent.setup();
        renderToolbar();
        const shuffleButton = screen.getByText(/common\.shuffle/);
        await user.click(shuffleButton);
        expect(screen.getByText('toolbar.generateTitle')).toBeInTheDocument();
        await user.click(shuffleButton);
        expect(screen.queryByText('toolbar.generateTitle')).not.toBeInTheDocument();
    });

    it('switches between different tools', async () => {
        const user = userEvent.setup();
        renderToolbar();
        await user.click(screen.getByText(/common\.shuffle/));
        expect(screen.getByText('toolbar.generateTitle')).toBeInTheDocument();
        await user.click(screen.getByText(/common\.settings/));
        expect(screen.queryByText('toolbar.generateTitle')).not.toBeInTheDocument();
        expect(screen.getByText('toolbar.userSettingsTitle')).toBeInTheDocument();
    });

    it('highlights active button', async () => {
        const user = userEvent.setup();
        renderToolbar();
        const shuffleButton = screen.getByText(/common\.shuffle/);
        await user.click(shuffleButton);
        expect(shuffleButton.closest('button')).toHaveClass('ant-btn-primary');
    });
});
