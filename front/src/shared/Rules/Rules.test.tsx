import { fireEvent, screen, waitFor } from '@testing-library/react';
import { currentPath, renderRoutes } from '../../testUtils';
import { RulesIntroModal } from './RulesIntroModal';
import { RulesView } from './RulesView';

beforeEach(() => localStorage.clear());

describe('RulesIntroModal', () => {
    it('shows the rules on the first visit only', async () => {
        const first = renderRoutes([{ path: '/', element: <RulesIntroModal /> }], '/');
        expect(await screen.findByText('rules.firstVisitTitle')).toBeInTheDocument();
        expect(screen.getByText('rules.xpBonusWildcard')).toBeInTheDocument();

        fireEvent.click(screen.getByText('rules.gotIt'));
        first.unmount();
        renderRoutes([{ path: '/', element: <RulesIntroModal /> }], '/');

        expect(screen.queryByText('rules.firstVisitTitle')).not.toBeInTheDocument();
    });
});

describe('RulesView', () => {
    it('goes to the start screen when opened directly', async () => {
        renderRoutes([{ path: '/rules', element: <RulesView /> }], '/rules');
        expect(screen.getByText('rules.endTitle')).toBeInTheDocument();

        fireEvent.click(screen.getByText('common.back'));

        await waitFor(() => expect(currentPath()).toBe('/'));
    });
});
