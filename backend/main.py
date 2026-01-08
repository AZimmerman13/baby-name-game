from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List
import uvicorn

from database import get_db, init_db
from config import settings
import models
import schemas
from scoring import calculate_scores_for_guesses

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="Baby Name Guessing Game API",
    description="API for a fun baby name guessing game with friends",
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


@app.post("/api/pool", response_model=schemas.PoolCreatedResponse, status_code=201)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def create_pool(
    request: Request,
    pool_data: schemas.PoolCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new baby name guessing pool.
    Returns pool ID and admin token for managing the pool.
    """
    # Create new pool
    new_pool = models.Pool(
        creator_name=pool_data.creator_name
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
    db: Session = Depends(get_db)
):
    """
    Get pool details.
    Returns pool info and participant count (hides baby name until revealed, hides other guesses).
    """
    pool = db.query(models.Pool).filter(models.Pool.id == pool_id).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    # Count participants
    participant_count = db.query(models.Guess).filter(models.Guess.pool_id == pool_id).count()

    return schemas.PoolResponse(
        id=pool.id,
        creator_name=pool.creator_name,
        status=pool.status,
        created_at=pool.created_at,
        participant_count=participant_count
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
        guessed_names=guess_data.guessed_names
    )
    db.add(new_guess)
    db.commit()

    return {"message": "Guess submitted successfully", "player_name": guess_data.player_name}


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
    scored_guesses = calculate_scores_for_guesses(guesses, reveal_data.baby_name)

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
            score=guess.score,
            submitted_at=guess.submitted_at
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
    ).order_by(models.Guess.score.desc(), models.Guess.submitted_at).all()

    # Build leaderboard
    leaderboard = []
    for rank, guess in enumerate(guesses, start=1):
        leaderboard.append(schemas.LeaderboardEntry(
            rank=rank,
            player_name=guess.player_name,
            guessed_names=guess.guessed_names,
            best_guess=guess.best_guess,
            score=guess.score,
            submitted_at=guess.submitted_at
        ))

    return schemas.ResultsResponse(
        pool_id=pool.id,
        baby_name=pool.baby_name,
        creator_name=pool.creator_name,
        leaderboard=leaderboard,
        total_participants=len(guesses)
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
