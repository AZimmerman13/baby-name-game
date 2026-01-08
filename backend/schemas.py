from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from models import PoolStatus


# Pool Schemas
class PoolCreate(BaseModel):
    """Schema for creating a new pool"""
    creator_name: str = Field(..., min_length=1, max_length=100)

    @field_validator('creator_name')
    @classmethod
    def validate_creator_name(cls, v):
        if not v.strip():
            raise ValueError('Creator name cannot be empty or whitespace')
        return v.strip()


class PoolReveal(BaseModel):
    """Schema for revealing the baby name"""
    baby_name: str = Field(..., min_length=1, max_length=100)
    admin_token: str = Field(..., min_length=1)

    @field_validator('baby_name')
    @classmethod
    def validate_baby_name(cls, v):
        if not v.strip():
            raise ValueError('Baby name cannot be empty or whitespace')
        return v.strip()


class PoolResponse(BaseModel):
    """Schema for pool response (without sensitive data)"""
    id: str
    creator_name: str
    status: PoolStatus
    created_at: datetime
    participant_count: int

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
    """Schema for creating a new guess (1-5 names)"""
    player_name: str = Field(..., min_length=1, max_length=100)
    guessed_names: List[str] = Field(..., min_length=1, max_length=5)

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
        if len(v) > 5:
            raise ValueError('Cannot provide more than 5 names')

        # Validate each name
        cleaned_names = []
        for name in v:
            if not isinstance(name, str) or not name.strip():
                raise ValueError('All names must be non-empty strings')
            cleaned_name = name.strip()
            if len(cleaned_name) > 100:
                raise ValueError('Each name must be 100 characters or less')
            cleaned_names.append(cleaned_name)

        # Check for duplicates
        if len(cleaned_names) != len(set(cleaned_names)):
            raise ValueError('Duplicate names are not allowed')

        return cleaned_names


class GuessResponse(BaseModel):
    """Schema for guess response (without the actual guess before reveal)"""
    id: int
    player_name: str
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
    """Schema for leaderboard entry"""
    rank: int
    player_name: str
    guessed_names: List[str]
    best_guess: str
    score: float
    submitted_at: datetime


class ResultsResponse(BaseModel):
    """Schema for results/leaderboard response"""
    pool_id: str
    baby_name: str
    creator_name: str
    leaderboard: List[LeaderboardEntry]
    total_participants: int

    class Config:
        from_attributes = True
