import os
from dotenv import load_dotenv

load_dotenv()


def env_flag(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {'1', 'true', 'yes', 'on'}

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-key-1234567890abcdef')
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///visishop.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = env_flag('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    WTF_CSRF_ENABLED = env_flag('WTF_CSRF_ENABLED', False)
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
