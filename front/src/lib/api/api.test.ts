import { FakeTransport } from "./fakeTransport";
import { setTransport, Transport } from "./transport";
import { achievementResource } from "./__fixtures__/wire";

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
