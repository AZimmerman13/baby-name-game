"""
First-party analytics: event ingestion helpers and dashboard stats.

Privacy model: no IPs, cookies, or user IDs are stored. Visitors are counted with
a hash of (IP + user agent) keyed by a secret that rotates daily, so the same
person can't be linked across days.
"""
import hashlib
import hmac
import re
from collections import Counter
from datetime import datetime, timedelta, date
from typing import Optional
from urllib.parse import urlparse

from fastapi import Request
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from config import settings
import models
import schemas

ALLOWED_EVENTS = {
    "pageview",
    "Pool Created",
    "Guess Submitted",
    "Pool Revealed",
    "Results Shared",
    "Share Link Copied",
    "Create CTA Clicked",
}

BOT_PATTERN = re.compile(
    r"bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|facebookexternalhit|"
    r"curl|wget|python-requests|httpx|axios|go-http-client|java/",
    re.IGNORECASE,
)

# Referrer hostname fragments grouped into a single source name
SOURCE_GROUPS = [
    ("facebook", "facebook"),
    ("fb.", "facebook"),
    ("instagram", "instagram"),
    ("pinterest", "pinterest"),
    ("pin.it", "pinterest"),
    ("tiktok", "tiktok"),
    ("reddit", "reddit"),
    ("google.", "google"),
    ("bing.", "bing"),
    ("duckduckgo", "duckduckgo"),
    ("yahoo.", "yahoo"),
    ("t.co", "twitter"),
    ("twitter", "twitter"),
    ("x.com", "twitter"),
    ("linkedin", "linkedin"),
    ("lnkd.in", "linkedin"),
    ("mail.", "email"),
    ("outlook", "email"),
]


def client_ip(request: Request) -> str:
    """Real client IP. Behind the nginx proxy, request.client.host is nginx's container IP."""
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "")


def is_bot(user_agent: str) -> bool:
    return not user_agent or bool(BOT_PATTERN.search(user_agent))


def visitor_hash(request: Request) -> str:
    daily_key = hmac.new(
        settings.jwt_secret_key.encode(), date.today().isoformat().encode(), hashlib.sha256
    ).digest()
    identity = f"{client_ip(request)}|{request.headers.get('user-agent', '')}"
    return hmac.new(daily_key, identity.encode(), hashlib.sha256).hexdigest()[:16]


def redact_path(path: Optional[str]) -> Optional[str]:
    """Strip query strings and collapse pool IDs (defense in depth; frontend redacts too)."""
    if not path:
        return None
    path = path.split("?")[0].split("#")[0]
    path = re.sub(r"^/pool/[^/]+", "/pool/:id", path)
    path = re.sub(r"^/results/[^/]+", "/results/:id", path)
    return path[:128]


def normalize_source(event: schemas.EventCreate, request: Request) -> Optional[str]:
    if event.utm_source:
        return re.sub(r"[^a-z0-9_-]", "", event.utm_source.lower())[:32] or None
    if not event.referrer:
        return None
    host = (urlparse(event.referrer).hostname or "").lower()
    own_host = (request.headers.get("host") or "").split(":")[0].lower()
    if not host or host == own_host:
        return None
    for fragment, name in SOURCE_GROUPS:
        if fragment in host:
            return name
    return host.removeprefix("www.")[:64]


def device_type(user_agent: str) -> str:
    return "mobile" if re.search(r"Mobi|Android|iPhone|iPad", user_agent) else "desktop"


def build_event(event: schemas.EventCreate, request: Request) -> Optional[models.Event]:
    """Return an Event to store, or None if it should be dropped."""
    user_agent = request.headers.get("user-agent", "")
    if event.name not in ALLOWED_EVENTS or is_bot(user_agent):
        return None
    return models.Event(
        name=event.name,
        path=redact_path(event.path),
        source=normalize_source(event, request),
        device=device_type(user_agent),
        props=event.props,
        visitor_hash=visitor_hash(request),
    )


def get_stats(db: Session, days: int) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    events = db.query(models.Event).filter(models.Event.created_at >= since)

    def count(name: str) -> int:
        return events.filter(models.Event.name == name).count()

    visitors = events.with_entities(func.count(distinct(models.Event.visitor_hash))).scalar() or 0

    # Daily series (visitors from events; pools/guesses from the real tables so ad blockers can't hide them)
    day = func.date(models.Event.created_at)
    daily_visitors = dict(
        events.with_entities(day, func.count(distinct(models.Event.visitor_hash))).group_by(day).all()
    )
    pool_day = func.date(models.Pool.created_at)
    daily_pools = dict(
        db.query(pool_day, func.count(models.Pool.id))
        .filter(models.Pool.created_at >= since).group_by(pool_day).all()
    )
    guess_day = func.date(models.Guess.submitted_at)
    daily_guesses = dict(
        db.query(guess_day, func.count(models.Guess.id))
        .filter(models.Guess.submitted_at >= since).group_by(guess_day).all()
    )
    daily = []
    for offset in range(days, -1, -1):
        d = (datetime.utcnow() - timedelta(days=offset)).date().isoformat()
        daily.append({
            "date": d,
            "visitors": daily_visitors.get(d, 0),
            "pools": daily_pools.get(d, 0),
            "guesses": daily_guesses.get(d, 0),
        })

    # Traffic sources: unique visitors and pools created per source
    source_visitors = (
        events.with_entities(models.Event.source, func.count(distinct(models.Event.visitor_hash)))
        .group_by(models.Event.source).all()
    )
    source_pools = dict(
        events.filter(models.Event.name == "Pool Created")
        .with_entities(models.Event.source, func.count(models.Event.id))
        .group_by(models.Event.source).all()
    )
    sources = sorted(
        [
            {"source": s or "direct", "visitors": v, "pools_created": source_pools.get(s, 0)}
            for s, v in source_visitors
        ],
        key=lambda row: row["visitors"],
        reverse=True,
    )[:15]

    # Which CTA led to pool creation (props.source), counted in Python for DB portability
    creation_sources = Counter(
        (props or {}).get("source", "direct")
        for (props,) in events.filter(models.Event.name == "Pool Created").with_entities(models.Event.props)
    )
    cta_clicks = Counter(
        (props or {}).get("source", "unknown")
        for (props,) in events.filter(models.Event.name == "Create CTA Clicked").with_entities(models.Event.props)
    )

    top_pages = (
        events.filter(models.Event.name == "pageview")
        .with_entities(models.Event.path, func.count(models.Event.id))
        .group_by(models.Event.path).order_by(func.count(models.Event.id).desc()).limit(10).all()
    )
    devices = dict(
        events.with_entities(models.Event.device, func.count(distinct(models.Event.visitor_hash)))
        .group_by(models.Event.device).all()
    )

    guesses_tracked = count("Guess Submitted")
    viral_creations = sum(n for s, n in creation_sources.items() if s != "direct")

    return {
        "days": days,
        "visitors": visitors,
        "pageviews": count("pageview"),
        "events": {name: count(name) for name in sorted(ALLOWED_EVENTS - {"pageview"})},
        # Authoritative counts from the app's own tables
        "pools_created": db.query(models.Pool).filter(models.Pool.created_at >= since).count(),
        "guesses_submitted": db.query(models.Guess).filter(models.Guess.submitted_at >= since).count(),
        "pools_revealed": db.query(models.Pool).filter(
            models.Pool.created_at >= since, models.Pool.status == models.PoolStatus.REVEALED
        ).count(),
        # Participants who went on to create a pool via a CTA
        "viral_rate": round(viral_creations / guesses_tracked, 4) if guesses_tracked else None,
        "daily": daily,
        "sources": sources,
        "creation_sources": [{"source": s, "count": n} for s, n in creation_sources.most_common()],
        "cta_clicks": [{"source": s, "count": n} for s, n in cta_clicks.most_common()],
        "top_pages": [{"path": p or "(unknown)", "views": n} for p, n in top_pages],
        "devices": devices,
    }
