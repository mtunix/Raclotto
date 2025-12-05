import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner, SpinnerContainer } from './Spinner';

describe('Spinner', () => {
    it('renders with default classes', () => {
        render(<Spinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('spinner-border', 'text-primary');
    });

    it('renders with custom className', () => {
        render(<Spinner className="custom-class" />);
        expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
});

describe('SpinnerContainer', () => {
    it('renders with correct structure', () => {
        render(<SpinnerContainer />);
        const container = screen.getByRole('status').closest('.container');
        expect(container).toBeInTheDocument();
        expect(container?.querySelector('.row')).toBeInTheDocument();
        expect(container?.querySelector('.col-md-12')).toBeInTheDocument();
    });
});
