from sqlalchemy import Column, String, DateTime, Date, Time, Float, ForeignKey, Enum, Integer, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from database import Base


class PoolStatus(str, enum.Enum):
    """Pool status enum"""
    OPEN = "open"
    REVEALED = "revealed"


class User(Base):
    """User model for authenticated accounts"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Integer, default=1, nullable=False)  # 1 = active, 0 = disabled

    # Relationship to pools
    pools = relationship("Pool", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, display_name={self.display_name})>"


class Pool(Base):
    """Pool model for baby prediction pool"""
    __tablename__ = "pools"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_name = Column(String, nullable=False)

    # Optional user ownership
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)

    # Category toggles (which predictions are enabled)
    enable_name = Column(Integer, default=1, nullable=False)  # 0 = disabled, 1 = enabled
    enable_date = Column(Integer, default=0, nullable=False)  # 0 = disabled, 1 = enabled
    enable_sex = Column(Integer, default=0, nullable=False)
    enable_time = Column(Integer, default=0, nullable=False)
    enable_weight = Column(Integer, default=0, nullable=False)
    enable_custom = Column(Integer, default=0, nullable=False)

    # Pool configuration (visible to participants)
    due_date = Column(Date, nullable=True)  # Expected due date (shown if enable_date=1)
    custom_category_name = Column(String, nullable=True)  # e.g., "Hair Color" (used if enable_custom=1)
    note = Column(String, nullable=True)  # Optional note from creator to participants

    # Actual values (null until revealed)
    baby_name = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    sex = Column(String, nullable=True)  # "boy", "girl", "other"
    birth_time = Column(Time, nullable=True)
    weight = Column(Float, nullable=True)  # in pounds
    custom_value = Column(String, nullable=True)  # Value for custom category

    status = Column(Enum(PoolStatus), default=PoolStatus.OPEN, nullable=False)
    admin_token = Column(String, nullable=False, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="pools")
    guesses = relationship("Guess", back_populates="pool", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Pool(id={self.id}, creator={self.creator_name}, status={self.status})>"


class Guess(Base):
    """Guess model for storing participant predictions"""
    __tablename__ = "guesses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pool_id = Column(String, ForeignKey("pools.id"), nullable=False)
    player_name = Column(String, nullable=False)

    # Name predictions (up to 6 names)
    guessed_names = Column(JSON, nullable=False)  # Array of 1-6 names
    best_guess = Column(String, nullable=True)  # The name that got the best score

    # Other predictions (nullable - only filled if category enabled)
    guessed_birth_date = Column(Date, nullable=True)
    guessed_sex = Column(String, nullable=True)  # "boy", "girl", "other"
    guessed_birth_time = Column(Time, nullable=True)
    guessed_weight = Column(Float, nullable=True)  # in pounds
    guessed_custom_value = Column(String, nullable=True)

    # Individual scores for each category
    name_score = Column(Float, nullable=True)
    date_score = Column(Float, nullable=True)
    sex_score = Column(Float, nullable=True)
    time_score = Column(Float, nullable=True)
    weight_score = Column(Float, nullable=True)
    custom_score = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)  # Sum of all enabled category scores

    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    pool = relationship("Pool", back_populates="guesses")

    def __repr__(self):
        return f"<Guess(player={self.player_name}, total_score={self.total_score})>"


class PasswordResetToken(Base):
    """Password reset token for email-based password recovery"""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, nullable=False, unique=True)  # SHA-256 hash of token
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)  # Set when token is used (one-time use)

    # Relationship
    user = relationship("User")

    def __repr__(self):
        return f"<PasswordResetToken(user_id={self.user_id}, expires_at={self.expires_at})>"
