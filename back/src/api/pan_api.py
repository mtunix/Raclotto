from flask import request
from random import sample
import random
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth, get_current_user
from back.src.repository.pan_repository import PanRepository
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository
from back.src.api.serializer import serialize_single, serialize_collection, serialize_entity
from back.src.api.constants import JSONAPI_VERSION
from back.src.api.deserializer import deserialize_attributes
from back.src.entity.ingredient import GenerationParameters, GenerationPreferences, IngredientType
from back.src.entity.pan import Pan
from back.src.driver.database import db
from wonderwords import RandomWord


class PanApi(BaseApi):
    url_prefix = "/pans"
    
    def __init__(self):
        super().__init__()
        self.repository = PanRepository()
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()
    
    @BaseApi.endpoint("/generate", ["POST"])
    @require_auth
    def generate(self):
        """Generate a new Raclotto pan.
        
        Query parameters:
        - session_key: Session key (required)
        
        Request body should contain:
        - numFill: Number of fill ingredients (default: 3)
        - numSauce: Number of sauce ingredients (default: 2)
        
        :returns Pan: Generated pan
        :status_code 200: Pan generated successfully
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        attributes = deserialize_attributes()
        num_fill = attributes.get('numFill', 3)
        num_sauce = attributes.get('numSauce', 2)
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing session_key",
                detail="session_key query parameter is required"
            )
        
        # Create GenerationPreferences from user's food preferences
        preferences = GenerationPreferences(
            meat=user.meat,
            vegetarian=user.vegetarian,
            vegan=user.vegan,
            histamine=user.histamine,
            fructose=user.fructose,
            lactose=user.lactose,
            gluten=user.gluten
        )
        
        # Get session
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Select ingredients based on preferences
        fills = self.ingredient_repository.filter_by_preferences(
            session_key, preferences, IngredientType.FILL
        )
        sauces = self.ingredient_repository.filter_by_preferences(
            session_key, preferences, IngredientType.SAUCE
        )
        
        num_fill = min(num_fill, len(fills)) if len(fills) >= num_fill else len(fills)
        num_sauce = min(num_sauce, len(sauces)) if len(sauces) >= num_sauce else len(sauces)
        
        # Validate that at least one ingredient type is selected
        if num_fill == 0 and num_sauce == 0:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Invalid ingredient selection",
                detail="At least one fill or sauce ingredient must be selected"
            )
        
        # Sample ingredients explicitly handling zero values
        selected_ingredients = []
        if num_fill > 0:
            selected_ingredients.extend(sample(fills, num_fill))
        if num_sauce > 0:
            selected_ingredients.extend(sample(sauces, num_sauce))
        
        # Generate pan name
        r = RandomWord()
        pan_name = f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan"
        
        # Get preparation type if requested
        preparation_type_id = attributes.get('preparation_type_id')
        rolled_preparation_type = False
        
        # Handle cheese roll if requested
        cheese_level = None
        roll_cheese = attributes.get('roll_cheese', False)
        rolled_cheese = False
        if roll_cheese:
            cheese_level = random.randint(0, 9)
            rolled_cheese = True
        
        if preparation_type_id:
            from back.src.repository.preparation_type_repository import PreparationTypeRepository
            prep_type_repo = PreparationTypeRepository()
            prep_type = prep_type_repo.by_id(preparation_type_id)
            if not prep_type:
                raise ApiError(
                    ApiErrorCode.resource_not_found,
                    status=404,
                    title="Preparation type not found",
                    detail="The specified preparation type does not exist"
                )
            # Verify the preparation type is available for this session (either default or session-specific)
            if prep_type.session_id is not None and prep_type.session_id != session.id:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid preparation type",
                    detail="The specified preparation type is not available for this session"
                )
        
        # Track when user joins the session (if not already in it)
        # This is used for achievements like "Pandler"
        from back.src.entity.user import user_sessions
        from datetime import datetime
        from sqlalchemy import update
        
        # Check if user is already in the session
        existing_join = db.session.query(user_sessions).filter(
            user_sessions.c.user_id == user.id,
            user_sessions.c.session_id == session.id
        ).first()
        
        if not existing_join:
            # User is joining this session for the first time - add timestamp
            try:
                db.session.execute(
                    user_sessions.insert().values(
                        user_id=user.id,
                        session_id=session.id,
                        joined_at=datetime.now()
                    )
                )
                db.session.flush()
            except Exception:
                # If insert fails (e.g., duplicate key), try to update timestamp if it's NULL
                db.session.execute(
                    update(user_sessions).where(
                        user_sessions.c.user_id == user.id,
                        user_sessions.c.session_id == session.id
                    ).values(joined_at=datetime.now())
                )
                db.session.flush()
        
        # Create pan
        pan = Pan(
            name=pan_name,
            ingredients=selected_ingredients,
            user_id=user.id,
            session_id=session.id,
            preparation_type_id=preparation_type_id,
            cheese_level=cheese_level,
            rolled_preparation_type=rolled_preparation_type,
            rolled_cheese=rolled_cheese
        )
        db.session.add(pan)
        db.session.commit()
        
        # Evaluate achievements for this pan
        from back.src.interactor.achievement_service import AchievementService
        achievement_service = AchievementService()
        newly_unlocked_achievements = achievement_service.evaluate_achievements_for_pan(pan, user)
        
        # Evaluate events for this pan
        from back.src.interactor.event_service import EventService
        event_service = EventService()
        event_service.evaluate_events_for_session(session, {'pan': pan})
        
        # Award XP for rolling the pan
        from back.src.interactor.level_service import LevelService
        level_service = LevelService()
        level_service.award_xp_for_pan(user, pan)
        
        db.session.commit()
        
        # Serialize pan
        pan_response = serialize_single(pan, "pan")
        
        # Add newly unlocked achievements to response meta
        if newly_unlocked_achievements:
            achievements_data = serialize_collection(newly_unlocked_achievements, "achievement")
            if achievements_data and "data" in achievements_data:
                pan_response["meta"] = pan_response.get("meta", {})
                pan_response["meta"]["newly_unlocked_achievements"] = achievements_data["data"]
        
        return pan_response
    
    @BaseApi.endpoint("/generate/bandit", ["POST"])
    @require_auth
    def generate_bandit(self):
        """Generate a new Raclotto pan using bandit mode (random fill/sauce distribution).
        
        Query parameters:
        - session_key: Session key (required)
        
        Request body should contain:
        - total_columns: Total number of ingredients (fill + sauce) (required)
        - roll_prep_type: Whether to randomly select a preparation type (optional, default: False)
        
        :returns Pan: Generated pan with randomly distributed fill/sauce ingredients
        :status_code 200: Pan generated successfully
        :status_code 401: Not authenticated
        :status_code 400: Missing required fields
        """
        user = get_current_user()
        attributes = deserialize_attributes()
        total_columns = attributes.get('total_columns')
        roll_prep_type = attributes.get('roll_prep_type', False)
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing session_key",
                detail="session_key query parameter is required"
            )
        
        if total_columns is None or total_columns < 1:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="total_columns is required and must be at least 1"
            )
        
        # Create GenerationPreferences from user's food preferences
        preferences = GenerationPreferences(
            meat=user.meat,
            vegetarian=user.vegetarian,
            vegan=user.vegan,
            histamine=user.histamine,
            fructose=user.fructose,
            lactose=user.lactose,
            gluten=user.gluten
        )
        
        # Get session
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Select ingredients based on preferences
        fills = self.ingredient_repository.filter_by_preferences(
            session_key, preferences, IngredientType.FILL
        )
        sauces = self.ingredient_repository.filter_by_preferences(
            session_key, preferences, IngredientType.SAUCE
        )
        
        # Randomly determine num_fill and num_sauce such that num_fill + num_sauce = total_columns
        # Ensure at least 1 of each type if possible
        available_fill_count = len(fills)
        available_sauce_count = len(sauces)
        
        if available_fill_count == 0 and available_sauce_count == 0:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="No ingredients available",
                detail="No available ingredients found for this session"
            )
        
        # Determine random distribution
        if total_columns == 1:
            # Only one column - prefer fill if available, otherwise sauce
            if available_fill_count > 0:
                num_fill = 1
                num_sauce = 0
            else:
                num_fill = 0
                num_sauce = 1
        else:
            # Randomly distribute, but ensure at least 1 of each if both types are available
            if available_fill_count > 0 and available_sauce_count > 0:
                # At least 1 of each, rest randomly distributed
                min_fill = 1
                min_sauce = 1
                remaining = total_columns - min_fill - min_sauce
                
                if remaining < 0:
                    # Not enough columns for both types - distribute proportionally
                    if available_fill_count >= available_sauce_count:
                        num_fill = min(total_columns, available_fill_count)
                        num_sauce = 0
                    else:
                        num_fill = 0
                        num_sauce = min(total_columns, available_sauce_count)
                else:
                    # Distribute remaining randomly
                    fill_portion = random.randint(0, remaining)
                    num_fill = min_fill + fill_portion
                    num_sauce = min_sauce + (remaining - fill_portion)
                    
                    # Ensure we don't exceed available counts
                    num_fill = min(num_fill, available_fill_count)
                    num_sauce = min(num_sauce, available_sauce_count)
                    
                    # Adjust if total doesn't match (due to capacity limits)
                    total_selected = num_fill + num_sauce
                    if total_selected < total_columns:
                        # Add remaining to whichever type has capacity
                        remaining = total_columns - total_selected
                        while remaining > 0:
                            if num_fill < available_fill_count and num_sauce < available_sauce_count:
                                # Both have capacity - randomly choose which to add to
                                if random.random() < 0.5:
                                    num_fill += 1
                                    remaining -= 1
                                else:
                                    num_sauce += 1
                                    remaining -= 1
                            elif num_fill < available_fill_count:
                                num_fill += min(remaining, available_fill_count - num_fill)
                                remaining -= min(remaining, available_fill_count - num_fill)
                            elif num_sauce < available_sauce_count:
                                num_sauce += min(remaining, available_sauce_count - num_sauce)
                                remaining -= min(remaining, available_sauce_count - num_sauce)
                            else:
                                # No more capacity in either - break
                                break
            elif available_fill_count > 0:
                # Only fills available
                num_fill = min(total_columns, available_fill_count)
                num_sauce = 0
            else:
                # Only sauces available
                num_fill = 0
                num_sauce = min(total_columns, available_sauce_count)
        
        # Ensure we have at least one ingredient
        if num_fill == 0 and num_sauce == 0:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Invalid distribution",
                detail="Could not create valid ingredient distribution"
            )
        
        # Sample ingredients
        selected_ingredients = []
        if num_fill > 0:
            selected_ingredients.extend(sample(fills, num_fill))
        if num_sauce > 0:
            selected_ingredients.extend(sample(sauces, num_sauce))
        
        # Generate pan name
        r = RandomWord()
        pan_name = f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan"
        
        # Handle preparation type
        preparation_type_id = None
        rolled_preparation_type = False
        if roll_prep_type:
            from back.src.repository.preparation_type_repository import PreparationTypeRepository
            prep_type_repo = PreparationTypeRepository()
            # Get all available prep types for this session (includes defaults)
            all_prep_types = prep_type_repo.by_session(session.id)
            
            if all_prep_types:
                # Randomly select one
                selected_prep_type = random.choice(all_prep_types)
                preparation_type_id = selected_prep_type.id
                rolled_preparation_type = True
        
        # Handle cheese roll if requested
        cheese_level = None
        roll_cheese = attributes.get('roll_cheese', False)
        rolled_cheese = False
        if roll_cheese:
            cheese_level = random.randint(0, 9)
            rolled_cheese = True
        
        # Track when user joins the session (if not already in it)
        from back.src.entity.user import user_sessions
        from datetime import datetime
        from sqlalchemy import update
        
        # Check if user is already in the session
        existing_join = db.session.query(user_sessions).filter(
            user_sessions.c.user_id == user.id,
            user_sessions.c.session_id == session.id
        ).first()
        
        if not existing_join:
            # User is joining this session for the first time - add timestamp
            try:
                db.session.execute(
                    user_sessions.insert().values(
                        user_id=user.id,
                        session_id=session.id,
                        joined_at=datetime.now()
                    )
                )
                db.session.flush()
            except Exception:
                # If insert fails (e.g., duplicate key), try to update timestamp if it's NULL
                db.session.execute(
                    update(user_sessions).where(
                        user_sessions.c.user_id == user.id,
                        user_sessions.c.session_id == session.id
                    ).values(joined_at=datetime.now())
                )
                db.session.flush()
        
        # Create pan
        pan = Pan(
            name=pan_name,
            ingredients=selected_ingredients,
            user_id=user.id,
            session_id=session.id,
            preparation_type_id=preparation_type_id,
            cheese_level=cheese_level,
            rolled_preparation_type=rolled_preparation_type,
            rolled_cheese=rolled_cheese
        )
        db.session.add(pan)
        db.session.commit()
        
        # Evaluate achievements for this pan
        from back.src.interactor.achievement_service import AchievementService
        achievement_service = AchievementService()
        newly_unlocked_achievements = achievement_service.evaluate_achievements_for_pan(pan, user)
        
        # Evaluate events for this pan
        from back.src.interactor.event_service import EventService
        event_service = EventService()
        event_service.evaluate_events_for_session(session, {'pan': pan})
        
        # Award XP for rolling the pan
        from back.src.interactor.level_service import LevelService
        level_service = LevelService()
        level_service.award_xp_for_pan(user, pan)
        
        db.session.commit()
        
        # Serialize pan
        pan_response = serialize_single(pan, "pan")
        
        # Add newly unlocked achievements to response meta
        if newly_unlocked_achievements:
            achievements_data = serialize_collection(newly_unlocked_achievements, "achievement")
            if achievements_data and "data" in achievements_data:
                pan_response["meta"] = pan_response.get("meta", {})
                pan_response["meta"]["newly_unlocked_achievements"] = achievements_data["data"]
        
        return pan_response
    
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
        from back.src.repository.user_repository import UserRepository
        from sqlalchemy import func
        user_repository = UserRepository()
        
        session_key = request.args.get('session_key')
        user_id = request.args.get('user_id', type=int)
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', type=int, default=0)
        
        if session_key:
            pans = self.repository.by_session(session_key, limit=limit, offset=offset)
            # Get total count for pagination metadata
            try:
                from back.src.entity.raclotto_session import RaclottoSession
                session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
                total_count = db.session.query(func.count(Pan.id)).filter_by(session_id=session.id).scalar() or 0
            except:
                total_count = len(pans)
        elif user_id:
            pans = self.repository.by_user(user_id, limit=limit, offset=offset)
            # Get total count for pagination metadata
            total_count = db.session.query(func.count(Pan.id)).filter_by(user_id=user_id).scalar() or 0
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
                    pan_dict["attributes"]["user_color"] = user.color if user.color else "#1890ff"
                    pan_dict["attributes"]["user_id"] = user.id
                    pan_dict["attributes"]["user_profile_picture"] = user.profile_picture if user.profile_picture else None
                    pan_dict["attributes"]["user_border_style"] = user.border_style if user.border_style else 'solid'
                    pan_dict["attributes"]["user_border_texture"] = user.border_texture if user.border_texture else None
                    pan_dict["attributes"]["user_glow_effect"] = bool(user.glow_effect) if user.glow_effect is not None else False
                else:
                    pan_dict["attributes"]["user"] = "Unknown"
                    pan_dict["attributes"]["user_color"] = "#d9d9d9"
                    pan_dict["attributes"]["user_id"] = None
                    pan_dict["attributes"]["user_profile_picture"] = None
                    pan_dict["attributes"]["user_border_style"] = 'solid'
                    pan_dict["attributes"]["user_border_texture"] = None
                    pan_dict["attributes"]["user_glow_effect"] = False
            enriched_pans.append(pan_dict)
        
        # Calculate if there are more results
        has_more = False
        if limit is not None:
            has_more = (offset + len(pans)) < total_count
        
        response = {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": enriched_pans
        }
        
        # Add pagination metadata if pagination is used
        if limit is not None:
            response["meta"] = {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": has_more
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
                detail="The specified pan does not exist"
            )
        
        # Enrich pan with user name, color, id, and profile picture
        pan_dict = serialize_entity(pan, "pan")
        if pan_dict and pan_dict.get("attributes"):
            # Get user info
            user = user_repository.by_id(pan.user_id)
            if user:
                pan_dict["attributes"]["user"] = user.name
                pan_dict["attributes"]["user_color"] = user.color if user.color else "#1890ff"
                pan_dict["attributes"]["user_id"] = user.id
                pan_dict["attributes"]["user_profile_picture"] = user.profile_picture if user.profile_picture else None
                pan_dict["attributes"]["user_border_style"] = user.border_style if user.border_style else 'solid'
                pan_dict["attributes"]["user_border_texture"] = user.border_texture if user.border_texture else None
                pan_dict["attributes"]["user_glow_effect"] = user.glow_effect if user.glow_effect else False
            else:
                pan_dict["attributes"]["user"] = "Unknown"
                pan_dict["attributes"]["user_color"] = "#d9d9d9"
                pan_dict["attributes"]["user_id"] = None
                pan_dict["attributes"]["user_profile_picture"] = None
                pan_dict["attributes"]["user_border_style"] = 'solid'
                pan_dict["attributes"]["user_border_texture"] = None
                pan_dict["attributes"]["user_glow_effect"] = False
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": pan_dict
        }
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_pan(self):
        """Create a new pan.
        
        Query parameters:
        - session_key: Session key (required)
        
        Request body should contain pan attributes:
        - name: Pan name (optional)
        - ingredients: List of ingredient IDs (required)
        
        :returns Pan: Created pan
        :status_code 201: Pan created successfully
        :status_code 401: Not authenticated
        :status_code 400: Missing session_key or ingredients
        """
        user = get_current_user()
        attributes = deserialize_attributes()
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing session_key",
                detail="session_key query parameter is required"
            )
        
        # Get session
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Handle ingredients if provided as IDs
        if 'ingredients' in attributes:
            ingredient_ids = attributes['ingredients']
            if not ingredient_ids or not isinstance(ingredient_ids, list):
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail="ingredients must be a non-empty list"
                )
            ingredients = []
            for ing_id in ingredient_ids:
                ingredient = self.ingredient_repository.by_id(ing_id)
                if ingredient:
                    ingredients.append(ingredient)
            attributes['ingredients'] = ingredients
        else:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="ingredients is required"
            )
        
        # Set user_id and session_id
        attributes['user_id'] = user.id
        attributes['session_id'] = session.id
        
        # Track when user joins the session (if not already in it)
        # This is used for achievements like "Pandler"
        from back.src.entity.user import user_sessions
        from datetime import datetime
        
        # Check if user is already in the session
        existing_join = db.session.query(user_sessions).filter(
            user_sessions.c.user_id == user.id,
            user_sessions.c.session_id == session.id
        ).first()
        
        if not existing_join:
            # User is joining this session for the first time - add timestamp
            db.session.execute(
                user_sessions.insert().values(
                    user_id=user.id,
                    session_id=session.id,
                    joined_at=datetime.now()
                )
            )
            db.session.flush()
        
        # Generate name if not provided
        if 'name' not in attributes or not attributes['name']:
            from wonderwords import RandomWord
            r = RandomWord()
            attributes['name'] = f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan"
        
        pan = self.repository.create(attributes)
        db.session.commit()
        
        # Evaluate achievements for this pan
        from back.src.interactor.achievement_service import AchievementService
        achievement_service = AchievementService()
        achievement_service.evaluate_achievements_for_pan(pan, user)
        
        # Evaluate events for this pan
        from back.src.interactor.event_service import EventService
        event_service = EventService()
        event_service.evaluate_events_for_session(session, {'pan': pan})
        
        # Award XP for rolling the pan
        from back.src.interactor.level_service import LevelService
        level_service = LevelService()
        level_service.award_xp_for_pan(user, pan)
        
        db.session.commit()
        
        return serialize_single(pan, "pan")
    
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
                detail="The specified pan does not exist"
            )
        
        attributes = deserialize_attributes()
        
        # Check if snacked is being set to True (pan is being eaten)
        was_snacked = pan.snacked
        will_be_snacked = attributes.get('snacked', was_snacked)
        is_being_eaten = not was_snacked and will_be_snacked
        
        # Handle ingredients if provided as IDs
        if 'ingredients' in attributes:
            ingredient_ids = attributes['ingredients']
            ingredients = []
            for ing_id in ingredient_ids:
                ingredient = self.ingredient_repository.by_id(ing_id)
                if ingredient:
                    ingredients.append(ingredient)
            attributes['ingredients'] = ingredients
        
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
                detail="The specified pan does not exist"
            )
        
        self.repository.delete(pan_id)
        db.session.commit()
        
        return None, 204
