import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import type { LevelDto, MeDto } from '../../../api/generated/model';
import { me } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { UserSettingsSection } from './UserSettingsSection';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

const level: LevelDto = { id: 1, name: 'level.test', label_de: 'Test', label_en: 'Test', required_experience: 0 };
const atLevel = (id: number, changes: Partial<MeDto> = {}): MeDto => ({ ...me, level: { ...level, id }, ...changes });
const field = (label: string) => screen.getByText(label).closest('.ant-form-item') as HTMLElement;
const select = (label: string) => within(field(label)).getByRole('combobox');
const nameInput = () => screen.getByPlaceholderText('common.enterName');
const saveButton = () => screen.getByRole('button', { name: 'common.save' });
const glowSwitch = () => within(field('settings.glowEffect')).getByRole('switch');

async function renderSection(user: MeDto = me) {
    fake.on('GET', '/auth/me', user);
    renderRoute(<UserSettingsSection />);
    await waitFor(() => expect(nameInput()).toHaveValue(user.name));
}

it('shows a loading state until the user is loaded, with the password form already there', () => {
    fake.on('GET', '/auth/me', () => new Promise(() => {}));
    renderRoute(<UserSettingsSection />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('common.enterName')).not.toBeInTheDocument();
    expect(screen.getByLabelText('settings.currentPassword')).toBeInTheDocument();
});

it('says so when the user cannot be loaded', async () => {
    fake.on('GET', '/auth/me', () => {
        throw Object.assign(new Error('Not Found'), { status: 404 });
    });
    renderRoute(<UserSettingsSection />);

    expect(await screen.findByText('settings.loadFailed')).toBeInTheDocument();
});

it('offers saving only while something differs from what was loaded', async () => {
    await renderSection();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(nameInput(), { target: { value: 'Grace' } });
    expect(saveButton()).toBeEnabled();
    fireEvent.change(nameInput(), { target: { value: me.name } });
    expect(saveButton()).toBeDisabled();

    fireEvent.click(screen.getByText('tags.gluten'));
    expect(saveButton()).toBeEnabled();
    fireEvent.click(screen.getByText('tags.gluten'));
    expect(saveButton()).toBeDisabled();
});

describe('card decorations', () => {
    it('are all locked below level 3', async () => {
        await renderSection(atLevel(2, { border_texture: null }));

        expect(select('settings.borderStyle')).toBeDisabled();
        expect(select('settings.borderTexture')).toBeDisabled();
        expect(glowSwitch()).toBeDisabled();
        expect(screen.getByText('settings.borderStyleLocked')).toBeInTheDocument();
        expect(screen.getByText('settings.borderTextureLocked')).toBeInTheDocument();
        expect(screen.getByText('settings.glowEffectLocked')).toBeInTheDocument();
    });

    it('unlock the border style at level 3', async () => {
        await renderSection(atLevel(3, { border_texture: null }));
        expect(select('settings.borderStyle')).toBeEnabled();
        expect(screen.getByText('settings.borderStyleUnlocked')).toBeInTheDocument();
        expect(select('settings.borderTexture')).toBeDisabled();
        expect(glowSwitch()).toBeDisabled();
    });

    it('unlock the texture at level 5', async () => {
        await renderSection(atLevel(5, { border_texture: null }));

        expect(select('settings.borderTexture')).toBeEnabled();
        expect(screen.getByText('settings.borderTextureUnlocked')).toBeInTheDocument();
        expect(glowSwitch()).toBeDisabled();
    });

    it('unlock the glow at level 7', async () => {
        await renderSection(atLevel(7, { glow_effect: false }));

        expect(glowSwitch()).toBeEnabled();
        expect(screen.getByText('settings.glowEffectUnlocked')).toBeInTheDocument();
        fireEvent.click(glowSwitch());
        expect(saveButton()).toBeEnabled();
    });

    it('lock the border style once a texture is chosen, which is then saved', async () => {
        fake.on('PATCH', '/auth/me', atLevel(5, { border_texture: 'bread' }));
        await renderSection(atLevel(5, { border_texture: null }));
        expect(select('settings.borderStyle')).toBeEnabled();

        fireEvent.mouseDown(select('settings.borderTexture'));
        fireEvent.click(await screen.findByText('texture.bread'));

        expect(select('settings.borderStyle')).toBeDisabled();
        fireEvent.click(saveButton());
        expect(await screen.findByText('common.saved')).toBeInTheDocument();
        expect(fake.last('PATCH', '/auth/me')?.body).toMatchObject({ border_texture: 'bread' });
    });

    it('leave the border style to the texture while one is chosen', async () => {
        await renderSection(atLevel(7, { border_texture: 'cheese' }));

        expect(select('settings.borderStyle')).toBeDisabled();
        expect(screen.getByText('(settings.disabledWithTexture)')).toBeInTheDocument();
        expect(screen.getByText('settings.styleDisabledInfo')).toBeInTheDocument();
    });
});

it('saves the whole profile with the diet as the backend keeps it, and signs the user in as the result', async () => {
    const saved: MeDto = { ...me, name: 'Grace', meat: false };
    fake.on('PATCH', '/auth/me', saved);
    await renderSection();

    fireEvent.change(nameInput(), { target: { value: 'Grace' } });
    fireEvent.click(screen.getByText('tags.meat'));
    fireEvent.click(saveButton());

    expect(await screen.findByText('common.saved')).toBeInTheDocument();
    expect(fake.last('PATCH', '/auth/me')?.body).toEqual({
        name: 'Grace',
        color: me.color,
        language: me.language,
        border_style: me.border_style,
        border_texture: me.border_texture,
        glow_effect: me.glow_effect,
        meat: false,
        vegetarian: true,
        vegan: true,
        fish: me.fish,
        gluten: me.gluten,
        histamine: me.histamine,
        fructose: me.fructose,
        lactose: me.lactose,
    });
    expect(useAuthStore.getState().user).toEqual(saved);
    await waitFor(() => expect(saveButton()).toBeDisabled());
});

it('keeps the changes when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.on('PATCH', '/auth/me', () => {
        throw Object.assign(new Error('Request failed with status code 500'), { status: 500 });
    });
    await renderSection();

    fireEvent.change(nameInput(), { target: { value: 'Grace' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('settings.saveFailed')).toBeInTheDocument();
    expect(nameInput()).toHaveValue('Grace');
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(useAuthStore.getState().user).toEqual(me);
});
