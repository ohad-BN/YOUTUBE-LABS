from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 declarative base class.
    All models should inherit from this class to be included in the ORM metadata.
    """
    pass
