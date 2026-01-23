from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime, date, time
from typing import Optional, List
from models import PoolStatus


# Pool Schemas
class PoolCreate(BaseModel):
    """Schema for creating a new pool"""
    creator_name: str = Field(..., min_length=1, max_length=40)

    # Category toggles
    enable_name: bool = True
    enable_date: bool = False
    enable_sex: bool = False
    enable_time: bool = False
    enable_weight: bool = False
    enable_custom: bool = False

    # Pool configuration
    due_date: Optional[date] = None
    custom_category_name: Optional[str] = Field(None, max_length=100)
    note: Optional[str] = Field(None, max_length=500)

    @field_validator('creator_name')
    @classmethod
    def validate_creator_name(cls, v):
        if not v.strip():
            raise ValueError('Creator name cannot be empty or whitespace')
        return v.strip()

    @field_validator('custom_category_name')
    @classmethod
    def validate_custom_category_name(cls, v):
        if v and not v.strip():
            raise ValueError('Custom category name cannot be empty or whitespace')
        return v.strip() if v else None

    @model_validator(mode='after')
    def validate_at_least_one_category(self):
        """Ensure at least one category is enabled"""
        if not any([
            self.enable_name,
            self.enable_date,
            self.enable_sex,
            self.enable_time,
            self.enable_weight,
            self.enable_custom
        ]):
            raise ValueError('At least one category must be enabled')
        return self


class PoolReveal(BaseModel):
    """Schema for revealing the baby name and other actual values"""
    baby_name: Optional[str] = Field(None, min_length=1, max_length=40)
    admin_token: str = Field(..., min_length=1)

    # Actual values for other categories (optional based on what's enabled)
    birth_date: Optional[date] = None
    sex: Optional[str] = Field(None, max_length=50)
    birth_time: Optional[time] = None
    weight: Optional[float] = Field(None, gt=0, le=50)  # in pounds, reasonable range
    custom_value: Optional[str] = Field(None, max_length=40)

    @field_validator('baby_name')
    @classmethod
    def validate_baby_name(cls, v):
        if v is None:
            return None
        if not v.strip():
            raise ValueError('Baby name cannot be empty or whitespace')
        return v.strip()

    @field_validator('sex')
    @classmethod
    def validate_sex(cls, v):
        if v and not v.strip():
            raise ValueError('Sex cannot be empty or whitespace')
        return v.strip() if v else None

    @field_validator('custom_value')
    @classmethod
    def validate_custom_value(cls, v):
        if v and not v.strip():
            raise ValueError('Custom value cannot be empty or whitespace')
        return v.strip() if v else None


class PoolResponse(BaseModel):
    """Schema for pool response (without sensitive data)"""
    id: str
    creator_name: str
    status: PoolStatus
    created_at: datetime
    participant_count: int

    # Category toggles (which predictions are enabled)
    enable_name: bool
    enable_date: bool
    enable_sex: bool
    enable_time: bool
    enable_weight: bool
    enable_custom: bool

    # Pool configuration (visible to participants)
    due_date: Optional[date] = None
    custom_category_name: Optional[str] = None
    note: Optional[str] = None

    # Ownership indicator (for frontend logic)
    is_owner: bool = False

    # Admin token (only returned for owned pools)
    admin_token: Optional[str] = None

    class Config:
        from_attributes = True


class PoolCreatedResponse(BaseModel):
    """Schema for pool creation response with admin token"""
    id: str
    creator_name: str
    status: PoolStatus
    created_at: datetime
    admin_token: str
    shareable_link: str

    class Config:
        from_attributes = True


# Guess Schemas
class GuessCreate(BaseModel):
    """Schema for creating a new guess (1-6 names plus optional other predictions)"""
    player_name: str = Field(..., min_length=1, max_length=40)
    guessed_names: List[str] = Field(..., min_length=1, max_length=6)

    # Other predictions (optional - only filled if category enabled)
    guessed_birth_date: Optional[date] = None
    guessed_sex: Optional[str] = Field(None, max_length=50)
    guessed_birth_time: Optional[time] = None
    guessed_weight: Optional[float] = Field(None, gt=0, le=50)  # in pounds
    guessed_custom_value: Optional[str] = Field(None, max_length=40)

    @field_validator('player_name')
    @classmethod
    def validate_player_name(cls, v):
        if not v.strip():
            raise ValueError('Player name cannot be empty or whitespace')
        return v.strip()

    @field_validator('guessed_names')
    @classmethod
    def validate_guessed_names(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Must provide at least 1 name')
        if len(v) > 6:
            raise ValueError('Cannot provide more than 6 names')

        # Validate each name
        cleaned_names = []
        for name in v:
            if not isinstance(name, str):
                raise ValueError('All names must be strings')
            # Allow empty string if it's the only name (for pools without name category)
            if not name.strip() and len(v) > 1:
                raise ValueError('All names must be non-empty strings')
            cleaned_name = name.strip()
            # Enforce 40 character limit
            if len(cleaned_name) > 40:
                raise ValueError('Each name must be 40 characters or less')
            # Only add non-empty names to the list
            if cleaned_name:
                cleaned_names.append(cleaned_name)

        # If all names were empty, return a list with one empty string
        if not cleaned_names:
            return ['']

        # Check for duplicates (excluding empty strings)
        if len(cleaned_names) != len(set(cleaned_names)):
            raise ValueError('Duplicate names are not allowed')

        return cleaned_names

    @field_validator('guessed_sex')
    @classmethod
    def validate_guessed_sex(cls, v):
        if v and not v.strip():
            raise ValueError('Guessed sex cannot be empty or whitespace')
        return v.strip() if v else None

    @field_validator('guessed_custom_value')
    @classmethod
    def validate_guessed_custom_value(cls, v):
        if v and not v.strip():
            raise ValueError('Guessed custom value cannot be empty or whitespace')
        return v.strip() if v else None


class GuessResponse(BaseModel):
    """Schema for guess response (without the actual guess before reveal)"""
    id: int
    player_name: str
    submitted_at: datetime

    class Config:
        from_attributes = True


class GuessDetailResponse(BaseModel):
    """Schema for admin view of guess details (before reveal)"""
    id: int
    player_name: str
    guessed_names: List[str]
    guessed_birth_date: Optional[date] = None
    guessed_sex: Optional[str] = None
    guessed_birth_time: Optional[time] = None
    guessed_weight: Optional[float] = None
    guessed_custom_value: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True


class GuessResultResponse(BaseModel):
    """Schema for guess with score (after reveal)"""
    id: int
    player_name: str
    guessed_names: List[str]
    best_guess: str
    submitted_at: datetime
    score: float

    class Config:
        from_attributes = True


# Results Schemas
class LeaderboardEntry(BaseModel):
    """Schema for leaderboard entry with individual category scores"""
    rank: int
    player_name: str
    guessed_names: List[str]
    best_guess: Optional[str] = None
    submitted_at: datetime

    # Individual scores for each category
    name_score: Optional[float] = None
    date_score: Optional[float] = None
    sex_score: Optional[float] = None
    time_score: Optional[float] = None
    weight_score: Optional[float] = None
    custom_score: Optional[float] = None
    total_score: Optional[float] = None


class ResultsResponse(BaseModel):
    """Schema for results/leaderboard response"""
    pool_id: str
    baby_name: str
    creator_name: str
    leaderboard: List[LeaderboardEntry]
    total_participants: int

    class Config:
        from_attributes = True


# User Authentication Schemas
class UserRegister(BaseModel):
    """Schema for user registration"""
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Basic email validation"""
        v = v.strip().lower()
        if '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError('Invalid email format')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        if not v.strip():
            raise ValueError('Display name cannot be empty')
        return v.strip()


class UserLogin(BaseModel):
    """Schema for user login"""
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return v.strip().lower()


class UserResponse(BaseModel):
    """Schema for user response (public info only)"""
    id: str
    email: str
    display_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class PoolLinkRequest(BaseModel):
    """Schema for linking an anonymous pool to user account"""
    admin_token: str = Field(..., min_length=1)


class PoolUpdateRequest(BaseModel):
    """Schema for updating pool settings"""
    creator_name: Optional[str] = Field(None, min_length=1, max_length=100)
    due_date: Optional[date] = None
    custom_category_name: Optional[str] = Field(None, max_length=100)

    @field_validator('creator_name')
    @classmethod
    def validate_creator_name(cls, v):
        if v and not v.strip():
            raise ValueError('Creator name cannot be empty')
        return v.strip() if v else None

    @field_validator('custom_category_name')
    @classmethod
    def validate_custom_category_name(cls, v):
        if v and not v.strip():
            raise ValueError('Custom category name cannot be empty')
        return v.strip() if v else None


# Password Reset Schemas
class ForgotPasswordRequest(BaseModel):
    """Schema for requesting a password reset"""
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError('Invalid email format')
        return v


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with token"""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class VerifyResetTokenRequest(BaseModel):
    """Schema for verifying a reset token"""
    token: str = Field(..., min_length=1)
