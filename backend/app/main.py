from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.api import auth, users, dashboard, tickets, tasks, documents, knowledge, search, reports, helpdesk, audit, notes

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CASCO IT Support & Agent Work Management Portal Backend API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory
os.makedirs(settings.UPLOADS_DATA_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DATA_DIR), name="uploads")

# Include API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(tickets.router)
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(knowledge.router)
app.include_router(search.router)
app.include_router(reports.router)
app.include_router(helpdesk.router)
app.include_router(audit.router)
app.include_router(notes.router)

# Secure Global Exception Handler (Never expose raw stack traces)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred while processing your request. Please try again or contact system support.",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )

@app.get("/")
def root_check():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "helpdesk_integration": "READ-ONLY",
        "docs_url": "/api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
