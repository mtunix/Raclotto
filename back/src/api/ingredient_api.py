from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth, get_current_user
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.user_repository import UserRepository
from back.src.api.serializer import serialize_single, serialize_collection, serialize_entity
from back.src.api.deserializer import deserialize_attributes
from back.src.entity.ingredient import IngredientType
from back.src.entity.user import User
from back.src.driver.database import db


class IngredientApi(BaseApi):
    url_prefix = "/ingredients"
    
    def __init__(self):
        super().__init__()
        self.repository = IngredientRepository()
        self.session_repository = SessionRepository()
        self.achievement_repository = AchievementRepository()
        self.user_repository = UserRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_ingredients(self):
        """List ingredients, optionally filtered by session.
        
        Query parameters:
        - session_key: Optional session key to filter by
        
        :returns List[Ingredient]: List of ingredients with 'applicable' flag
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        session_key = request.args.get('session_key')
        
        if session_key:
            ingredients = self.repository.by_session(session_key)
        else:
            ingredients = self.repository.all()
        
        # Serialize with applicable flag
        data = []
        for ingredient in ingredients:
            entity_data = serialize_entity(ingredient, "ingredient")
            # Check if ingredient matches user preferences
            is_applicable = True
            
            # If user doesn't eat meat, exclude meat ingredients
            if not user.meat and ingredient.meat:
                is_applicable = False
            
            # If user doesn't eat vegetarian, exclude vegetarian ingredients
            if not user.vegetarian and ingredient.vegetarian:
                is_applicable = False
            
            # If user doesn't eat vegan, exclude vegan ingredients
            if not user.vegan and ingredient.vegan:
                is_applicable = False
            
            # If user doesn't eat histamine, exclude histamine ingredients
            if not user.histamine and ingredient.histamine:
                is_applicable = False
            
            # If user doesn't eat fructose, exclude fructose ingredients
            if not user.fructose and ingredient.fructose:
                is_applicable = False
            
            # If user doesn't eat lactose, exclude lactose ingredients
            if not user.lactose and ingredient.lactose:
                is_applicable = False
            
            # If user doesn't eat gluten, exclude gluten ingredients
            if not user.gluten and ingredient.gluten:
                is_applicable = False
            
            # Add applicable flag to attributes
            if entity_data and 'attributes' in entity_data:
                entity_data['attributes']['applicable'] = is_applicable
            elif entity_data:
                entity_data['applicable'] = is_applicable
            
            data.append(entity_data)
        
        return {
            "jsonapi": {"version": "1.0"},
            "data": data
        }
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_ingredient(self):
        """Create a new ingredient.
        
        Request body should contain:
        - name: Ingredient name
        - type: Ingredient type (1=FILL, 2=SAUCE)
        - session_key: Session key
        - Other ingredient attributes (meat, vegetarian, vegan, etc.)
        
        :returns Ingredient: Created ingredient
        :status_code 201: Ingredient created successfully
        :status_code 401: Not authenticated
        """
        attributes = deserialize_attributes()
        session_key = attributes.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key is required"
            )
        
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Convert type to IngredientType enum
        ingredient_type = attributes.get('type')
        if ingredient_type is not None:
            attributes['type'] = IngredientType(int(ingredient_type))
        
        # Remove session_key from attributes and set session relationship
        attributes.pop('session_key', None)
        attributes['session'] = session  # Use relationship, not session_id
        
        ingredient = self.repository.create(attributes)
        db.session.commit()
        
        # If a new sauce was added, check if any users with "King of the Sauce" 
        # achievement need to have it revoked
        if ingredient.type == IngredientType.SAUCE:
            from back.src.interactor.achievement_service import AchievementService
            
            achievement_service = AchievementService()
            
            # Find the "King of the Sauce" achievement
            king_achievement = self.achievement_repository.by_title("King of the Sauce")
            
            if king_achievement:
                # Check if this is a session-specific achievement
                if not king_achievement.is_global:
                    # Session-specific: only re-evaluate users in this session
                    user_ids_with_achievement = self.user_repository.get_users_with_achievement(king_achievement.id)
                    user_ids_in_session = self.user_repository.get_users_in_session(session.id)
                    
                    # Only re-evaluate users who have the achievement AND are in this session
                    users_to_re_evaluate = user_ids_with_achievement & user_ids_in_session
                else:
                    # Global: re-evaluate all users who have this achievement
                    users_to_re_evaluate = self.user_repository.get_users_with_achievement(king_achievement.id)
                
                # Re-evaluate the achievement for each affected user
                for user_id in users_to_re_evaluate:
                    user = self.user_repository.by_id(user_id)
                    if user:
                        # For global achievements, use any session; for session-specific, use the current session
                        eval_session = session if not king_achievement.is_global else (user.sessions[0] if user.sessions else session)
                        achievement_service.re_evaluate_achievement_for_user(
                            user, king_achievement, eval_session
                        )
                
                db.session.commit()
        
        return serialize_single(ingredient, "ingredient")
    
    @BaseApi.endpoint("/<int:ingredient_id>", ["GET"])
    @require_auth
    def get_ingredient(self, ingredient_id: int):
        """Get an ingredient by ID.
        
        :param ingredient_id: Ingredient ID
        :returns Ingredient: Ingredient
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Ingredient not found
        """
        ingredient = self.repository.by_id(ingredient_id)
        if not ingredient:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Ingredient not found",
                detail="The specified ingredient does not exist"
            )
        
        return serialize_single(ingredient, "ingredient")
    
    @BaseApi.endpoint("/<int:ingredient_id>", ["PATCH"])
    @require_auth
    def update_ingredient(self, ingredient_id: int):
        """Update an ingredient.
        
        :param ingredient_id: Ingredient ID
        :returns Ingredient: Updated ingredient
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Ingredient not found
        """
        ingredient = self.repository.by_id(ingredient_id)
        if not ingredient:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Ingredient not found",
                detail="The specified ingredient does not exist"
            )
        
        attributes = deserialize_attributes()
        # Convert type to IngredientType enum if provided
        if 'type' in attributes:
            attributes['type'] = IngredientType(int(attributes['type']))
        
        updated = self.repository.update(ingredient_id, attributes)
        db.session.commit()
        
        return serialize_single(updated, "ingredient")
    
    @BaseApi.endpoint("/<int:ingredient_id>", ["DELETE"])
    @require_auth
    def delete_ingredient(self, ingredient_id: int):
        """Delete an ingredient (marks as unavailable).
        
        Query parameters:
        - session_key: Session key (for validation)
        
        :param ingredient_id: Ingredient ID
        :returns Ingredient: Updated ingredient (unavailable)
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Ingredient not found
        """
        session_key = request.args.get('session_key')
        ingredient = self.repository.by_id(ingredient_id)
        
        if not ingredient:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Ingredient not found",
                detail="The specified ingredient does not exist"
            )
        
        # Validate session_key matches ingredient's session
        if session_key and ingredient.session.key != session_key:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Invalid session",
                detail="Session key does not match ingredient's session"
            )
        
        # Mark as unavailable instead of deleting
        updated = self.repository.mark_unavailable(ingredient_id)
        db.session.commit()
        
        return serialize_single(updated, "ingredient")
    
    @BaseApi.endpoint("/refill", ["POST"])
    @require_auth
    def refill_ingredient(self):
        """Refill an ingredient (mark as available).
        
        Request body should contain:
        - id: Ingredient ID
        
        :returns Ingredient: Updated ingredient (available)
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Ingredient not found
        """
        attributes = deserialize_attributes()
        ingredient_id = attributes.get('id')
        
        if not ingredient_id:
            # Try to get from request JSON directly
            data = request.json
            if data and 'data' in data and 'id' in data['data']:
                ingredient_id = int(data['data']['id'])
            else:
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail="id is required"
                )
        
        ingredient = self.repository.by_id(ingredient_id)
        if not ingredient:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Ingredient not found",
                detail="The specified ingredient does not exist"
            )
        
        updated = self.repository.mark_available(ingredient_id)
        db.session.commit()
        
        return serialize_single(updated, "ingredient")
    
    @BaseApi.endpoint("/available-counts", ["GET"])
    @require_auth
    def get_available_counts(self):
        """Get counts of available ingredients for the current user based on their preferences.
        
        Query parameters:
        - session_key: Session key (required)
        
        :returns Dict: Dictionary with 'fill_count' and 'sauce_count'
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 400: Missing session_key
        """
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        user = get_current_user()
        ingredients = self.repository.by_session(session_key)
        
        # Filter ingredients based on user preferences
        # Only include ingredients that match user's dietary restrictions
        available_ingredients = []
        for ingredient in ingredients:
            if not ingredient.available:
                continue
            
            # Check if ingredient matches user preferences
            # If user doesn't eat meat, exclude meat ingredients
            if not user.meat and ingredient.meat:
                continue
            
            # If user doesn't eat vegetarian, exclude vegetarian ingredients
            if not user.vegetarian and ingredient.vegetarian:
                continue
            
            # If user doesn't eat vegan, exclude vegan ingredients
            if not user.vegan and ingredient.vegan:
                continue
            
            # If user doesn't eat histamine, exclude histamine ingredients
            if not user.histamine and ingredient.histamine:
                continue
            
            # If user doesn't eat fructose, exclude fructose ingredients
            if not user.fructose and ingredient.fructose:
                continue
            
            # If user doesn't eat lactose, exclude lactose ingredients
            if not user.lactose and ingredient.lactose:
                continue
            
            # If user doesn't eat gluten, exclude gluten ingredients
            if not user.gluten and ingredient.gluten:
                continue
            
            available_ingredients.append(ingredient)
        
        fill_count = len([i for i in available_ingredients if i.type == IngredientType.FILL])
        sauce_count = len([i for i in available_ingredients if i.type == IngredientType.SAUCE])
        
        return {
            "fill_count": fill_count,
            "sauce_count": sauce_count
        }
    
    @BaseApi.endpoint("/export", ["GET"])
    @require_auth
    def export_ingredients(self):
        """Export all ingredients for a session with their IDs.
        
        Query parameters:
        - session_key: Session key (required)
        
        :returns Dict: Export data with session info and ingredients array
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 400: Missing session_key
        :status_code 404: Session not found
        """
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Get all ingredients for the session
        ingredients = self.repository.by_session(session_key)
        
        # Serialize to simple format with all fields including IDs
        ingredients_data = []
        for ingredient in ingredients:
            ingredient_dict = {
                "id": ingredient.id,
                "name": ingredient.name,
                "type": ingredient.type.value if hasattr(ingredient.type, 'value') else int(ingredient.type),
                "available": ingredient.available,
                "meat": ingredient.meat,
                "vegetarian": ingredient.vegetarian,
                "vegan": ingredient.vegan,
                "gluten": ingredient.gluten,
                "histamine": ingredient.histamine,
                "fructose": ingredient.fructose,
                "lactose": ingredient.lactose,
                "session_id": ingredient.session_id
            }
            ingredients_data.append(ingredient_dict)
        
        return {
            "session_key": session_key,
            "session_id": session.id,
            "ingredients": ingredients_data
        }
    
    @BaseApi.endpoint("/import", ["POST"])
    @require_auth
    def import_ingredients(self):
        """Import new ingredients into a session.
        
        Query parameters:
        - session_key: Session key (required)
        
        Request body should contain:
        - ingredients: Array of ingredient objects (without IDs)
        
        :returns Dict: Created ingredients with their new IDs
        :status_code 201: Ingredients created successfully
        :status_code 401: Not authenticated
        :status_code 400: Missing session_key or invalid data
        :status_code 404: Session not found
        """
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Get request data
        request_data = request.json
        if not request_data or 'ingredients' not in request_data:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="ingredients array is required in request body"
            )
        
        ingredients_data = request_data['ingredients']
        if not isinstance(ingredients_data, list):
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Invalid data",
                detail="ingredients must be an array"
            )
        
        # Validate and prepare ingredients
        validated_data = []
        for idx, item in enumerate(ingredients_data):
            # Remove ID if present (import should not have IDs)
            item = {k: v for k, v in item.items() if k != 'id'}
            
            # Validate required fields
            if 'name' not in item:
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail=f"ingredients[{idx}].name is required"
                )
            
            if 'type' not in item:
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail=f"ingredients[{idx}].type is required"
                )
            
            # Validate type
            try:
                item['type'] = IngredientType(int(item['type']))
            except (ValueError, TypeError):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient type",
                    detail=f"ingredients[{idx}].type must be 1 (FILL) or 2 (SAUCE)"
                )
            
            # Set defaults
            item.setdefault('available', True)
            item.setdefault('meat', False)
            item.setdefault('vegetarian', False)
            item.setdefault('vegan', False)
            item.setdefault('gluten', False)
            item.setdefault('histamine', False)
            item.setdefault('fructose', False)
            item.setdefault('lactose', False)
            
            # Validate meat/vegetarian/vegan constraints
            # They are mutually exclusive, and at least one must be true
            meat = item.get('meat', False)
            vegetarian = item.get('vegetarian', False)
            vegan = item.get('vegan', False)
            
            if not (meat or vegetarian or vegan):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient constraints",
                    detail=f"ingredients[{idx}] must have at least one of meat, vegetarian, or vegan set to true"
                )
            
            if meat and (vegetarian or vegan):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient constraints",
                    detail=f"ingredients[{idx}] cannot have meat=true with vegetarian or vegan=true (they are mutually exclusive)"
                )
            
            if vegetarian and vegan:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient constraints",
                    detail=f"ingredients[{idx}] cannot have both vegetarian=true and vegan=true (they are mutually exclusive)"
                )
            
            validated_data.append(item)
        
        # Create ingredients
        created_ingredients = self.repository.bulk_create(validated_data, session.id)
        db.session.commit()
        
        # Serialize response
        result_ingredients = []
        for ingredient in created_ingredients:
            ingredient_dict = {
                "id": ingredient.id,
                "name": ingredient.name,
                "type": ingredient.type.value if hasattr(ingredient.type, 'value') else int(ingredient.type),
                "available": ingredient.available,
                "meat": ingredient.meat,
                "vegetarian": ingredient.vegetarian,
                "vegan": ingredient.vegan,
                "gluten": ingredient.gluten,
                "histamine": ingredient.histamine,
                "fructose": ingredient.fructose,
                "lactose": ingredient.lactose,
                "session_id": ingredient.session_id
            }
            result_ingredients.append(ingredient_dict)
        
        return {
            "created": len(created_ingredients),
            "ingredients": result_ingredients
        }, 201
    
    @BaseApi.endpoint("/reimport", ["POST"])
    @require_auth
    def reimport_ingredients(self):
        """Reimport ingredients - update existing, create new, and delete missing.
        
        Query parameters:
        - session_key: Session key (required)
        
        Request body should contain:
        - ingredients: Array of ingredient objects (with or without IDs)
        
        Items with IDs will be updated, items without IDs will be created,
        and items in the session but not in the reimport data will be soft-deleted.
        
        :returns Dict: Summary of operations and all ingredients
        :status_code 200: Reimport successful
        :status_code 401: Not authenticated
        :status_code 400: Missing session_key, invalid data, or mixed sessions
        :status_code 404: Session not found
        """
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Get request data
        request_data = request.json
        if not request_data or 'ingredients' not in request_data:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="ingredients array is required in request body"
            )
        
        ingredients_data = request_data['ingredients']
        if not isinstance(ingredients_data, list):
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Invalid data",
                detail="ingredients must be an array"
            )
        
        # Get current ingredients in session
        current_ingredients = self.repository.by_session(session_key)
        current_ids = {ing.id for ing in current_ingredients}
        
        # Validate all items belong to the same session
        items_to_create = []
        items_to_update = []
        reimport_ids = set()
        
        for idx, item in enumerate(ingredients_data):
            # Check session_id if present
            if 'session_id' in item:
                if item['session_id'] != session.id:
                    raise ApiError(
                        ApiErrorCode.incorrect_parameters,
                        status=400,
                        title="Mixed sessions",
                        detail=f"ingredients[{idx}] belongs to a different session. All ingredients must belong to session_id {session.id}"
                    )
            
            # Validate required fields
            if 'name' not in item:
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail=f"ingredients[{idx}].name is required"
                )
            
            if 'type' not in item:
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail=f"ingredients[{idx}].type is required"
                )
            
            # Validate type
            try:
                item['type'] = IngredientType(int(item['type']))
            except (ValueError, TypeError):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient type",
                    detail=f"ingredients[{idx}].type must be 1 (FILL) or 2 (SAUCE)"
                )
            
            # Set defaults
            item.setdefault('available', True)
            item.setdefault('meat', False)
            item.setdefault('vegetarian', False)
            item.setdefault('vegan', False)
            item.setdefault('gluten', False)
            item.setdefault('histamine', False)
            item.setdefault('fructose', False)
            item.setdefault('lactose', False)
            
            # Validate meat/vegetarian/vegan constraints
            # They are mutually exclusive, and at least one must be true
            meat = item.get('meat', False)
            vegetarian = item.get('vegetarian', False)
            vegan = item.get('vegan', False)
            
            if not (meat or vegetarian or vegan):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient constraints",
                    detail=f"ingredients[{idx}] must have at least one of meat, vegetarian, or vegan set to true"
                )
            
            if meat and (vegetarian or vegan):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient constraints",
                    detail=f"ingredients[{idx}] cannot have meat=true with vegetarian or vegan=true (they are mutually exclusive)"
                )
            
            if vegetarian and vegan:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid ingredient constraints",
                    detail=f"ingredients[{idx}] cannot have both vegetarian=true and vegan=true (they are mutually exclusive)"
                )
            
            # Categorize by whether it has an ID
            if 'id' in item and item['id'] is not None:
                ingredient_id = item['id']
                # Verify the ingredient exists in the session
                if ingredient_id not in current_ids:
                    raise ApiError(
                        ApiErrorCode.resource_not_found,
                        status=404,
                        title="Ingredient not found",
                        detail=f"ingredients[{idx}] with id {ingredient_id} does not exist in this session"
                    )
                items_to_update.append(item)
                reimport_ids.add(ingredient_id)
            else:
                # Remove ID if present but None
                item.pop('id', None)
                items_to_create.append(item)
        
        # Find items to delete (in current but not in reimport)
        ids_to_delete = current_ids - reimport_ids
        
        # Track if sauces changed for achievement re-evaluation
        # Check if any sauces were deleted, added, or if new ones are being created
        current_sauce_ids = {ing.id for ing in current_ingredients if ing.type == IngredientType.SAUCE}
        deleted_sauce_ids = ids_to_delete & current_sauce_ids
        new_sauces_count = sum(1 for item in items_to_create if item.get('type') == IngredientType.SAUCE)
        sauces_changed = bool(deleted_sauce_ids) or new_sauces_count > 0
        
        # Perform operations
        created_ingredients = []
        if items_to_create:
            created_ingredients = self.repository.bulk_create(items_to_create, session.id)
        
        updated_ingredients = []
        if items_to_update:
            updated_ingredients = self.repository.bulk_update(items_to_update)
        
        deleted_count = 0
        if ids_to_delete:
            deleted_count = self.repository.mark_unavailable_by_ids(list(ids_to_delete))
        
        db.session.commit()
        
        # Trigger achievement re-evaluation if sauces changed
        if sauces_changed:
            from back.src.interactor.achievement_service import AchievementService
            
            achievement_service = AchievementService()
            king_achievement = self.achievement_repository.by_title("King of the Sauce")
            
            if king_achievement:
                # Check if this is a session-specific achievement
                if not king_achievement.is_global:
                    # Session-specific: only re-evaluate users in this session
                    user_ids_with_achievement = self.user_repository.get_users_with_achievement(king_achievement.id)
                    user_ids_in_session = self.user_repository.get_users_in_session(session.id)
                    users_to_re_evaluate = user_ids_with_achievement & user_ids_in_session
                else:
                    # Global: re-evaluate all users who have this achievement
                    users_to_re_evaluate = self.user_repository.get_users_with_achievement(king_achievement.id)
                
                # Re-evaluate the achievement for each affected user
                for user_id in users_to_re_evaluate:
                    user = self.user_repository.by_id(user_id)
                    if user:
                        eval_session = session if not king_achievement.is_global else (user.sessions[0] if user.sessions else session)
                        achievement_service.re_evaluate_achievement_for_user(
                            user, king_achievement, eval_session
                        )
                
                db.session.commit()
        
        # Get all ingredients after reimport for response
        all_ingredients = self.repository.by_session(session_key)
        
        # Serialize response
        result_ingredients = []
        for ingredient in all_ingredients:
            ingredient_dict = {
                "id": ingredient.id,
                "name": ingredient.name,
                "type": ingredient.type.value if hasattr(ingredient.type, 'value') else int(ingredient.type),
                "available": ingredient.available,
                "meat": ingredient.meat,
                "vegetarian": ingredient.vegetarian,
                "vegan": ingredient.vegan,
                "gluten": ingredient.gluten,
                "histamine": ingredient.histamine,
                "fructose": ingredient.fructose,
                "lactose": ingredient.lactose,
                "session_id": ingredient.session_id
            }
            result_ingredients.append(ingredient_dict)
        
        return {
            "created": len(created_ingredients),
            "updated": len(updated_ingredients),
            "deleted": deleted_count,
            "ingredients": result_ingredients
        }
