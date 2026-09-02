from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    display_on: bool = True


class ApiHealthResponse(BaseModel):
    status: str = "ok"
    database: str = "ok"
    node_agent: str = "unknown"
    docker: str = "unknown"