import { FakeTransport } from "./fakeTransport";
import { setTransport, Transport } from "./transport";
import {
    achievementResource,
    enrichedPanAttributes,
    rollDocument,
    userAttributes,
} from "./__fixtures__/wire";

// setupTests.js replaces the API module with a stub for component tests;
// these tests exercise the real module through the fake transport.
jest.unmock("./index");
// eslint-disable-next-line import/first
import { Api } from "./index";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

describe("Api.generate", () => {
    it("posts generation parameters and returns the roll outcome", async () => {
        fake.on("POST", "/pans/generate", rollDocument());

        const outcome = await Api.generate("sess", 3, 1, 2, true);

        expect(fake.last("POST", "/pans/generate")).toEqual({
            method: "POST",
            path: "/pans/generate",
            query: { session_key: "sess" },
            body: {
                data: {
                    type: "generationParameters",
                    attributes: {
                        numFill: 3,
                        numSauce: 1,
                        preparation_type_id: 2,
                        roll_cheese: true,
                    },
                },
            },
        });
        expect(outcome.pan.id).toBe(11);
        expect(outcome.pan.ingredients).toHaveLength(2);
        expect(outcome.reward.xp_gained).toBe(42);
        expect(outcome.reward.leveled_up).toBe(false);
        expect(outcome.achievements.map((a) => a.title)).toEqual(["First Pan"]);
        expect(outcome.events.map((e) => e.id)).toEqual([9]);
    });

    it("omits optional parameters that were not given", async () => {
        fake.on("POST", "/pans/generate", rollDocument());

        await Api.generate("sess", 2, 0);

        expect(fake.last("POST", "/pans/generate")?.body).toEqual({
            data: {
                type: "generationParameters",
                attributes: { numFill: 2, numSauce: 0 },
            },
        });
    });
});

describe("Api.generateBandit", () => {
    it("returns the same outcome shape as the legacy generator", async () => {
        fake.on("POST", "/pans/generate/bandit", rollDocument({ leveled_up: true }));

        const outcome = await Api.generateBandit("sess", 4, false);

        expect(fake.last("POST", "/pans/generate/bandit")?.body).toEqual({
            data: {
                type: "generationParameters",
                attributes: { total_columns: 4, roll_prep_type: false },
            },
        });
        expect(outcome.reward.leveled_up).toBe(true);
        expect(outcome.reward.level?.id).toBe(3);
    });
});

describe("Api.getPansPaginated", () => {
    const page = (ids: number[], meta: Record<string, unknown>) => ({
        jsonapi: { version: "1.0" },
        data: ids.map((id) => ({
            type: "pan",
            id: String(id),
            attributes: enrichedPanAttributes(),
        })),
        meta,
    });

    it("maps pans and pagination meta", async () => {
        fake.on("GET", "/pans", page([1, 2], { total: 5, limit: 2, offset: 2, has_more: true }));

        const result = await Api.getPansPaginated("sess", 2, 2);

        expect(fake.last("GET", "/pans")?.query).toEqual({
            session_key: "sess",
            limit: 2,
            offset: 2,
        });
        expect(result.data.map((p) => p.id)).toEqual([1, 2]);
        expect(result.data[0].user).toBe("Ada");
        expect(result.hasMore).toBe(true);
        expect(result.total).toBe(5);
    });

    it("reports the last page", async () => {
        fake.on("GET", "/pans", page([5], { total: 5, limit: 2, offset: 4, has_more: false }));

        const result = await Api.getPansByUser(7, 2, 4);

        expect(fake.last("GET", "/pans")?.query).toEqual({ user_id: 7, limit: 2, offset: 4 });
        expect(result.hasMore).toBe(false);
    });
});

describe("Api.listAchievements", () => {
    it("maps the enriched achievement list", async () => {
        const unlocked = achievementResource(1, "First Pan");
        const locked = achievementResource(2, "Grill Master");
        fake.on("GET", "/achievements", {
            jsonapi: { version: "1.0" },
            data: [
                { ...unlocked, attributes: { ...unlocked.attributes, unlocked: true, progress: 1 } },
                { ...locked, attributes: { ...locked.attributes, unlocked: false, progress: null } },
            ],
        });

        const achievements = await Api.listAchievements();

        expect(achievements).toEqual([
            {
                id: 1,
                title: "First Pan",
                description: "First Pan description",
                value: 10,
                hidden: false,
                unlocked: true,
                progress: 1,
            },
            {
                id: 2,
                title: "Grill Master",
                description: "Grill Master description",
                value: 10,
                hidden: false,
                unlocked: false,
            },
        ]);
    });
});

describe("auth endpoints go through the transport", () => {
    it("login returns the token from meta and the user identity", async () => {
        fake.on("POST", "/auth/login", {
            jsonapi: { version: "1.0" },
            data: {
                type: "user",
                id: 7,
                attributes: { name: "Ada", email: "ada@example.com", profile_picture: null },
            },
            meta: { token: "jwt" },
        });

        const result = await Api.login("ada", "secret");

        expect(fake.last("POST", "/auth/login")?.body).toEqual({
            data: { type: "login", attributes: { email: "ada", password: "secret" } },
        });
        expect(result).toEqual({
            token: "jwt",
            user: { id: 7, name: "Ada", email: "ada@example.com", profile_picture: null },
        });
    });

    it("getCurrentUser maps the user with level info", async () => {
        fake.on("GET", "/auth/me", {
            jsonapi: { version: "1.0" },
            data: {
                type: "user",
                id: "7",
                attributes: {
                    ...userAttributes(),
                    level: { id: 2, name: "Cook", required_experience: 100 },
                    next_level: { id: 3, name: "Chef", required_experience: 140 },
                },
            },
        });

        const user = await Api.getCurrentUser();

        expect(user.id).toBe(7);
        expect(user.experience_points).toBe(100);
        expect(user.next_level?.name).toBe("Chef");
    });
});

describe("invites", () => {
    it("createInvite unwraps the doubly nested document", async () => {
        fake.on("POST", "/invites", {
            jsonapi: { version: "1.0" },
            data: {
                data: {
                    type: "inviteToken",
                    id: 4,
                    attributes: {
                        token: "tok",
                        email: "bob@example.com",
                        expires_at: "2026-11-25T00:00:00",
                        is_used: false,
                    },
                },
            },
        });

        const invite = await Api.createInvite("bob@example.com");

        expect(invite).toEqual({
            id: 4,
            token: "tok",
            email: "bob@example.com",
            expires_at: "2026-11-25T00:00:00",
            is_used: false,
            used_at: null,
        });
    });
});

describe("profile pictures", () => {
    it("reads the history and defaults is_candidate", async () => {
        fake.on("GET", "/images/profile-picture-history/7", {
            jsonapi: { version: "1.0" },
            data: {
                type: "profile_picture_history",
                attributes: {
                    history: [
                        {
                            id: 1,
                            profile_picture: "data:image/png;base64,AAA",
                            created_at: "2026-11-18T19:00:00",
                            level_id: 2,
                            level_name: "Cook",
                            is_candidate: null,
                        },
                    ],
                    total_count: 1,
                    user_id: 7,
                    user_name: "Ada",
                },
            },
        });

        const history = await Api.getProfilePictureHistory(7);

        expect(history.total_count).toBe(1);
        expect(history.history[0]).toMatchObject({ id: 1, level_name: "Cook", is_candidate: false });
    });

    it("generateProfilePicture sends a plain body and returns the image", async () => {
        fake.on("POST", "/images/generate-profile-picture", {
            jsonapi: { version: "1.0" },
            data: {
                type: "profile_picture",
                attributes: {
                    imageBase64: "AAA",
                    format: "png",
                    userId: 7,
                    levelId: 3,
                    createdAt: "2026-11-18T19:00:00",
                },
            },
        });

        const picture = await Api.generateProfilePicture(3);

        expect(fake.last("POST", "/images/generate-profile-picture")?.body).toEqual({ level_id: 3 });
        expect(picture.imageBase64).toBe("AAA");
        expect(picture.levelId).toBe(3);
    });
});
