import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorPage, { RaclottoError, ApiNoResponseError } from './ErrorPage';

let mockRouteError: any = null;
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useRouteError: () => mockRouteError,
}));

jest.mock('i18next', () => ({
    t: (key: string) => key,
}));

describe('ErrorPage', () => {
    beforeEach(() => {
        mockRouteError = null;
    });

    it('renders route error when useRouteError returns error', () => {
        mockRouteError = { statusText: 'Not Found', message: 'Page not found' };
        render(<ErrorPage />);
        expect(screen.getByText('error.unexpected.title')).toBeInTheDocument();
        expect(screen.getByText('Not Found')).toBeInTheDocument();
    });

    it('renders props error when provided', () => {
        const error = new RaclottoError('Test Title', 'Test Message');
        render(<ErrorPage error={error} title="Dummy" message="Dummy" />);
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('renders title and message when provided', () => {
        render(<ErrorPage title="Test Title" message="Test Message" />);
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('renders unknown error when no error information available', () => {
        render(<ErrorPage />);
        expect(screen.getByText('error.unknown.title')).toBeInTheDocument();
        expect(screen.getByText('error.unknown.message')).toBeInTheDocument();
    });

    it('prioritizes route error over props error', () => {
        mockRouteError = { statusText: 'Route Error' };
        const propsError = new RaclottoError('Props Title', 'Props Message');
        render(<ErrorPage error={propsError} />);
        expect(screen.getByText('error.unexpected.title')).toBeInTheDocument();
        expect(screen.queryByText('Props Title')).not.toBeInTheDocument();
    });
});

describe('RaclottoError', () => {
    it('creates error with title and message', () => {
        const error = new RaclottoError('Test Title', 'Test Message');
        expect(error.title).toBe('Test Title');
        expect(error.message).toBe('Test Message');
        expect(error.name).toBe('Raclotto.GenericError');
    });
});

describe('ApiNoResponseError', () => {
    it('creates API no response error', () => {
        const error = new ApiNoResponseError();
        expect(error.name).toBe('Raclotto.ApiNoResponseError');
        expect(error.title).toBe('error.no_response.title');
        expect(error.message).toBe('error.no_response.message');
    });
});
