from datetime import datetime
from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.password import hash_password, verify_password
from back.src.auth.jwt import generate_token
from back.src.auth.middleware import require_auth, get_current_user
from back.src.entity.user import User
from back.src.entity.invite_token import InviteToken
from back.src.repository.user_repository import UserRepository
from back.src.repository.invite_token_repository import InviteTokenRepository
from back.src.driver.database import db


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
        data = request.json.get('data', {}).get('attributes', {})
        token_str = data.get('token')
        email = data.get('email')
        name = data.get('name')
        password = data.get('password')

        if not all([token_str, email, name, password]):
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required fields",
                detail="token, email, name, and password are required"
            )

        # Find and validate invite token
        invite_token = self.invite_token_repository.by_token(token_str)
        if not invite_token:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The provided invite token does not exist"
            )

        if not invite_token.is_valid():
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The invite token has already been used or has expired"
            )

        if invite_token.email.lower() != email.lower():
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Email mismatch",
                detail="The provided email does not match the invite token's email"
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
                detail="A user with this email or name already exists"
            )

        # Create new user
        user = User(
            name=name,
            email=email,
            password=hash_password(password)
        )
        db.session.add(user)
        db.session.flush()  # Get user.id

        # Mark invite token as used
        invite_token.mark_as_used()
        db.session.commit()

        # Generate JWT token
        from flask import current_app
        secret_key = current_app.config.get('JWT_SECRET_KEY')
        jwt_token = generate_token(user.id, secret_key)

        # Return dict with jsonapi structure - serialize_wrapper will detect and return as-is
        return {
            "jsonapi": {"version": "1.0"},
            "data": {
                "type": "user",
                "id": user.id,
                "attributes": {
                    "name": user.name,
                    "email": user.email
                }
            },
            "meta": {
                "token": jwt_token
            }
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
        data = request.json.get('data', {}).get('attributes', {})
        email_or_name = data.get('email') or data.get('name')
        password = data.get('password')

        if not email_or_name or not password:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required fields",
                detail="email/name and password are required"
            )

        # Find user by email or name
        user = self.user_repository.by_email_or_name(email_or_name)

        if not user or not verify_password(password, user.password):
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid credentials",
                detail="Invalid email/name or password"
            )

        # Generate JWT token
        from flask import current_app
        secret_key = current_app.config.get('JWT_SECRET_KEY')
        jwt_token = generate_token(user.id, secret_key)

        # Return dict with jsonapi structure - serialize_wrapper will detect and return as-is
        return {
            "jsonapi": {"version": "1.0"},
            "data": {
                "type": "user",
                "id": user.id,
                "attributes": {
                    "name": user.name,
                    "email": user.email
                }
            },
            "meta": {
                "token": jwt_token
            }
        }

    @BaseApi.endpoint("/me", ["GET"])
    @require_auth
    def me(self):
        """Get current authenticated user information.

        :returns User: Current user object
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from back.src.api.serializer import serialize_entity
        from back.src.api.constants import JSONAPI_VERSION
        
        user = get_current_user()
        # Serialize user but exclude password
        entity_data = serialize_entity(user, "user")
        if entity_data and 'attributes' in entity_data:
            # Remove password from attributes for security
            entity_data['attributes'].pop('password', None)
            # Also remove relationships that shouldn't be exposed
            entity_data['attributes'].pop('sessions', None)
            entity_data['attributes'].pop('achievements', None)
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": entity_data
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

        :returns User: Updated user object
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from back.src.api.deserializer import deserialize_attributes
        from back.src.driver.database import db
        from back.src.api.serializer import serialize_single
        
        user = get_current_user()
        attributes = deserialize_attributes()
        
        # Update allowed fields
        if 'name' in attributes:
            user.name = attributes['name']
        if 'meat' in attributes:
            user.meat = attributes['meat']
        if 'vegetarian' in attributes:
            user.vegetarian = attributes['vegetarian']
        if 'vegan' in attributes:
            user.vegan = attributes['vegan']
        if 'histamine' in attributes:
            user.histamine = attributes['histamine']
        if 'fructose' in attributes:
            user.fructose = attributes['fructose']
        if 'lactose' in attributes:
            user.lactose = attributes['lactose']
        if 'gluten' in attributes:
            user.gluten = attributes['gluten']
        if 'color' in attributes:
            user.color = attributes['color']
        
        db.session.commit()
        
        # Serialize user but exclude password
        from back.src.api.serializer import serialize_entity
        from back.src.api.constants import JSONAPI_VERSION
        
        entity_data = serialize_entity(user, "user")
        if entity_data and 'attributes' in entity_data:
            # Remove password from attributes for security
            entity_data['attributes'].pop('password', None)
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": entity_data
        }

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
        secret_key = current_app.config.get('JWT_SECRET_KEY')
        jwt_token = generate_token(user.id, secret_key)

        # Return dict with jsonapi structure - serialize_wrapper will detect and return as-is
        return {
            "jsonapi": {"version": "1.0"},
            "data": {
                "type": "token",
                "attributes": {
                    "token": jwt_token
                }
            }
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
        data = request.json.get('data', {}).get('attributes', {})
        email = data.get('email')

        if not email:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="email is required"
            )

        # Create invite token
        from flask import current_app
        expiration_days = current_app.config.get('INVITE_TOKEN_EXPIRATION_DAYS', 7)
        
        invite_token = InviteToken(
            token=InviteToken.generate_token(),
            email=email,
            created_by_user_id=user.id,
            expires_at=InviteToken.create_expiration_date(expiration_days)
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
                    "is_used": invite_token.is_used
                }
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
                detail="The specified invite token does not exist or you don't have permission to revoke it"
            )

        if invite.is_used:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Cannot revoke used token",
                detail="This invite token has already been used"
            )

        db.session.delete(invite)
        db.session.commit()

        return {}, 204
