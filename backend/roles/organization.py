from typing import List
from .user import User

class Organization:
    
    def __init__(self):
        self.users: List[User] = []
        
    def new_user(self):
        """Create a new user for the organization."""
        user = User(id=len(self.users))
        self.users.append(user)
        return user
    
    def get_user(self, user_id: int):
        """Get a specific user by ID."""
        return self.users[user_id]
    
    def get_users(self):
        """Get all users in the organization."""
        return [user.id for user in self.users]