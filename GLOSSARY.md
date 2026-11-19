# Raclotto

A raclette lottery: people at one table join a session, roll pans of random ingredients from the
session's catalog, eat and rate them, and earn XP, levels and achievements. Each term below is
the word the code uses; "Code" names the entity, DTO or module where it differs, "UI" the English
app wording where that differs.

## Sessions and people

**Session**:
One raclette evening: its name, its ingredient catalog, its pans, ratings and events.
Code: `RaclottoSession` (table `session`), `SessionDto`.
_Avoid_: raclotto, evening, game

**Session key**:
The session's unique, generated identifier; the API addresses a session by it (`session_key`),
and so does the recap's URL. The app's other session URLs use the numeric id.

**Creator**:
The user who created a session; it is theirs to rename, close, reactivate, delete and configure
events for. A session without a creator can only be managed by an admin.
Code: `created_by_user_id`, `Permissions.manage_session`.
_Avoid_: owner, host

**Active / closed**:
A session is active until it is closed; a closed session is inactive and can be reactivated.
Code: `active`, `closeSession`, `reactivateSession`. Closing reports `SessionClosed`.
UI: "End Session", "Evening Over", "(Inactive)"; reactivating is offered as "Join & Reactivate"
to whoever may manage the session, everyone else sees only its recap.
_Avoid_: ended, archived, deleted (deleting is separate and removes the session)

**Participant**:
A user who belongs to a session. A user becomes a member the first time they roll a pan there;
choosing a session in the app does not by itself make them one.
Code: the `user_sessions` table (`User.sessions`); `Participant` in the recap.
_Avoid_: player, guest

**Admin**:
A user who may change every session and pan, and the global settings: global event configs,
default preparation types and insults.
Code: `User.is_admin`; the first admin comes from `RACLOTTO_ADMIN_PASSWORD`.

**Invite**:
A single-use token that lets one email address register. It expires (7 days by default) and its
creator can revoke it until it is used. Any signed-in user can issue one.
Code: `InviteToken`, `InviteDto`, `Accounts.invite` / `register` / `revoke`. UI: "Invite Token".

**Insult**:
A name from an admin-maintained list. Anyone signed in can read the list; no view in the app shows it.
Code: `Insult`, `InsultDto`.

## Ingredients

**Ingredient**:
One thing that can go into a pan. It belongs to exactly one session's catalog.
Code: `Ingredient`, `IngredientDto`; `IngredientForUserDto` adds whether the user's diet allows it
(`applicable`). UI: "Not applicable for your diet".

**Catalog**:
All ingredients of one session. It can be exported, imported (every item added as new) and
reimported (listed ones updated, new ones created, unlisted ones made unavailable).
Code: `IngredientCatalog`, `IngredientExportDto`. Changes report `IngredientAdded` or `CatalogChanged`.

**Available**:
Whether rolls may draw an ingredient. Deleting an ingredient makes it unavailable; it stays in the
catalog and in its pans. Refilling makes it available again.
Code: `available`, `deleteIngredient`, `refillIngredient`. UI: "Unavailable", "Mark unavailable",
"Make available again".

**Ingredient type**:
Fill or sauce; every ingredient is one of the two, and a roll draws each type separately.
Code: `IngredientType.FILL` / `IngredientType.SAUCE`.

**Fill**:
An ingredient of type fill. UI: "Ingredients" next to "Sauces"; the rules say "fillings".
_Avoid_: filling, topping

**Sauce**:
An ingredient of type sauce.

**Category**:
Which diet an ingredient suits: exactly one of meat, vegetarian, vegan or fish. On an ingredient
the four are mutually exclusive; see Diet for how they read on a user.
Code: the `meat`, `vegetarian`, `vegan`, `fish` flags; `category_problem`.

**Allergen**:
A substance an ingredient contains: histamine, fructose, lactose or gluten. Any number may apply.
Code: the substance flags (`SUBSTANCES` in `diet.py`). UI: "Allergens", "Contains".
_Avoid_: intolerance (that is the user's side, see Diet)

**Tag**:
The UI's name for the category and allergen labels shown on an ingredient (`tags.*` in the
translations). Not a separate concept in the code.

**Spicy**:
An ingredient's heat, 0 to 3. A pan counts as spicy for XP when an ingredient has 2 or more.

**Sweet**:
A flag on an ingredient; together with spicy it raises a pan's XP.

**Wildcard**:
A flag on an ingredient that raises the XP of any pan it is in.

## Diet

**Diet**:
What a user eats, and the one rule for which ingredients that allows. Unlike an ingredient's
category, a user's diet is a hierarchy: meat ⇒ vegetarian ⇒ vegan; fish is independent. An
empty diet counts as vegetarian. On a user the allergen flags mean "tolerates".
An ingredient fits when none of its category or allergen flags is one the diet lacks.
Code: `Diet` (`allows`, `ingredient_filter`), the same flags on `User`. UI: "All OK to Snack".

## Pans and rolls

**Pan**:
One plate of ingredients a user rolled (or picked) in a session, with its name, author,
optional preparation type and cheese level, and its ratings.
Code: `Pan`, `PanDto`. Without a name given, it gets a random "<Adjective> Raclotto Pan".
_Avoid_: dish, plate, result

**Author**:
The user a pan belongs to: the one who rolled it. It is theirs to rename, mark eaten and delete.
Code: `Pan.user_id`, `PanDto.author`. UI: "Consumed by".

**Snacked**:
Whether a pan has been eaten. Settable through the API; no view in the app shows it.
Code: `Pan.snacked`.

**Roll**:
Making a pan: choosing its ingredients, optionally rolling preparation type and cheese, joining
the session, awarding XP, firing events and judging achievements, all at once.
Code: `PanRoll.roll`, `RollOptions`, `RollOutcome` / `RollOutcomeDto`. UI: "Generate", "Shuffle".
_Avoid_: generate (only the route and the button say it)

**Classic roll**:
A roll with a fixed number of fills and sauces (3 and 2 by default), drawn at random from those
available and allowed by the roller's diet, each capped at what there is.
Code: `num_fill` / `num_sauce`, `rollPan`, `POST /pans/generate`. UI: "Legacy".

**Bandit roll**:
A roll with a number of columns; the split into fills and sauces is random too, with at least one
of each when both exist and there are two or more columns.
Code: `total_columns`, `split_columns`, `rollBanditPan`. UI: "Bandit", "Pull the Lever!".

**Hand-picked pan**:
A pan made from chosen ingredient ids of the session, without the diet or availability filter.
The app uses it to clone a pan from the history.
Code: `ingredient_ids`, `createPan`. UI: "I want this too", "Clone Pan".

**Preparation type**:
How a pan is cooked. Default types belong to no session and are an admin's to change; a session
can add its own. A roll can pick one at random, which raises the pan's XP.
Code: `PreparationType` (`session_id` null for defaults), `PrepTypeDto`, `rolled_preparation_type`.

**Cheese level**:
How much cheese goes on a pan, 0 to 9, set only when the roll rolls it; rolling it raises the XP.
Code: `cheese_level`, `rolled_cheese`. UI: "Roll Cheese", "Cheese Level".

## Ratings and progress

**Rating**:
One user's stars for one pan: 0 to 5 in half steps (the app offers whole stars right after a roll,
half stars in the history; clicking the given stars again clears them to 0). A user
has at most one rating per pan, which only they can change or withdraw. A pan's rating is the
average of its stars.
Code: `Rating`, `RatingDto`, `PanRatings`; a change of stars reports `PanRated`.
_Avoid_: score, review

**XP**:
Experience points a pan earns its author when rolled: 10 plus 5 to 13 per ingredient (more per
ingredient the fuller the pan), times the highest combination bonus (wildcard with spicy ×1.7,
wildcard ×1.5, spicy with sweet ×1.25), times ×1.1 for a rolled preparation type and ×1.2 for
rolled cheese.
Code: `User.experience_points`, `Levels.xp_for`. UI: "Experience Points".
_Avoid_: points (those are achievement points)

**Level**:
A named rank reached at a required amount of XP; there are 20. New users start at the lowest.
Higher levels unlock pan card decorations (border style at 3, texture at 5, glow at 7), and each
level-up offers a new generated profile picture, where the server can generate one.
Code: `Level`, `LevelDto` (`name` is a translation key, `label_en` / `label_de`), `Levels`.
_Avoid_: rank

**Reward**:
What a roll earned its roller: XP before and after, the previous, current and next level, and
whether they leveled up.
Code: `Reward`, `RewardDto`, part of `RollOutcome`.

**Achievement**:
A titled goal worth a number of points; some are hidden until unlocked. A user holds it or not,
and may have progress (0 to 1) towards it. Seed data marks each as global or session-specific.
Code: `Achievement` (`value` = points, `hidden`, `is_global`), `AchievementStatusDto`,
`UserAchievementProgress`. The leaderboard sums points.

**Fact**:
Something that happened in a session, reported to achievements and events: a pan rolled, a pan
rated, an ingredient added, the catalog changed, the session closed.
Code: `PanRolled`, `PanRated`, `IngredientAdded`, `CatalogChanged`, `SessionClosed` (`facts.py`).
_Avoid_: event (that is the session event below), trigger

**Evaluator**:
The rule behind one achievement or one event type. An achievement evaluator declares which facts
it reacts to, whom it judges (the actor, the pan's author, every participant, or the author of the
session's last pan) and whether the achievement is revocable.
Code: `AchievementEvaluator`, `EventEvaluator`, keyed by achievement title or `event_type`.

**Revocable**:
An achievement its holder loses again when the evaluator no longer finds it earned
("King of the Grill", "King of the Sauce").

**Event**:
An announcement to a session's table that fires on a fact; each user can dismiss it for themselves.
Code: `Event`, `EventDto`, `EventType`, `Events`.
_Avoid_: notification

**Pan swap**:
The one event type: two different users rolled pans within 10 minutes of each other and swap them.
Code: `pan_swap`, `PanSwapEvaluator`.

**Cooldown**:
How long a session waits before an event type can fire again: the evaluator's default (1 hour)
unless the effective config sets a frequency.

**Frequency**:
A config's cooldown in minutes. Code: `frequency_minutes`.

**Event config**:
Whether an event type is enabled, and its frequency. The global config (an admin's) applies unless
the session has its own (the creator's), which overrides it.
Code: `EventConfig` (`session_id` null for global), `EventConfigDto`. UI: "Global Default".

**Recap**:
What a session came to: pan and rating counts, the best and worst rated pan, the boldest pan
(most XP), the favorite ingredient, and each participant's pans, XP and stars. Shown when a session
is closed, and to anyone opening a closed session they cannot reactivate.
Code: `SessionRecaps().of`, `Recap`, `SessionRecapDto`.

## Profile pictures

**Profile picture**:
The picture a user shows: the newest entry of their picture history.
Code: `User.get_profile_picture`, `ProfilePictureDto`.

**Picture history**:
Every picture a user has had, uploaded or generated, each with the level it belongs to.
Code: `ProfilePictureHistory`, `getProfilePictureHistory`. UI: "Profile Picture History".

**Generated picture**:
A picture drawn by the image model, either for a level (from the generation candidate) or from a
free prompt, and added to the history. Without an image model (no `GOOGLE_GENAI_API_KEY`) the
server can't generate any: it says so (`getImageGeneration`) and answers generation with a 503.
Code: `ProfilePictures.generate_for_level` / `generate_from_prompt`, `ImageGenerator`.

**Generation candidate**:
The picture of a user's history that the next level picture is drawn from; their first picture
until they choose another.
Code: `ProfilePictureHistory.is_candidate`, `setCandidatePicture`. UI: "Generation Candidate".
