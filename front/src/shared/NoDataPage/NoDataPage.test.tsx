import React from 'react';
import { render, screen } from '@testing-library/react';
import NoDataPage from './NoDataPage';

jest.mock('i18next', () => ({
    t: (key: string) => key,
}));

describe('NoDataPage', () => {
    it('renders no data page', () => {
        render(<NoDataPage />);
        expect(screen.getByText('error.no_data_available.title')).toBeInTheDocument();
        expect(screen.getByText('error.no_data_available.message')).toBeInTheDocument();
    });

    it('renders with correct structure', () => {
        render(<NoDataPage />);
        const errorPage = screen.getByText('error.no_data_available.title').closest('#error-page');
        const icon = errorPage?.querySelector('i');
        expect(errorPage).toBeInTheDocument();
        expect(icon).toHaveClass('bi', 'bi-database-exclamation');
    });
});
