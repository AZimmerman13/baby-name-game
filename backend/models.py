from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Enum, Integer, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from database import Base


class PoolStatus(str, enum.Enum):
    """Pool status enum"""
    OPEN = "open"
    REVEALED = "revealed"


class Pool(Base):
    """Pool model for baby name guessing game"""
    __tablename__ = "pools"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_name = Column(String, nullable=False)
    baby_name = Column(String, nullable=True)  # Null until revealed
    status = Column(Enum(PoolStatus), default=PoolStatus.OPEN, nullable=False)
    admin_token = Column(String, nullable=False, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    guesses = relationship("Guess", back_populates="pool", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Pool(id={self.id}, creator={self.creator_name}, status={self.status})>"


class Guess(Base):
    """Guess model for storing participant guesses (up to 6 names)"""
    __tablename__ = "guesses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pool_id = Column(String, ForeignKey("pools.id"), nullable=False)
    player_name = Column(String, nullable=False)
    guessed_names = Column(JSON, nullable=False)  # Array of 1-6 names
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    score = Column(Float, nullable=True)  # Best score from all guesses
    best_guess = Column(String, nullable=True)  # The name that got the best score

    # Relationship
    pool = relationship("Pool", back_populates="guesses")

    def __repr__(self):
        return f"<Guess(player={self.player_name}, guesses={self.guessed_names}, score={self.score})>"
