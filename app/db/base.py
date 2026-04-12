"""
app/db/base.py
───────────────
Single declarative base imported by all models.
Import order matters for Alembic autogenerate — import all models here.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


