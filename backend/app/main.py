from fastapi import FastAPI
from app.api.v1.project.router import router as project_router

app = FastAPI()
app.include_router(project_router) 