from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create database engine
# For SQLite, we use check_same_thread=False to allow multiple threads
# When upgrading to PostgreSQL, simply change the DATABASE_URL
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """Dependency function to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """
    Run schema migrations for existing tables.

    SQLAlchemy's create_all() only creates new tables - it won't add columns
    to existing tables. This function handles adding new columns.

    To add a new column:
    1. Add the column to your model in models.py
    2. Add an entry here: ("table_name", "column_name", "SQLITE_TYPE")
       - Common types: TEXT, INTEGER, REAL, BLOB, DATETIME
    3. Restart the server - the column will be added automatically

    For new tables, just add them to models.py - create_all() handles those.
    """
    migrations = [
        # (table_name, column_name, column_type)
        ("pools", "note", "TEXT"),
    ]

    with engine.connect() as conn:
        for table_name, column_name, column_type in migrations:
            if column_name is None:
                continue  # Skip - this is just a marker for new tables

            # Check if column exists
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            columns = [row[1] for row in result.fetchall()]

            if column_name not in columns:
                print(f"Adding column {column_name} to {table_name}")
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
                conn.commit()


def init_db():
    """Initialize database - create all tables and run migrations"""
    Base.metadata.create_all(bind=engine)
    run_migrations()
