from .session import Session
from typing import List

class User:
    
    def __init__(self, id: int):
        self.id = id
        self.sessions: List[Session] = []
        
    def new_session(self):
        """Create a new session for the user."""
        session = Session(len(self.sessions))
        self.sessions.append(session)
        return session
    
    def get_sessions(self):
        """Get all sessions for the user."""
        return self.sessions