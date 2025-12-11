from flask import request
from random import sample
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth, get_current_user
from back.src.repository.pan_repository import PanRepository
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository
from back.src.api.serializer import serialize_single, serialize_collection
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
        
        selected_ingredients = sample(fills, num_fill) + sample(sauces, num_sauce)
        
        # Generate pan name
        r = RandomWord()
        pan_name = f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan"
        
        # Get preparation type if requested
        preparation_type_id = attributes.get('preparation_type_id')
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
        
        # Create pan
        pan = Pan(
            name=pan_name,
            ingredients=selected_ingredients,
            user_id=user.id,
            session_id=session.id,
            preparation_type_id=preparation_type_id
        )
        db.session.add(pan)
        db.session.commit()
        
        # Evaluate achievements for this pan
        from back.src.interactor.achievement_service import AchievementService
        achievement_service = AchievementService()
        achievement_service.evaluate_achievements_for_pan(pan, user)
        db.session.commit()
        
        return serialize_single(pan, "pan")
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_pans(self):
        """List pans, optionally filtered by session.
        
        Query parameters:
        - session_key: Optional session key to filter by
        
        :returns List[Pan]: List of pans
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        session_key = request.args.get('session_key')
        
        if session_key:
            pans = self.repository.by_session(session_key)
        else:
            pans = self.repository.all()
        
        return serialize_collection(pans, "pan")
    
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
        pan = self.repository.by_id(pan_id)
        if not pan:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Pan not found",
                detail="The specified pan does not exist"
            )
        
        return serialize_single(pan, "pan")
    
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
