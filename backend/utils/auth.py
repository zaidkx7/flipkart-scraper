from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from backend.settings.config import AUTH_CONFIG

def verify_password(plain_password, hashed_password):
    """Verify a password against its hash"""
    try:
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
            
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception as e:
        print(f"Error checking password: {e}")
        return False

def get_password_hash(password):
    """Generate password hash"""
    if isinstance(password, str):
        password = password.encode('utf-8')
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, AUTH_CONFIG['secret_key'], algorithm=AUTH_CONFIG['algorithm'])
    return encoded_jwt

def decode_access_token(token: str):
    """Decode JWT access token"""
    try:
        payload = jwt.decode(token, AUTH_CONFIG['secret_key'], algorithms=[AUTH_CONFIG['algorithm']])
        return payload
    except JWTError:
        return None
