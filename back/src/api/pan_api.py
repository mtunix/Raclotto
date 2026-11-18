from flask import request

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.api.constants import JSONAPI_VERSION
from back.src.api.deserializer import deserialize_attributes
from back.src.api.serializer import (
    serialize_collection,
    serialize_entity,
    serialize_single,
)
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.interactor.pan_roll import PanRoll, RollError, RollOptions, RollOutcome
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.session_repository import SessionRepository

_ROLL_ERRORS = {
    RollError.SESSION_NOT_FOUND: (ApiErrorCode.resource_not_found, 404, "Session not found"),
    RollError.PREPARATION_TYPE_NOT_FOUND: (ApiErrorCode.resource_not_found, 404, "Preparation type not found"),
    RollError.PREPARATION_TYPE_NOT_IN_SESSION: (ApiErrorCode.incorrect_parameters, 400, "Invalid preparation type"),
    RollError.NO_INGREDIENTS: (ApiErrorCode.incorrect_parameters, 400, "Invalid ingredient selection"),
    RollError.INVALID_OPTIONS: (ApiErrorCode.missing_required_body_field, 400, "Invalid roll options"),
}


def _level_dict(level):
    if level is None:
        return None
    return {"id": level.id, "name": level.name, "required_experience": level.required_experience}


def _serialize_outcome(outcome: RollOutcome) -> dict:
    """The pan as JSON:API data; reward, unlocked achievements and events in meta."""
    response = serialize_single(outcome.pan, "pan")
    reward = outcome.reward
    response["meta"] = {
        "newly_unlocked_achievements": serialize_collection(outcome.achievements, "achievement")["data"],
        "events": serialize_collection(outcome.events, "event")["data"],
        "reward": {
            "xp_gained": reward.xp_gained,
            "xp_before": reward.xp_before,
            "xp_after": reward.xp_after,
            "previous_level": _level_dict(reward.previous_level),
            "level": _level_dict(reward.level),
            "next_level": _level_dict(reward.next_level),
            "leveled_up": reward.leveled_up,
        },
    }
    return response


class PanApi(BaseApi):
    url_prefix = "/pans"

    def __init__(self):
        super().__init__()
        self.repository = PanRepository()
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()

    def _roll(self, options: RollOptions) -> dict:
        session_key = request.args.get("session_key")
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing session_key",
                detail="session_key query parameter is required",
            )
        try:
            outcome = PanRoll().roll(get_current_user(), session_key, options)
        except RollError as error:
            code, status, title = _ROLL_ERRORS[error.kind]
            raise ApiError(code, status=status, title=title, detail=error.detail)
        return _serialize_outcome(outcome)

    @BaseApi.endpoint("/generate", ["POST"])
    @require_auth
    def generate(self):
        """Roll a pan with a fixed number of fills and sauces.

        Query parameters:
        - session_key: Session key (required)

        Request body:
        - numFill: Number of fill ingredients (default: 3)
        - numSauce: Number of sauce ingredients (default: 2)
        - preparation_type_id: Chosen preparation type (optional)
        - roll_prep_type: Randomly pick a preparation type (optional)
        - roll_cheese: Roll a cheese level (optional)

        :returns Pan: Rolled pan; meta carries reward, newly_unlocked_achievements, events
        :status_code 200: Pan generated successfully
        :status_code 401: Not authenticated
        """
        attributes = deserialize_attributes()
        return self._roll(
            RollOptions(
                num_fill=attributes.get("numFill", 3),
                num_sauce=attributes.get("numSauce", 2),
                preparation_type_id=attributes.get("preparation_type_id"),
                roll_preparation_type=bool(attributes.get("roll_prep_type", False)),
                roll_cheese=bool(attributes.get("roll_cheese", False)),
            )
        )

    @BaseApi.endpoint("/generate/bandit", ["POST"])
    @require_auth
    def generate_bandit(self):
        """Roll a pan with a random fill/sauce split (bandit mode).

        Query parameters:
        - session_key: Session key (required)

        Request body:
        - total_columns: Total number of ingredients (required)
        - roll_prep_type: Randomly pick a preparation type (optional)
        - roll_cheese: Roll a cheese level (optional)

        :returns Pan: Rolled pan; meta carries reward, newly_unlocked_achievements, events
        :status_code 200: Pan generated successfully
        :status_code 401: Not authenticated
        :status_code 400: Missing required fields
        """
        attributes = deserialize_attributes()
        total_columns = attributes.get("total_columns")
        if total_columns is None:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="total_columns is required and must be at least 1",
            )
        return self._roll(
            RollOptions(
                total_columns=int(total_columns),
                roll_preparation_type=bool(attributes.get("roll_prep_type", False)),
                roll_cheese=bool(attributes.get("roll_cheese", False)),
            )
        )

    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_pans(self):
        """List pans, optionally filtered by session or user with pagination support.

        Query parameters:
        - session_key: Optional session key to filter by
        - user_id: Optional user ID to filter by
        - limit: Optional limit on number of results (default: all)
        - offset: Optional offset for pagination (default: 0)

        :returns dict: Response with pans data and pagination metadata
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from sqlalchemy import func

        from back.src.repository.user_repository import UserRepository

        user_repository = UserRepository()

        session_key = request.args.get("session_key")
        user_id = request.args.get("user_id", type=int)
        limit = request.args.get("limit", type=int)
        offset = request.args.get("offset", type=int, default=0)

        if session_key:
            pans = self.repository.by_session(session_key, limit=limit, offset=offset)
            # Get total count for pagination metadata
            try:
                from back.src.entity.raclotto_session import RaclottoSession

                session = (
                    db.session.query(RaclottoSession).filter_by(key=session_key).one()
                )
                total_count = (
                    db.session.query(func.count(Pan.id))
                    .filter_by(session_id=session.id)
                    .scalar()
                    or 0
                )
            except:
                total_count = len(pans)
        elif user_id:
            pans = self.repository.by_user(user_id, limit=limit, offset=offset)
            # Get total count for pagination metadata
            total_count = (
                db.session.query(func.count(Pan.id)).filter_by(user_id=user_id).scalar()
                or 0
            )
        else:
            pans = self.repository.all()
            total_count = len(pans)

        # Enrich pans with user name, color, id, and profile picture
        enriched_pans = []
        for pan in pans:
            pan_dict = serialize_entity(pan, "pan")
            if pan_dict and pan_dict.get("attributes"):
                # Get user info
                user = user_repository.by_id(pan.user_id)
                if user:
                    pan_dict["attributes"]["user"] = user.name
                    pan_dict["attributes"]["user_color"] = (
                        user.color if user.color else "#1890ff"
                    )
                    pan_dict["attributes"]["user_id"] = user.id
                    pan_dict["attributes"]["user_profile_picture"] = (
                        user.get_profile_picture()
                    )
                    pan_dict["attributes"]["user_border_style"] = (
                        user.border_style if user.border_style else "solid"
                    )
                    pan_dict["attributes"]["user_border_texture"] = (
                        user.border_texture if user.border_texture else None
                    )
                    pan_dict["attributes"]["user_glow_effect"] = (
                        bool(user.glow_effect)
                        if user.glow_effect is not None
                        else False
                    )
                else:
                    pan_dict["attributes"]["user"] = "Unknown"
                    pan_dict["attributes"]["user_color"] = "#d9d9d9"
                    pan_dict["attributes"]["user_id"] = None
                    pan_dict["attributes"]["user_profile_picture"] = None
                    pan_dict["attributes"]["user_border_style"] = "solid"
                    pan_dict["attributes"]["user_border_texture"] = None
                    pan_dict["attributes"]["user_glow_effect"] = False
            enriched_pans.append(pan_dict)

        # Calculate if there are more results
        has_more = False
        if limit is not None:
            has_more = (offset + len(pans)) < total_count

        response = {"jsonapi": {"version": JSONAPI_VERSION}, "data": enriched_pans}

        # Add pagination metadata if pagination is used
        if limit is not None:
            response["meta"] = {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": has_more,
            }

        return response

    @BaseApi.endpoint("/<int:pan_id>", ["GET"])
    @require_auth
    def get_pan(self, pan_id: int):
        """Get a pan by ID.

        :param pan_id: Pan ID
        :returns Pan: Pan
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Pan not found
        """
        from back.src.repository.user_repository import UserRepository

        user_repository = UserRepository()

        pan = self.repository.by_id(pan_id)
        if not pan:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Pan not found",
                detail="The specified pan does not exist",
            )

        # Enrich pan with user name, color, id, and profile picture
        pan_dict = serialize_entity(pan, "pan")
        if pan_dict and pan_dict.get("attributes"):
            # Get user info
            user = user_repository.by_id(pan.user_id)
            if user:
                pan_dict["attributes"]["user"] = user.name
                pan_dict["attributes"]["user_color"] = (
                    user.color if user.color else "#1890ff"
                )
                pan_dict["attributes"]["user_id"] = user.id
                pan_dict["attributes"]["user_profile_picture"] = (
                    user.get_profile_picture()
                )
                pan_dict["attributes"]["user_border_style"] = (
                    user.border_style if user.border_style else "solid"
                )
                pan_dict["attributes"]["user_border_texture"] = (
                    user.border_texture if user.border_texture else None
                )
                pan_dict["attributes"]["user_glow_effect"] = (
                    user.glow_effect if user.glow_effect else False
                )
            else:
                pan_dict["attributes"]["user"] = "Unknown"
                pan_dict["attributes"]["user_color"] = "#d9d9d9"
                pan_dict["attributes"]["user_id"] = None
                pan_dict["attributes"]["user_profile_picture"] = None
                pan_dict["attributes"]["user_border_style"] = "solid"
                pan_dict["attributes"]["user_border_texture"] = None
                pan_dict["attributes"]["user_glow_effect"] = False

        return {"jsonapi": {"version": JSONAPI_VERSION}, "data": pan_dict}

    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_pan(self):
        """Create a pan from hand-picked ingredients.

        Query parameters:
        - session_key: Session key (required)

        Request body:
        - name: Pan name (optional)
        - ingredients: List of ingredient IDs (required)

        :returns Pan: Created pan; meta carries reward, newly_unlocked_achievements, events
        :status_code 200: Pan created successfully
        :status_code 401: Not authenticated
        :status_code 400: Missing session_key or ingredients
        """
        attributes = deserialize_attributes()
        ingredient_ids = attributes.get("ingredients")
        if not ingredient_ids or not isinstance(ingredient_ids, list):
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="ingredients must be a non-empty list",
            )
        return self._roll(
            RollOptions(ingredient_ids=ingredient_ids, name=attributes.get("name") or None)
        )

    @BaseApi.endpoint("/<int:pan_id>", ["PATCH"])
    @require_auth
    def update_pan(self, pan_id: int):
        """Update a pan.

        :param pan_id: Pan ID
        :returns Pan: Updated pan
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Pan not found
        """
        pan = self.repository.by_id(pan_id)
        if not pan:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Pan not found",
                detail="The specified pan does not exist",
            )

        attributes = deserialize_attributes()

        # Check if snacked is being set to True (pan is being eaten)
        was_snacked = pan.snacked
        will_be_snacked = attributes.get("snacked", was_snacked)
        is_being_eaten = not was_snacked and will_be_snacked

        # Handle ingredients if provided as IDs
        if "ingredients" in attributes:
            ingredient_ids = attributes["ingredients"]
            ingredients = []
            for ing_id in ingredient_ids:
                ingredient = self.ingredient_repository.by_id(ing_id)
                if ingredient:
                    ingredients.append(ingredient)
            attributes["ingredients"] = ingredients

        updated = self.repository.update(pan_id, attributes)

        # Note: XP is awarded when the pan is created/rolled, not when eaten
        # This prevents double XP from being awarded

        db.session.commit()

        return serialize_single(updated, "pan")

    @BaseApi.endpoint("/<int:pan_id>", ["DELETE"])
    @require_auth
    def delete_pan(self, pan_id: int):
        """Delete a pan.

        :param pan_id: Pan ID
        :status_code 204: Success
        :status_code 401: Not authenticated
        :status_code 404: Pan not found
        """
        if not self.repository.exists(pan_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Pan not found",
                detail="The specified pan does not exist",
            )

        self.repository.delete(pan_id)
        db.session.commit()

        return None, 204
