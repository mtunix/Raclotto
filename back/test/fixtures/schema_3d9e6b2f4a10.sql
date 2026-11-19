-- The schema create_all built at revision 3d9e6b2f4a10, before pan.snacked, achievement.is_global
-- and the insult table left the models.

CREATE TABLE achievement (
	id INTEGER NOT NULL,
	title VARCHAR,
	description VARCHAR,
	value INTEGER,
	hidden BOOLEAN,
	is_global BOOLEAN NOT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE event (
	id INTEGER NOT NULL,
	session_id INTEGER NOT NULL,
	event_type VARCHAR NOT NULL,
	message VARCHAR NOT NULL,
	data JSON,
	created_at DATETIME NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(session_id) REFERENCES session (id)
);

CREATE TABLE event_config (
	id INTEGER NOT NULL,
	event_type VARCHAR NOT NULL,
	session_id INTEGER,
	enabled BOOLEAN NOT NULL,
	frequency_minutes INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(session_id) REFERENCES session (id)
);

CREATE TABLE ingredient (
	id INTEGER NOT NULL,
	type VARCHAR(5) NOT NULL,
	available BOOLEAN NOT NULL,
	meat BOOLEAN NOT NULL,
	vegetarian BOOLEAN NOT NULL,
	vegan BOOLEAN NOT NULL,
	fish BOOLEAN NOT NULL,
	gluten BOOLEAN NOT NULL,
	histamine BOOLEAN NOT NULL,
	fructose BOOLEAN NOT NULL,
	lactose BOOLEAN NOT NULL,
	spicy INTEGER NOT NULL,
	wildcard BOOLEAN NOT NULL,
	sweet BOOLEAN NOT NULL,
	name VARCHAR,
	session_id INTEGER NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT check_not_meat_and_other_categories CHECK (NOT (meat AND (vegetarian OR vegan OR fish))),
	CONSTRAINT check_not_vegetarian_and_other_categories CHECK (NOT (vegetarian AND (vegan OR fish))),
	CONSTRAINT check_not_vegan_and_fish CHECK (NOT (vegan AND fish)),
	CONSTRAINT check_at_least_one_category CHECK (vegetarian OR vegan OR meat OR fish),
	CONSTRAINT check_spicy_range CHECK (spicy >= 0 AND spicy <= 3),
	FOREIGN KEY(session_id) REFERENCES session (id)
);

CREATE TABLE insult (
	id INTEGER NOT NULL,
	title VARCHAR,
	PRIMARY KEY (id)
);

CREATE TABLE invite_token (
	id INTEGER NOT NULL,
	token VARCHAR NOT NULL,
	email VARCHAR NOT NULL,
	created_by_user_id INTEGER NOT NULL,
	created_at DATETIME NOT NULL,
	expires_at DATETIME NOT NULL,
	is_used BOOLEAN NOT NULL,
	used_at DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(created_by_user_id) REFERENCES user (id)
);

CREATE TABLE level (
	id INTEGER NOT NULL,
	name VARCHAR NOT NULL,
	label_en VARCHAR NOT NULL,
	label_de VARCHAR NOT NULL,
	required_experience INTEGER NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (name)
);

CREATE TABLE pan (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	timestamp DATETIME NOT NULL,
	snacked BOOLEAN NOT NULL,
	preparation_type_id INTEGER,
	cheese_level INTEGER,
	rolled_preparation_type BOOLEAN NOT NULL,
	rolled_cheese BOOLEAN NOT NULL,
	name VARCHAR,
	session_id INTEGER NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(preparation_type_id) REFERENCES preparation_type (id),
	FOREIGN KEY(session_id) REFERENCES session (id)
);

CREATE TABLE pan_ingredients (
	pan_id INTEGER NOT NULL,
	ingredient_id INTEGER NOT NULL,
	PRIMARY KEY (pan_id, ingredient_id),
	FOREIGN KEY(pan_id) REFERENCES pan (id),
	FOREIGN KEY(ingredient_id) REFERENCES ingredient (id)
);

CREATE TABLE preparation_type (
	id INTEGER NOT NULL,
	name VARCHAR NOT NULL,
	session_id INTEGER,
	PRIMARY KEY (id)
);

CREATE TABLE profile_picture_history (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	profile_picture VARCHAR,
	level_id INTEGER,
	created_at DATETIME NOT NULL,
	is_candidate BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(level_id) REFERENCES level (id)
);

CREATE TABLE rating (
	id INTEGER NOT NULL,
	rating INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	pan_id INTEGER NOT NULL,
	session_id INTEGER NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(pan_id) REFERENCES pan (id),
	FOREIGN KEY(session_id) REFERENCES session (id)
);

CREATE TABLE session (
	id INTEGER NOT NULL,
	"key" VARCHAR NOT NULL,
	name VARCHAR NOT NULL,
	timestamp DATETIME NOT NULL,
	active BOOLEAN NOT NULL,
	created_by_user_id INTEGER,
	PRIMARY KEY (id),
	UNIQUE ("key"),
	FOREIGN KEY(created_by_user_id) REFERENCES user (id)
);

CREATE TABLE user (
	id INTEGER NOT NULL,
	name VARCHAR NOT NULL,
	email VARCHAR,
	password VARCHAR NOT NULL,
	meat BOOLEAN NOT NULL,
	vegetarian BOOLEAN NOT NULL,
	vegan BOOLEAN NOT NULL,
	fish BOOLEAN NOT NULL,
	histamine BOOLEAN NOT NULL,
	fructose BOOLEAN NOT NULL,
	lactose BOOLEAN NOT NULL,
	gluten BOOLEAN NOT NULL,
	color VARCHAR,
	language VARCHAR NOT NULL,
	is_admin BOOLEAN NOT NULL,
	token_version INTEGER NOT NULL,
	border_style VARCHAR,
	border_texture VARCHAR,
	glow_effect BOOLEAN,
	experience_points INTEGER NOT NULL,
	level_id INTEGER,
	PRIMARY KEY (id),
	UNIQUE (name),
	UNIQUE (email),
	FOREIGN KEY(level_id) REFERENCES level (id)
);

CREATE TABLE user_achievement_progress (
	user_id INTEGER NOT NULL,
	achievement_id INTEGER NOT NULL,
	progress_value FLOAT NOT NULL,
	updated_at DATETIME NOT NULL,
	PRIMARY KEY (user_id, achievement_id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(achievement_id) REFERENCES achievement (id)
);

CREATE TABLE user_achievements (
	user_id INTEGER NOT NULL,
	achievement_id INTEGER NOT NULL,
	PRIMARY KEY (user_id, achievement_id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(achievement_id) REFERENCES achievement (id)
);

CREATE TABLE user_event_dismissals (
	user_id INTEGER NOT NULL,
	event_id INTEGER NOT NULL,
	PRIMARY KEY (user_id, event_id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(event_id) REFERENCES event (id)
);

CREATE TABLE user_sessions (
	user_id INTEGER NOT NULL,
	session_id INTEGER NOT NULL,
	joined_at DATETIME NOT NULL,
	PRIMARY KEY (user_id, session_id),
	FOREIGN KEY(user_id) REFERENCES user (id),
	FOREIGN KEY(session_id) REFERENCES session (id)
);

CREATE UNIQUE INDEX ix_invite_token_token ON invite_token (token);

