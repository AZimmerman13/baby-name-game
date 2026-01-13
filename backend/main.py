from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List, Optional
from datetime import datetime
import uvicorn

from database import get_db, init_db
from config import settings
import models
import schemas
from scoring import calculate_scores_for_guesses
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    set_auth_cookie,
    clear_auth_cookie
)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="Stork Pool API",
    description="API for baby name, gender, and birthday guessing pools",
    version="1.0.0"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    init_db()


@app.get("/")
def read_root():
    """Root endpoint"""
    return {"message": "Baby Name Guessing Game API", "status": "running"}


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=201)
@limiter.limit("5/hour")
def register(
    request: Request,
    response: Response,
    user_data: schemas.UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    No email verification required - account is immediately active.
    """
    # Check if email already exists
    existing_user = db.query(models.User).filter(
        models.User.email == user_data.email.lower()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    new_user = models.User(
        email=user_data.email.lower(),
        hashed_password=hash_password(user_data.password),
        display_name=user_data.display_name,
        last_login=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create JWT token and set cookie
    access_token = create_access_token(data={"sub": new_user.id})
    set_auth_cookie(response, access_token)

    return new_user


@app.post("/api/auth/login", response_model=schemas.UserResponse)
@limiter.limit("10/hour")
def login(
    request: Request,
    response: Response,
    credentials: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    Sets HTTP-only cookie with JWT token.
    """
    # Find user by email
    user = db.query(models.User).filter(
        models.User.email == credentials.email.lower()
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is disabled"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create JWT token and set cookie
    access_token = create_access_token(data={"sub": user.id})
    set_auth_cookie(response, access_token)

    return user


@app.post("/api/auth/logout")
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def logout(request: Request, response: Response):
    """
    Logout by clearing the authentication cookie.
    """
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me", response_model=schemas.UserResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def get_current_user_info(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """
    Get current authenticated user's information.
    Requires valid JWT token in cookie.
    """
    return current_user


# ==================== POOL ENDPOINTS ====================

@app.post("/api/pool", response_model=schemas.PoolCreatedResponse, status_code=201)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def create_pool(
    request: Request,
    pool_data: schemas.PoolCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Create a new baby name guessing pool.
    If user is authenticated, automatically links pool to their account.
    Anonymous users can still create pools without authentication.
    Returns pool ID and admin token for managing the pool.
    """
    # Create new pool
    new_pool = models.Pool(
        creator_name=pool_data.creator_name,
        user_id=current_user.id if current_user else None,
        enable_name=1 if pool_data.enable_name else 0,
        enable_date=1 if pool_data.enable_date else 0,
        enable_sex=1 if pool_data.enable_sex else 0,
        enable_time=1 if pool_data.enable_time else 0,
        enable_weight=1 if pool_data.enable_weight else 0,
        enable_custom=1 if pool_data.enable_custom else 0,
        due_date=pool_data.due_date,
        custom_category_name=pool_data.custom_category_name
    )
    db.add(new_pool)
    db.commit()
    db.refresh(new_pool)

    # Generate shareable link (will be updated by frontend)
    shareable_link = f"/pool/{new_pool.id}"

    return schemas.PoolCreatedResponse(
        id=new_pool.id,
        creator_name=new_pool.creator_name,
        status=new_pool.status,
        created_at=new_pool.created_at,
        admin_token=new_pool.admin_token,
        shareable_link=shareable_link
    )


@app.get("/api/pool/{pool_id}", response_model=schemas.PoolResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def get_pool(
    request: Request,
    pool_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Get pool details.
    Returns pool info and participant count (hides baby name until revealed, hides other guesses).
    Indicates if current user owns the pool.
    """
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Count participants
    participant_count = db.query(models.Guess).filter(models.Guess.pool_id == pool_id).count()

    # Check if current user owns this pool
    is_owner = current_user is not None and pool.user_id == current_user.id

    return schemas.PoolResponse(
        id=pool.id,
        creator_name=pool.creator_name,
        status=pool.status,
        created_at=pool.created_at,
        participant_count=participant_count,
        enable_name=bool(pool.enable_name),
        enable_date=bool(pool.enable_date),
        enable_sex=bool(pool.enable_sex),
        enable_time=bool(pool.enable_time),
        enable_weight=bool(pool.enable_weight),
        enable_custom=bool(pool.enable_custom),
        due_date=pool.due_date,
        custom_category_name=pool.custom_category_name,
        is_owner=is_owner
    )


@app.post("/api/pool/{pool_id}/guess", status_code=201)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def submit_guess(
    request: Request,
    pool_id: str,
    guess_data: schemas.GuessCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a guess for a pool.
    Validates that the pool exists and is still open.
    Prevents duplicate guesses from the same player.
    """
    # Check if pool exists
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Check if pool is still open
    if pool.status != models.PoolStatus.OPEN:
        raise HTTPException(status_code=400, detail="Pool is no longer accepting guesses")

    # Check for duplicate player in this pool
    existing_guess = db.query(models.Guess).filter(
        models.Guess.pool_id == pool_id,
        models.Guess.player_name == guess_data.player_name
    ).first()

    if existing_guess:
        raise HTTPException(
            status_code=400,
            detail=f"Player '{guess_data.player_name}' has already submitted a guess for this pool"
        )

    # Create new guess
    new_guess = models.Guess(
        pool_id=pool_id,
        player_name=guess_data.player_name,
        guessed_names=guess_data.guessed_names,
        guessed_birth_date=guess_data.guessed_birth_date,
        guessed_sex=guess_data.guessed_sex,
        guessed_birth_time=guess_data.guessed_birth_time,
        guessed_weight=guess_data.guessed_weight,
        guessed_custom_value=guess_data.guessed_custom_value
    )
    db.add(new_guess)
    db.commit()

    return {"message": "Guess submitted successfully", "player_name": guess_data.player_name}


@app.get("/api/pool/{pool_id}/guesses", response_model=List[schemas.GuessDetailResponse])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def get_pool_guesses(
    request: Request,
    pool_id: str,
    admin_token: str,
    db: Session = Depends(get_db)
):
    """
    Get all guesses for a pool (admin only).
    Requires admin token for authorization.
    Returns all guess details including guessed values.
    """
    # Check if pool exists
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Verify admin token
    if pool.admin_token != admin_token:
        raise HTTPException(status_code=403, detail="Invalid admin token")

    # Fetch all guesses for this pool
    guesses = db.query(models.Guess).filter(
        models.Guess.pool_id == pool_id
    ).order_by(models.Guess.submitted_at.asc()).all()

    return guesses


@app.post("/api/pool/{pool_id}/reveal", response_model=schemas.ResultsResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def reveal_name(
    request: Request,
    pool_id: str,
    reveal_data: schemas.PoolReveal,
    db: Session = Depends(get_db)
):
    """
    Reveal the baby name and calculate scores for all guesses.
    Requires admin token for authorization.
    Returns the leaderboard with all scores.
    """
    # Check if pool exists
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Verify admin token
    if pool.admin_token != reveal_data.admin_token:
        raise HTTPException(status_code=403, detail="Invalid admin token")

    # Check if already revealed
    if pool.status == models.PoolStatus.REVEALED:
        raise HTTPException(status_code=400, detail="Pool has already been revealed")

    # Update pool with baby name and status
    pool.baby_name = reveal_data.baby_name
    pool.birth_date = reveal_data.birth_date
    pool.sex = reveal_data.sex
    pool.birth_time = reveal_data.birth_time
    pool.weight = reveal_data.weight
    pool.custom_value = reveal_data.custom_value
    pool.status = models.PoolStatus.REVEALED

    # Get all guesses for this pool
    guesses = db.query(models.Guess).filter(models.Guess.pool_id == pool_id).all()

    if not guesses:
        db.commit()
        return schemas.ResultsResponse(
            pool_id=pool.id,
            baby_name=pool.baby_name,
            creator_name=pool.creator_name,
            leaderboard=[],
            total_participants=0
        )

    # Calculate scores
    scored_guesses = calculate_scores_for_guesses(guesses, pool)

    # Commit scores to database
    db.commit()

    # Build leaderboard
    leaderboard = []
    for rank, guess in enumerate(scored_guesses, start=1):
        leaderboard.append(schemas.LeaderboardEntry(
            rank=rank,
            player_name=guess.player_name,
            guessed_names=guess.guessed_names,
            best_guess=guess.best_guess,
            submitted_at=guess.submitted_at,
            name_score=guess.name_score,
            date_score=guess.date_score,
            sex_score=guess.sex_score,
            time_score=guess.time_score,
            weight_score=guess.weight_score,
            custom_score=guess.custom_score,
            total_score=guess.total_score
        ))

    return schemas.ResultsResponse(
        pool_id=pool.id,
        baby_name=pool.baby_name,
        creator_name=pool.creator_name,
        leaderboard=leaderboard,
        total_participants=len(scored_guesses)
    )


@app.get("/api/pool/{pool_id}/results", response_model=schemas.ResultsResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def get_results(
    request: Request,
    pool_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the results/leaderboard for a revealed pool.
    Only works if the pool has been revealed.
    """
    # Check if pool exists
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Check if pool has been revealed
    if pool.status != models.PoolStatus.REVEALED:
        raise HTTPException(status_code=400, detail="Pool has not been revealed yet")

    # Get all guesses with scores
    guesses = db.query(models.Guess).filter(
        models.Guess.pool_id == pool_id
    ).order_by(models.Guess.total_score.desc(), models.Guess.submitted_at).all()

    # Build leaderboard
    leaderboard = []
    for rank, guess in enumerate(guesses, start=1):
        leaderboard.append(schemas.LeaderboardEntry(
            rank=rank,
            player_name=guess.player_name,
            guessed_names=guess.guessed_names,
            best_guess=guess.best_guess,
            submitted_at=guess.submitted_at,
            name_score=guess.name_score,
            date_score=guess.date_score,
            sex_score=guess.sex_score,
            time_score=guess.time_score,
            weight_score=guess.weight_score,
            custom_score=guess.custom_score,
            total_score=guess.total_score
        ))

    return schemas.ResultsResponse(
        pool_id=pool.id,
        baby_name=pool.baby_name,
        creator_name=pool.creator_name,
        leaderboard=leaderboard,
        total_participants=len(guesses)
    )


# ==================== USER POOL MANAGEMENT ENDPOINTS ====================

@app.get("/api/user/pools", response_model=List[schemas.PoolResponse])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def get_user_pools(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all pools created by the authenticated user.
    Returns pools in reverse chronological order.
    """
    pools = db.query(models.Pool).filter(
        models.Pool.user_id == current_user.id
    ).order_by(models.Pool.created_at.desc()).all()

    # Build response with participant counts and ownership flag
    pool_responses = []
    for pool in pools:
        participant_count = db.query(models.Guess).filter(
            models.Guess.pool_id == pool.id
        ).count()

        pool_response = schemas.PoolResponse(
            id=pool.id,
            creator_name=pool.creator_name,
            status=pool.status,
            created_at=pool.created_at,
            participant_count=participant_count,
            enable_name=bool(pool.enable_name),
            enable_date=bool(pool.enable_date),
            enable_sex=bool(pool.enable_sex),
            enable_time=bool(pool.enable_time),
            enable_weight=bool(pool.enable_weight),
            enable_custom=bool(pool.enable_custom),
            due_date=pool.due_date,
            custom_category_name=pool.custom_category_name,
            is_owner=True
        )
        pool_responses.append(pool_response)

    return pool_responses


@app.post("/api/user/pools/{pool_id}/link", response_model=schemas.PoolResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def link_pool_to_account(
    request: Request,
    pool_id: str,
    link_data: schemas.PoolLinkRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Link an anonymous pool to the user's account using admin token.
    Allows users to claim ownership of pools they created anonymously.
    """
    # Find the pool
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Verify admin token
    if pool.admin_token != link_data.admin_token:
        raise HTTPException(status_code=403, detail="Invalid admin token")

    # Check if pool is already owned
    if pool.user_id:
        raise HTTPException(
            status_code=400,
            detail="Pool is already linked to an account"
        )

    # Link pool to user
    pool.user_id = current_user.id
    db.commit()
    db.refresh(pool)

    # Get participant count
    participant_count = db.query(models.Guess).filter(
        models.Guess.pool_id == pool.id
    ).count()

    return schemas.PoolResponse(
        id=pool.id,
        creator_name=pool.creator_name,
        status=pool.status,
        created_at=pool.created_at,
        participant_count=participant_count,
        enable_name=bool(pool.enable_name),
        enable_date=bool(pool.enable_date),
        enable_sex=bool(pool.enable_sex),
        enable_time=bool(pool.enable_time),
        enable_weight=bool(pool.enable_weight),
        enable_custom=bool(pool.enable_custom),
        due_date=pool.due_date,
        custom_category_name=pool.custom_category_name,
        is_owner=True
    )


@app.patch("/api/user/pools/{pool_id}", response_model=schemas.PoolResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def update_pool(
    request: Request,
    pool_id: str,
    update_data: schemas.PoolUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update pool settings (only for pool owner).
    Allows editing creator name, due date, and custom category name.
    Cannot change enabled categories (would break existing guesses).
    """
    # Find the pool
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Verify ownership
    if pool.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to edit this pool"
        )

    # Cannot edit revealed pools
    if pool.status == models.PoolStatus.REVEALED:
        raise HTTPException(
            status_code=400,
            detail="Cannot edit a revealed pool"
        )

    # Update fields
    if update_data.creator_name is not None:
        pool.creator_name = update_data.creator_name
    if update_data.due_date is not None:
        pool.due_date = update_data.due_date
    if update_data.custom_category_name is not None:
        pool.custom_category_name = update_data.custom_category_name

    db.commit()
    db.refresh(pool)

    # Get participant count
    participant_count = db.query(models.Guess).filter(
        models.Guess.pool_id == pool.id
    ).count()

    return schemas.PoolResponse(
        id=pool.id,
        creator_name=pool.creator_name,
        status=pool.status,
        created_at=pool.created_at,
        participant_count=participant_count,
        enable_name=bool(pool.enable_name),
        enable_date=bool(pool.enable_date),
        enable_sex=bool(pool.enable_sex),
        enable_time=bool(pool.enable_time),
        enable_weight=bool(pool.enable_weight),
        enable_custom=bool(pool.enable_custom),
        due_date=pool.due_date,
        custom_category_name=pool.custom_category_name,
        is_owner=True
    )


@app.delete("/api/user/pools/{pool_id}")
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def delete_pool(
    request: Request,
    pool_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a pool (only for pool owner).
    Cascades to delete all associated guesses.
    """
    # Find the pool
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Verify ownership
    if pool.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this pool"
        )

    # Delete pool (cascades to guesses via relationship)
    db.delete(pool)
    db.commit()

    return {"message": "Pool deleted successfully"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
