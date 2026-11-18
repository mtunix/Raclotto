import unittest
import json
from back.src.driver.app import App
from back.src.driver.config import ConfigInMemory
from back.src.driver.database import db
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.entity.pan import Pan
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.auth.jwt import generate_token
from back.src.entity.user_achievement_progress import UserAchievementProgress
from back.src.entity.user import user_achievements


class TestAchievementApi(unittest.TestCase):
    """Test achievement API endpoints."""
    
    def setUp(self):
        """Set up test database and app."""
        self.app = App("test-app", db, ConfigInMemory)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Create test user
        from back.src.auth.password import hash_password
        self.test_user = User(
            name="testuser",
            email="test@example.com",
            password=hash_password("password123")
        )
        db.session.add(self.test_user)
        db.session.flush()
        
        # Generate JWT token for test user
        secret_key = self.app.config.get('JWT_SECRET_KEY')
        self.auth_token = generate_token(self.test_user.id, secret_key)
        self.auth_headers = {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
        }
        
        # Create test session
        self.test_session = RaclottoSession(
            key="test-session-key",
            name="Test Session",
            created_by_user_id=self.test_user.id
        )
        db.session.add(self.test_session)
        db.session.flush()
        
        # Create test achievement
        self.test_achievement = Achievement(
            title="Local Guide",
            description="Bewerte 10 Pfannen",
            value=3,
            hidden=False
        )
        db.session.add(self.test_achievement)
        db.session.flush()
        
        # Initialize achievement registry
        from back.src.interactor.achievement_registry import initialize_registry
        initialize_registry()
        
        db.session.commit()
    
    def tearDown(self):
        """Clean up after tests."""
        db.session.remove()
        self.app_context.pop()
    
    def test_list_achievements_requires_auth(self):
        """Test that listing achievements requires authentication."""
        headers = {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
        }
        response = self.client.get('/api/achievements', headers=headers)
        self.assertEqual(response.status_code, 401)
    
    def test_list_achievements_with_auth(self):
        """Test listing achievements with authentication."""
        response = self.client.get('/api/achievements', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)
        self.assertGreater(len(data['data']), 0)
    
    def test_list_achievements_includes_unlocked_field(self):
        """Test that achievements response includes unlocked field."""
        response = self.client.get('/api/achievements', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        achievements = data['data']
        
        # Check that at least one achievement has the unlocked field
        found_unlocked = False
        for achievement in achievements:
            if 'attributes' in achievement:
                if 'unlocked' in achievement['attributes']:
                    found_unlocked = True
                    self.assertIsInstance(achievement['attributes']['unlocked'], bool)
        
        self.assertTrue(found_unlocked, "No achievement has 'unlocked' field in attributes")
    
    def test_list_achievements_includes_progress_field(self):
        """Test that achievements response includes progress field."""
        response = self.client.get('/api/achievements', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        achievements = data['data']
        
        # Check that at least one achievement has the progress field
        found_progress = False
        for achievement in achievements:
            if 'attributes' in achievement:
                if 'progress' in achievement['attributes']:
                    found_progress = True
                    progress = achievement['attributes']['progress']
                    # Progress should be None or a number between 0 and 1
                    if progress is not None:
                        self.assertIsInstance(progress, (int, float))
                        self.assertGreaterEqual(progress, 0.0)
                        self.assertLessEqual(progress, 1.0)
        
        self.assertTrue(found_progress, "No achievement has 'progress' field in attributes")
    
    def test_achievement_progress_after_rating(self):
        """Test that progress is calculated correctly after creating ratings."""
        # Create a pan first
        test_ingredient = Ingredient(
            name="Test Ingredient",
            type=IngredientType.FILL,
            vegan=True,
            session_id=self.test_session.id
        )
        db.session.add(test_ingredient)
        db.session.flush()
        
        test_pan = Pan(
            name="Test Pan",
            user_id=self.test_user.id,
            session_id=self.test_session.id
        )
        test_pan.ingredients.append(test_ingredient)
        db.session.add(test_pan)
        db.session.commit()
        
        # Create 3 ratings through API (should give 30% progress for Local Guide)
        for i in range(3):
            rating_data = {
                "data": {
                    "type": "rating",
                    "attributes": {
                        "rating": 5,
                        "pan_id": test_pan.id
                    }
                }
            }
            response = self.client.post(
                f'/api/ratings?session_key={self.test_session.key}',
                data=json.dumps(rating_data),
                headers=self.auth_headers
            )
            # Rating API returns 200, not 201
            self.assertIn(response.status_code, [200, 201], f"Expected 200 or 201, got {response.status_code}")
        
        # Get achievements and check progress
        response = self.client.get('/api/achievements', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        achievements = data['data']
        
        # Find Local Guide achievement
        local_guide = None
        for achievement in achievements:
            if achievement.get('attributes', {}).get('title') == 'Local Guide':
                local_guide = achievement
                break
        
        self.assertIsNotNone(local_guide, "Local Guide achievement not found")
        
        # Check progress (3/10 = 0.3)
        progress = local_guide.get('attributes', {}).get('progress')
        self.assertIsNotNone(progress, "Progress should not be None")
        self.assertAlmostEqual(progress, 0.3, places=2)
    
    def test_achievement_unlocked_after_10_ratings(self):
        """Test that achievement is unlocked after 10 ratings."""
        # Create a pan first
        test_ingredient = Ingredient(
            name="Test Ingredient",
            type=IngredientType.FILL,
            vegan=True,
            session_id=self.test_session.id
        )
        db.session.add(test_ingredient)
        db.session.flush()
        
        test_pan = Pan(
            name="Test Pan",
            user_id=self.test_user.id,
            session_id=self.test_session.id
        )
        test_pan.ingredients.append(test_ingredient)
        db.session.add(test_pan)
        db.session.commit()
        
        # Create 10 ratings (should unlock Local Guide)
        # Need to create them through the API to trigger achievement evaluation
        for i in range(10):
            rating_data = {
                "data": {
                    "type": "rating",
                    "attributes": {
                        "rating": 5,
                        "pan_id": test_pan.id
                    }
                }
            }
            response = self.client.post(
                f'/api/ratings?session_key={self.test_session.key}',
                data=json.dumps(rating_data),
                headers=self.auth_headers
            )
            # Rating API returns 200, not 201
            self.assertIn(response.status_code, [200, 201], f"Expected 200 or 201, got {response.status_code}")
        
        # Get achievements and check unlocked status
        response = self.client.get('/api/achievements', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        achievements = data['data']
        
        # Find Local Guide achievement
        local_guide = None
        for achievement in achievements:
            if achievement.get('attributes', {}).get('title') == 'Local Guide':
                local_guide = achievement
                break
        
        self.assertIsNotNone(local_guide, "Local Guide achievement not found")
        
        # Check unlocked status
        unlocked = local_guide.get('attributes', {}).get('unlocked')
        self.assertTrue(unlocked, "Local Guide should be unlocked after 10 ratings")
        
        # Check progress (should be 1.0 when unlocked)
        progress = local_guide.get('attributes', {}).get('progress')
        self.assertIsNotNone(progress)
        self.assertAlmostEqual(progress, 1.0, places=2)
    
    def test_get_achievement_by_id_requires_auth(self):
        """Test that getting achievement by ID requires authentication."""
        headers = {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
        }
        response = self.client.get(f'/api/achievements/{self.test_achievement.id}', headers=headers)
        self.assertEqual(response.status_code, 401)
    
    def test_get_achievement_by_id_with_auth(self):
        """Test getting achievement by ID with authentication."""
        response = self.client.get(
            f'/api/achievements/{self.test_achievement.id}',
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertEqual(data['data']['id'], str(self.test_achievement.id))
    
    def test_achievement_response_structure(self):
        """Test the actual structure of the achievement response to debug progress issue."""
        response = self.client.get('/api/achievements', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        print("\n=== Achievement API Response Structure ===")
        print(f"Response keys: {data.keys()}")
        
        if 'data' in data and len(data['data']) > 0:
            first_achievement = data['data'][0]
            print(f"\nFirst achievement keys: {first_achievement.keys()}")
            print(f"First achievement: {json.dumps(first_achievement, indent=2)}")
            
            if 'attributes' in first_achievement:
                attrs = first_achievement['attributes']
                print(f"\nAttributes keys: {attrs.keys()}")
                print(f"Has 'unlocked': {'unlocked' in attrs}")
                print(f"Has 'progress': {'progress' in attrs}")
                if 'unlocked' in attrs:
                    print(f"  unlocked value: {attrs['unlocked']} (type: {type(attrs['unlocked'])})")
                if 'progress' in attrs:
                    print(f"  progress value: {attrs['progress']} (type: {type(attrs['progress'])})")
        
        # Find Local Guide specifically
        local_guide = None
        for achievement in data.get('data', []):
            if achievement.get('attributes', {}).get('title') == 'Local Guide':
                local_guide = achievement
                break
        
        if local_guide:
            print(f"\n=== Local Guide Achievement ===")
            print(json.dumps(local_guide, indent=2))
            attrs = local_guide.get('attributes', {})
            print(f"\nLocal Guide attributes:")
            print(f"  unlocked: {attrs.get('unlocked')}")
            print(f"  progress: {attrs.get('progress')}")
        
        # This test always passes - it's just for debugging
        self.assertTrue(True)


if __name__ == '__main__':
    unittest.main()
