from sqlalchemy import (
    Column, Integer, String, DateTime,
    func, Index, Float
)
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Products(Base):
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(String(128), unique=True)
    title = Column(String(128))
    url = Column(String(128))
    rating = Column(JSON)
    specifications = Column(JSON)
    media = Column(JSON)
    pricing = Column(JSON)
    category = Column(String(128))
    warrantySummary = Column(String(128))
    availability = Column(String(128))
    source = Column(String(32), nullable=False, index=True)
    time_update = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp(), nullable=False)

    __table_args__ = (
        Index('idx_source', 'source', 'id'),
        Index('ix_time', 'time_update'),
    )


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Integer, default=1)  # Using Integer for boolean compatibility in some MySQL versions/drivers, or just Boolean
    role = Column(String(20), default="user")  # 'admin' or 'user'
    created_at = Column(DateTime, default=func.current_timestamp())
