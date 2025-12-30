from datetime import datetime

from flask import request

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.jwt import generate_token
from back.src.auth.middleware import get_current_user, require_auth
from back.src.auth.password import hash_password, verify_password
from back.src.driver.database import db
from back.src.entity.invite_token import InviteToken
from back.src.entity.user import User
from back.src.repository.invite_token_repository import InviteTokenRepository
from back.src.repository.profile_picture_history_repository import (
    ProfilePictureHistoryRepository,
)
from back.src.repository.user_repository import UserRepository


class AuthApi(BaseApi):
    url_prefix = "/auth"

    def __init__(self):
        super().__init__()
        self.user_repository = UserRepository()
        self.invite_token_repository = InviteTokenRepository()

    @BaseApi.endpoint("/register", ["POST"])
    def register(self):
        """Register a new user with an invite token.

        Request body should contain:
        - token: The invite token
        - email: User's email
        - name: User's name
        - password: User's password

        :returns User: Created user object
        :status_code 201: User created successfully
        :status_code 400: Invalid request or token
        """
        data = request.json.get("data", {}).get("attributes", {})
        token_str = data.get("token")
        email = data.get("email")
        name = data.get("name")
        password = data.get("password")

        if not all([token_str, email, name, password]):
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required fields",
                detail="token, email, name, and password are required",
            )

        # Find and validate invite token
        invite_token = self.invite_token_repository.by_token(token_str)
        if not invite_token:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The provided invite token does not exist",
            )

        if not invite_token.is_valid():
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The invite token has already been used or has expired",
            )

        if invite_token.email.lower() != email.lower():
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Email mismatch",
                detail="The provided email does not match the invite token's email",
            )

        # Check if user with email or name already exists
        existing_user = self.user_repository.by_email(email)
        if not existing_user:
            existing_user = self.user_repository.by_name(name)
        if existing_user:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="User already exists",
                detail="A user with this email or name already exists",
            )

        # Get optional profile_picture
        profile_picture = data.get("profile_picture")

        # Get the first level (Novice) for new users
        from back.src.repository.level_repository import LevelRepository

        level_repository = LevelRepository()
        first_level = (
            level_repository.all_ordered()[0]
            if level_repository.all_ordered()
            else None
        )

        # Create new user
        user = User(
            name=name,
            email=email,
            password=hash_password(password),
            experience_points=0,
            level_id=first_level.id if first_level else None,
        )
        db.session.add(user)
        db.session.flush()  # Get user.id

        # Add initial profile picture to history if provided
        if profile_picture:
            history_repo = ProfilePictureHistoryRepository()
            history_repo.add_profile_picture(
                user_id=user.id,
                profile_picture_url=profile_picture,
                level_id=first_level.id if first_level else None,
            )

        # Mark invite token as used
        invite_token.mark_as_used()
        db.session.commit()

        # Generate JWT token
        from flask import current_app

        secret_key = current_app.config.get("JWT_SECRET_KEY")
        jwt_token = generate_token(user.id, secret_key)

        # Return dict with jsonapi structure - serialize_wrapper will detect and return as-is
        return {
            "jsonapi": {"version": "1.0"},
            "data": {
                "type": "user",
                "id": user.id,
                "attributes": {
                    "name": user.name,
                    "email": user.email,
                    "profile_picture": user.get_profile_picture(),
                },
            },
            "meta": {"token": jwt_token},
        }

    @BaseApi.endpoint("/login", ["POST"])
    def login(self):
        """Login with email/name and password.

        Request body should contain:
        - email: User's email or name
        - password: User's password

        :returns User: User object with JWT token
        :status_code 200: Login successful
        :status_code 401: Invalid credentials
        """
        data = request.json.get("data", {}).get("attributes", {})
        email_or_name = data.get("email") or data.get("name")
        password = data.get("password")

        if not email_or_name or not password:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required fields",
                detail="email/name and password are required",
            )

        # Find user by email or name
        user = self.user_repository.by_email_or_name(email_or_name)

        if not user or not verify_password(password, user.password):
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid credentials",
                detail="Invalid email/name or password",
            )

        # Generate JWT token
        from flask import current_app

        secret_key = current_app.config.get("JWT_SECRET_KEY")
        jwt_token = generate_token(user.id, secret_key)

        # Return dict with jsonapi structure - serialize_wrapper will detect and return as-is
        return {
            "jsonapi": {"version": "1.0"},
            "data": {
                "type": "user",
                "id": user.id,
                "attributes": {
                    "name": user.name,
                    "email": user.email,
                    "profile_picture": user.get_profile_picture(),
                },
            },
            "meta": {"token": jwt_token},
        }

    @BaseApi.endpoint("/me", ["GET"])
    @require_auth
    def me(self):
        """Get current authenticated user information.

        :returns User: Current user object
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from back.src.api.constants import JSONAPI_VERSION
        from back.src.api.serializer import serialize_entity

        user = get_current_user()
        # Serialize user but exclude password
        entity_data = serialize_entity(user, "user")
        if entity_data and "attributes" in entity_data:
            # Remove password from attributes for security
            entity_data["attributes"].pop("password", None)
            # Also remove relationships that shouldn't be exposed
            entity_data["attributes"].pop("sessions", None)
            entity_data["attributes"].pop("achievements", None)
            # Include level information
            from back.src.repository.level_repository import LevelRepository

            level_repository = LevelRepository()

            if user.level:
                current_level = user.level
                next_level = level_repository.next_level(current_level)
                entity_data["attributes"]["level"] = {
                    "id": current_level.id,
                    "name": current_level.name,
                    "required_experience": current_level.required_experience,
                }
                if next_level:
                    entity_data["attributes"]["next_level"] = {
                        "id": next_level.id,
                        "name": next_level.name,
                        "required_experience": next_level.required_experience,
                    }
            else:
                # If user has no level, assign the first level (Novice)
                first_level = (
                    level_repository.all_ordered()[0]
                    if level_repository.all_ordered()
                    else None
                )
                if first_level:
                    user.level_id = first_level.id
                    db.session.commit()
                    entity_data["attributes"]["level"] = {
                        "id": first_level.id,
                        "name": first_level.name,
                        "required_experience": first_level.required_experience,
                    }
                    next_level = level_repository.next_level(first_level)
                    if next_level:
                        entity_data["attributes"]["next_level"] = {
                            "id": next_level.id,
                            "name": next_level.name,
                            "required_experience": next_level.required_experience,
                        }

        return {"jsonapi": {"version": JSONAPI_VERSION}, "data": entity_data}

    @BaseApi.endpoint("/invite/<string:token>", ["GET"])
    def get_invite(self, token: str):
        """Fetch invite token details by token string for registration.

        This is used by the registration page to prefill email when a user
        opens a link like /register?token=... .

        :param token: Invite token string
        :returns InviteToken: Minimal invite token data
        :status_code 200: Success
        :status_code 400: Invalid or expired token
        """
        from back.src.api.constants import JSONAPI_VERSION

        invite_token = self.invite_token_repository.by_token(token)
        if not invite_token or not invite_token.is_valid():
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The invite token does not exist, has been used, or has expired",
            )

        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": {
                "type": "inviteToken",
                "id": invite_token.id,
                "attributes": {
                    "token": invite_token.token,
                    "email": invite_token.email,
                    "expires_at": invite_token.expires_at.isoformat(),
                    "is_used": invite_token.is_used,
                },
            },
        }

    @BaseApi.endpoint("/me", ["PATCH"])
    @require_auth
    def update_me(self):
        """Update current authenticated user information.

        Request body should contain user attributes to update:
        - name: User name (optional)
        - meat: Boolean (optional)
        - vegetarian: Boolean (optional)
        - vegan: Boolean (optional)
        - histamine: Boolean (optional)
        - fructose: Boolean (optional)
        - lactose: Boolean (optional)
        - gluten: Boolean (optional)
        - color: String (optional)
        - language: String (optional, 'en' or 'de')
        - profile_picture: String (optional, base64 encoded image)
        - border_style: String (optional, 'solid', 'dashed', 'dotted', 'double', 'ridge', 'groove', 'inset', 'outset')
        - border_texture: String (optional, 'cheese', 'bread', 'sauce-01', 'sauce-02', 'herbs-01', 'herbs-02', or null)
        - glow_effect: Boolean (optional, unlocked at level 7)

        :returns User: Updated user object
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from back.src.api.deserializer import deserialize_attributes
        from back.src.api.serializer import serialize_single
        from back.src.driver.database import db

        user = get_current_user()
        attributes = deserialize_attributes()

        # Update allowed fields
        if "name" in attributes:
            user.name = attributes["name"]
        if "meat" in attributes:
            user.meat = attributes["meat"]
        if "vegetarian" in attributes:
            user.vegetarian = attributes["vegetarian"]
        if "vegan" in attributes:
            user.vegan = attributes["vegan"]
        if "fish" in attributes:
            user.fish = attributes["fish"]
        if "histamine" in attributes:
            user.histamine = attributes["histamine"]
        if "fructose" in attributes:
            user.fructose = attributes["fructose"]
        if "lactose" in attributes:
            user.lactose = attributes["lactose"]
        if "gluten" in attributes:
            user.gluten = attributes["gluten"]
        if "color" in attributes:
            user.color = attributes["color"]
        if "language" in attributes:
            user.language = attributes["language"]
        if "profile_picture" in attributes:
            profile_picture = attributes["profile_picture"]
            # Always add to history, even if None (to track removal)
            history_repo = ProfilePictureHistoryRepository()
            history_repo.add_profile_picture(
                user_id=user.id,
                profile_picture_url=profile_picture,
                level_id=user.level_id,
            )
        if "border_style" in attributes:
            # Validate border_style (3D effects removed: ridge, groove, inset, outset)
            allowed_styles = ["solid", "dashed", "dotted", "double"]
            if attributes["border_style"] in allowed_styles:
                user.border_style = attributes["border_style"]
            else:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid border_style",
                    detail=f"border_style must be one of: {', '.join(allowed_styles)}",
                )
        if "border_texture" in attributes:
            # Validate border_texture
            allowed_textures = [
                "cheese",
                "bread",
                "sauce-01",
                "sauce-02",
                "herbs-01",
                "herbs-02",
                None,
            ]
            if (
                attributes["border_texture"] in allowed_textures
                or attributes["border_texture"] is None
            ):
                user.border_texture = attributes["border_texture"]
            else:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid border_texture",
                    detail=f"border_texture must be one of: {', '.join([t for t in allowed_textures if t])}, or null",
                )
        if "glow_effect" in attributes:
            user.glow_effect = bool(attributes["glow_effect"])

        # Enforce hierarchical logic for diet preferences (meat -> vegetarian -> vegan)
        # If meat is true, vegetarian and vegan must be true
        if user.meat:
            user.vegetarian = True
            user.vegan = True
        # If vegetarian is true, vegan must be true
        elif user.vegetarian:
            user.vegan = True
        # Ensure at least one of meat, vegetarian, or vegan is true
        if not user.meat and not user.vegetarian and not user.vegan:
            user.vegetarian = True
            user.vegan = True

        db.session.commit()

        # Serialize user but exclude password
        from back.src.api.constants import JSONAPI_VERSION
        from back.src.api.serializer import serialize_entity

        entity_data = serialize_entity(user, "user")
        if entity_data and "attributes" in entity_data:
            # Remove password from attributes for security
            entity_data["attributes"].pop("password", None)

        return {"jsonapi": {"version": JSONAPI_VERSION}, "data": entity_data}

    @BaseApi.endpoint("/refresh", ["POST"])
    @require_auth
    def refresh(self):
        """Refresh JWT token.

        :returns Token: New JWT token
        :status_code 200: Token refreshed
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        from flask import current_app

        secret_key = current_app.config.get("JWT_SECRET_KEY")
        jwt_token = generate_token(user.id, secret_key)

        # Return dict with jsonapi structure - serialize_wrapper will detect and return as-is
        return {
            "jsonapi": {"version": "1.0"},
            "data": {"type": "token", "attributes": {"token": jwt_token}},
        }


class InviteApi(BaseApi):
    url_prefix = "/invites"

    def __init__(self):
        super().__init__()
        self.invite_token_repository = InviteTokenRepository()

    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_invite(self):
        """Generate a new invite token.

        Request body should contain:
        - email: Email of the intended recipient

        :returns InviteToken: Created invite token
        :status_code 201: Invite token created
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        data = request.json.get("data", {}).get("attributes", {})
        email = data.get("email")

        if not email:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="email is required",
            )

        # Create invite token
        from flask import current_app

        expiration_days = current_app.config.get("INVITE_TOKEN_EXPIRATION_DAYS", 7)

        invite_token = InviteToken(
            token=InviteToken.generate_token(),
            email=email,
            created_by_user_id=user.id,
            expires_at=InviteToken.create_expiration_date(expiration_days),
        )
        db.session.add(invite_token)
        db.session.commit()

        return {
            "data": {
                "type": "inviteToken",
                "id": invite_token.id,
                "attributes": {
                    "token": invite_token.token,
                    "email": invite_token.email,
                    "expires_at": invite_token.expires_at.isoformat(),
                    "is_used": invite_token.is_used,
                },
            }
        }

    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_invites(self):
        """List all invite tokens created by the current user.

        :returns List[InviteToken]: List of invite tokens
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from back.src.api.serializer import serialize_collection

        user = get_current_user()
        invites = self.invite_token_repository.by_creator(user.id)

        return serialize_collection(invites, "inviteToken")

    @BaseApi.endpoint("/<int:invite_id>", ["DELETE"])
    @require_auth
    def revoke_invite(self, invite_id):
        """Revoke an unused invite token.

        :param invite_id: ID of the invite token to revoke
        :returns Success: Confirmation
        :status_code 200: Invite revoked
        :status_code 401: Not authenticated
        :status_code 404: Invite not found
        """
        user = get_current_user()
        invite = self.invite_token_repository.by_id(invite_id)
        # Verify the invite belongs to the user
        if invite and invite.created_by_user_id != user.id:
            invite = None

        if not invite:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Invite token not found",
                detail="The specified invite token does not exist or you don't have permission to revoke it",
            )

        if invite.is_used:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Cannot revoke used token",
                detail="This invite token has already been used",
            )

        db.session.delete(invite)
        db.session.commit()

        return {}, 204
