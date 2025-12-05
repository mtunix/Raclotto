import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsView } from './SettingsView';
import { resetAllMocks, mockLocalStorage } from './__tests__/testUtils';

describe('SettingsView', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    it('renders form fields', () => {
        render(<SettingsView />);
        expect(screen.getByPlaceholderText('common.enterName')).toBeInTheDocument();
        expect(screen.getByText('settings.iAm')).toBeInTheDocument();
        expect(screen.getByText('settings.allOkToSnack')).toBeInTheDocument();
    });

    it('loads name from localStorage', () => {
        mockLocalStorage.getItem.mockImplementation((key: string) => key === 'name' ? 'Test User' : null);
        render(<SettingsView />);
        expect(screen.getByPlaceholderText('common.enterName')).toHaveValue('Test User');
    });

    it('updates localStorage when name changes', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);
        const nameInput = screen.getByPlaceholderText('common.enterName');
        await user.clear(nameInput);
        await user.type(nameInput, 'New Name');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('name', 'New Name');
    });

    it('updates localStorage when tag switch is toggled', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);
        const switches = screen.getAllByRole('switch');
        const initialChecked = switches[0].getAttribute('aria-checked');
        const expectedValue = initialChecked === 'true' ? 'false' : 'true';
        
        await user.click(switches[0]);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('meat', expectedValue);
    });

    it('handles vegetarian toggle logic', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);
        const switches = screen.getAllByRole('switch');
        const initialChecked = switches[1].getAttribute('aria-checked');
        
        await user.click(switches[1]);
        
        if (initialChecked === 'true') {
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vegan', 'true');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vegetarian', 'false');
        } else {
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vegetarian', 'true');
        }
    });

    it('handles meat toggle logic', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);
        const switches = screen.getAllByRole('switch');
        const initialChecked = switches[0].getAttribute('aria-checked');
        
        await user.click(switches[0]);
        
        if (initialChecked === 'true') {
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vegetarian', 'true');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vegan', 'true');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('meat', 'false');
        } else {
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('meat', 'true');
        }
    });

    it('toggles individual switches', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);
        const switches = screen.getAllByRole('switch');
        const initialChecked = switches[4].getAttribute('aria-checked');
        
        await user.click(switches[4]);
        expect(switches[4].getAttribute('aria-checked')).not.toBe(initialChecked);
    });

    it('displays all tag switches', () => {
        render(<SettingsView />);
        expect(screen.getAllByRole('switch').length).toBe(7);
    });

    it('initializes with default values when localStorage is empty', () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        render(<SettingsView />);
        expect(screen.getByPlaceholderText('common.enterName')).toHaveValue('');
        screen.getAllByRole('switch').forEach((sw) => {
            expect(sw).toHaveAttribute('aria-checked', 'true');
        });
    });

    it('persists preference changes to localStorage', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);
        await user.type(screen.getByPlaceholderText('common.enterName'), 'User Name');
        
        const switches = screen.getAllByRole('switch');
        const meatInitial = switches[0].getAttribute('aria-checked');
        await user.click(switches[0]);
        
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('name', 'User Name');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('meat', meatInitial === 'true' ? 'false' : 'true');
    });
});
