"""Database Configuration"""
import os
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BACKEND_DIR, '.env')

if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)

DATABASE_CONFIG = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DB'),
}

AUTH_CONFIG = {
    'secret_key': os.getenv('SECRET_KEY'),
    'algorithm': os.getenv('ALGORITHM'),
    'access_token_expire_minutes': int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES')),
    'admin_username': os.getenv('ADMIN_USERNAME'),
    'admin_password': os.getenv('ADMIN_PASSWORD'),
    'admin_email': os.getenv('ADMIN_EMAIL'),
}

def get_database_url():
    """Get the database connection URL"""
    return f"mysql+pymysql://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}/{DATABASE_CONFIG['database']}"

DB_URL = get_database_url()