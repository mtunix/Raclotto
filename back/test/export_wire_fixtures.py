"""Writes real responses of the typed endpoints as frontend test fixtures.

    venv/bin/python -m back.test.export_wire_fixtures

The fixtures are typed with the generated DTOs, so `tsc` rejects them once the wire shape and the
generated client disagree. Rerun after changing a DTO and regenerating the client.
"""

import json
from pathlib import Path

from back.src.auth.password import hash_password
from back.src.driver.database import db
from back.src.entity.ingredient import IngredientType
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User
from back.src.interactor.profile_pictures import GeminiImageGenerator, set_image_generator
from back.test.support import AppTest

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "front/src/lib/api/__fixtures__/backendResponses.ts"


class _FixedImage:
    """Stands in for Gemini: the fixtures never reach the network."""

    available = True

    def generate(self, contents: list) -> str:
        return "iVBORw0KGgo="


class _Recorder(AppTest):
    def runTest(self):
        pass

    def ok(self, response, status: int = 200):
        assert response.status_code == status, response.json
        return response.json

    def record(self) -> dict:
        # 95 XP: the next roll crosses into the second level.
        ana = self.make_user(
            "Ada",
            experience_points=95,
            meat=True,
            color="#ff8800",
            border_style="dashed",
            border_texture="cheese",
            glow_effect=True,
        )
        ana.email = "ada@example.com"
        ana.password = hash_password("secret")
        ben = self.make_user("Ben", meat=True)
        session = self.make_session("s1", creator=ana)
        db.session.add(ProfilePictureHistory(user_id=ana.id, profile_picture="/static/pictures/ada.png"))
        db.session.commit()
        self.make_ingredient(session, "Potato", IngredientType.FILL, vegan=True)
        self.make_ingredient(session, "Pork", IngredientType.FILL, meat=True, spicy=2)
        self.make_ingredient(session, "Aioli", IngredientType.SAUCE, vegetarian=True, lactose=True)
        query = {"session_key": session.key}

        self.ok(self.call("POST", "/pans/generate", ben, body={"num_fill": 1, "num_sauce": 1}, query=query))
        # Ben's pan rolled just before makes this roll a pan swap.
        roll = self.ok(
            self.call(
                "POST",
                "/pans/generate",
                ana,
                body={"num_fill": 2, "num_sauce": 1, "roll_prep_type": True, "roll_cheese": True},
                query=query,
            )
        )
        rating = self.ok(self.call("POST", "/ratings", ben, body={"pan_id": roll["pan"]["id"], "rating": 4.5}))
        page = self.ok(self.call("GET", "/pans", ana, query={**query, "limit": 1}))
        filter_options = self.ok(self.call("GET", "/pans/filters", ana, query=query))
        login = self.ok(self.call("POST", "/auth/login", body={"name_or_email": "Ada", "password": "secret"}))
        me = self.ok(self.call("GET", "/auth/me", ana))
        profile = self.ok(self.call("GET", f"/users/{ana.id}", ben))
        stats = self.ok(self.call("GET", f"/users/{ana.id}/stats", ben))
        invite = self.ok(self.call("POST", "/invites", ana, body={"email": "carl@example.com"}))
        invite_lookup = self.ok(self.call("GET", f"/auth/invite/{invite['token']}"))

        session_dto = self.ok(self.call("GET", "/sessions/by-key", ana, query=query))
        sessions = self.ok(self.call("GET", "/sessions", ana))
        prep_types = self.ok(self.call("GET", "/preparation_type", ana, query=query))
        ingredient = self.ok(
            self.call(
                "POST",
                "/ingredients",
                ana,
                body={"name": "Leek", "type": 1, "vegan": True, "spicy": 1},
                query=query,
            )
        )
        # A vegan: the meat and the vegetarian sauce are not for her.
        cleo = self.make_user("Cleo", vegetarian=False)
        ingredients = self.ok(self.call("GET", "/ingredients", cleo, query=query))
        counts = self.ok(self.call("GET", "/ingredients/available-counts", cleo, query=query))
        export = self.ok(self.call("GET", "/ingredients/export", ana, query=query))
        imported = self.ok(
            self.call(
                "POST",
                "/ingredients/import",
                ana,
                body={"ingredients": [{"name": "Corn", "type": 1, "vegan": True}]},
                query=query,
            ),
            status=201,
        )
        kept = [i for i in export["ingredients"] if i["name"] != "Leek"]
        reimported = self.ok(
            self.call(
                "POST",
                "/ingredients/reimport",
                ana,
                body={"ingredients": [*kept, {"name": "Chili", "type": 2, "vegan": True, "spicy": 3}]},
                query=query,
            )
        )

        achievements = self.ok(self.call("GET", "/achievements", ana))
        leaderboard = self.ok(self.call("GET", "/achievements/leaderboard", ana))
        events = self.ok(self.call("GET", "/events", ben, query=query))
        event_config = self.ok(
            self.call(
                "POST",
                "/events/configs",
                ana,
                body={"event_type": "pan_swap", "enabled": False, "frequency_minutes": 30, "session_key": session.key},
            )
        )
        event_configs = self.ok(self.call("GET", "/events/configs", ana, query=query))
        dashboard = self.ok(self.call("GET", "/stats", ana, query=query))
        ingredient_of_the_hour = self.ok(self.call("GET", "/events/ingredient-of-the-hour", ana, query=query))
        recap = self.ok(self.call("GET", "/sessions/recap", ben, query=query))
        previous = set_image_generator(_FixedImage())
        try:
            image_generation = self.ok(self.call("GET", "/images/generation", ana))
            generated = self.ok(self.call("POST", "/images/generate-profile-picture", ana, body={}))
            set_image_generator(GeminiImageGenerator(api_key=None))
            image_generation_unavailable = self.ok(self.call("GET", "/images/generation", ana))
        finally:
            set_image_generator(previous)
        picture_history = self.ok(self.call("GET", f"/images/profile-picture-history/{ana.id}", ben))
        dora = self.make_user("Dora", is_admin=True)
        users = self.ok(self.call("GET", "/users", dora))
        granted = self.ok(self.call("PATCH", f"/users/{ben.id}", dora, body={"is_admin": True}))
        prep_type = self.ok(self.call("POST", "/preparation_type", ana, body={"name": "Grill"}, query=query))
        # Last, so Carl shows up in none of the lists above.
        registration = self.ok(
            self.call(
                "POST",
                "/auth/register",
                body={"token": invite["token"], "email": "carl@example.com", "name": "Carl", "password": "carl-secret"},
            )
        )
        carl = db.session.get(User, registration["user"]["id"])
        # The diet the registration page saves right after, with fish ticked.
        diet = dict.fromkeys(["vegetarian", "vegan", "fish", "gluten", "histamine", "fructose", "lactose"], True)
        registered_me = self.ok(self.call("PATCH", "/auth/me", carl, body={"meat": False, **diet}))

        assert roll["reward"]["leveled_up"] and roll["events"] and roll["achievements"], roll
        assert {a["unlocked"] for a in achievements} == {True, False}, achievements
        assert any(a["progress"] is not None for a in achievements), achievements
        assert leaderboard[0]["name"] == "Ada" and leaderboard[0]["total_points"] > 0, leaderboard
        assert events and events[0]["id"] == roll["events"][0]["id"], events
        assert dashboard["pans"][0]["author"] and dashboard["ingredients_top_rated"], dashboard
        assert recap["best_pan"] and recap["boldest_pan"] and len(recap["participants"]) == 2, recap
        assert image_generation["available"] and not image_generation_unavailable["available"]
        assert picture_history[0]["id"] == generated["id"] and len(picture_history) == 2, picture_history
        assert page["has_more"] and page["items"][0]["ratings"], page
        assert len(filter_options["users"]) == 2 and filter_options["ratings"], filter_options
        assert me["level"] == roll["reward"]["level"] and me["next_level"], me
        assert profile["achievements"] and "email" not in profile, profile
        assert stats["best_rated_ingredient"] and stats["most_ingredients_pan"], stats
        assert {p["session_id"] for p in prep_types} == {None}, prep_types
        assert prep_type["session_id"] == session.id, prep_type
        assert registered_me["fish"] and not registration["user"]["fish"], registered_me
        assert ingredient_of_the_hour["ingredient"], ingredient_of_the_hour
        assert {i["applicable"] for i in ingredients} == {True, False}, ingredients
        assert counts["fill_count"] < counts["total_fill_count"], counts
        assert (reimported["created"], reimported["deleted"]) == (1, 2), reimported
        assert [u["is_admin"] for u in users] == [False, False, False, True] and granted["is_admin"], users
        return {
            "rollOutcome": ("RollOutcomeDto", roll),
            "rating": ("RatingDto", rating),
            "panPage": ("PanPageDto", page),
            "panFilterOptions": ("PanFilterOptionsDto", filter_options),
            "loginResult": ("AuthResultDto", login),
            "me": ("MeDto", me),
            "userProfile": ("UserProfileDto", profile),
            "userStats": ("UserStatsDto", stats),
            "invite": ("InviteDto", invite),
            "inviteLookup": ("InviteLookupDto", invite_lookup),
            "registration": ("AuthResultDto", registration),
            "registeredMe": ("MeDto", registered_me),
            "session": ("SessionDto", session_dto),
            "sessions": ("SessionDto[]", sessions),
            "prepTypes": ("PrepTypeDto[]", prep_types),
            "prepType": ("PrepTypeDto", prep_type),
            "ingredient": ("IngredientDto", ingredient),
            "ingredientsForUser": ("IngredientForUserDto[]", ingredients),
            "availableCounts": ("AvailableCountsDto", counts),
            "ingredientExport": ("IngredientExportDto", export),
            "ingredientImport": ("IngredientImportDto", imported),
            "ingredientReimport": ("IngredientReimportDto", reimported),
            "achievementStatuses": ("AchievementStatusDto[]", achievements),
            "leaderboard": ("LeaderboardEntryDto[]", leaderboard),
            "events": ("EventDto[]", events),
            "eventConfig": ("EventConfigDto", event_config),
            "eventConfigs": ("EventConfigDto[]", event_configs),
            "stats": ("StatsDto", dashboard),
            "ingredientOfTheHour": ("IngredientOfTheHourDto", ingredient_of_the_hour),
            "sessionRecap": ("SessionRecapDto", recap),
            "imageGeneration": ("ImageGenerationDto", image_generation),
            "imageGenerationUnavailable": ("ImageGenerationDto", image_generation_unavailable),
            "generatedPicture": ("GeneratedPictureDto", generated),
            "pictureHistory": ("ProfilePictureDto[]", picture_history),
            "users": ("UserAccountDto[]", users),
            "grantedAdmin": ("UserAccountDto", granted),
        }


def render(fixtures: dict) -> str:
    types = sorted({dto.removesuffix("[]") for dto, _ in fixtures.values()})
    lines = [
        "// Generated by `venv/bin/python -m back.test.export_wire_fixtures` from real backend responses.",
        f'import type {{ {", ".join(types)} }} from "../../../api/generated/model";',
    ]
    for name, (dto, body) in fixtures.items():
        lines += ["", f"export const {name}: {dto} = {json.dumps(body, indent=2, sort_keys=True)};"]
    return "\n".join(lines) + "\n"


def main() -> None:
    recorder = _Recorder()
    recorder.setUp()
    try:
        fixtures = recorder.record()
    finally:
        recorder.tearDown()
    FIXTURE_PATH.write_text(render(fixtures))
    print(f"wrote {FIXTURE_PATH}")


if __name__ == "__main__":
    main()
