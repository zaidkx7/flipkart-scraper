from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.alchemy.models import Base, User
from backend.settings.config import get_database_url, AUTH_CONFIG
from backend.utils.auth import get_password_hash

def create_tables():
    """Create tables for database and seed admin user"""
    try:
        engine = create_engine(get_database_url())
        Base.metadata.create_all(engine)
        print("Tables created successfully!")

        # Seed Admin User
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        try:
            admin = db.query(User).filter(User.username == AUTH_CONFIG['admin_username']).first()
            if not admin:
                print("Creating admin user...")
                hashed_pwd = get_password_hash(AUTH_CONFIG['admin_password'])
                new_admin = User(
                    username=AUTH_CONFIG['admin_username'],
                    email=AUTH_CONFIG['admin_email'],
                    hashed_password=hashed_pwd,
                    role="admin",
                    is_active=1
                )
                db.add(new_admin)
                db.commit()
                print(f"Admin user '{AUTH_CONFIG['admin_username']}' created successfully.")
            else:
                print("Admin user already exists.")
        except Exception as e:
            print(f"Error seeding admin user: {str(e)}")
        finally:
            db.close()

    except Exception as e:
        print(f"Error creating tables: {str(e)}")

if __name__ == "__main__":
    create_tables()