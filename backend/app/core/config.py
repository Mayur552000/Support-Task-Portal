import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "CASCO IT Support & Agent Work Management Portal"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "casco-it-portal-super-secret-jwt-key-2026-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours session

    # File paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    CURRENT_DATA_DIR: str = os.path.join(DATA_DIR, "current")
    BACKUP_DATA_DIR: str = os.path.join(DATA_DIR, "backup")
    UPLOADS_DATA_DIR: str = os.path.join(DATA_DIR, "uploads")
    EXCEL_FILE_PATH: str = os.path.join(CURRENT_DATA_DIR, "support_data.xlsx")

    # Freshdesk API Integration — cascoauto.freshdesk.com (Strictly READ-ONLY)
    # Token is Basic-Auth: api_key + 'X'. Never expose this in the frontend.
    HELPDESK_API_URL: str = os.getenv("HELPDESK_API_URL", "https://cascoauto.freshdesk.com/api/v2")
    HELPDESK_API_TOKEN: str = os.getenv("HELPDESK_API_TOKEN", "0T6WiOFCkVs25ldcbJcx")
    # Set HELPDESK_MOCK_MODE=true in .env to use cached data without live API calls
    HELPDESK_MOCK_MODE: bool = os.getenv("HELPDESK_MOCK_MODE", "false").lower() == "true"

    # Rules
    STALE_TICKET_DAYS: int = 3

settings = Settings()

os.makedirs(settings.CURRENT_DATA_DIR, exist_ok=True)
os.makedirs(settings.BACKUP_DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOADS_DATA_DIR, exist_ok=True)
