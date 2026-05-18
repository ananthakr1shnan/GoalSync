from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import config
from app.routers import auth, employee, achievements, cycles, manager, admin, reports, analytics

app = FastAPI(title="GoalSync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(employee.router, prefix="/api/v1")
app.include_router(achievements.router, prefix="/api/v1")
app.include_router(cycles.router, prefix="/api/v1")
app.include_router(manager.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.on_event("startup")
async def startup():
    from app.scheduler import start_scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    from app.scheduler import stop_scheduler
    stop_scheduler()

