from pydantic import BaseModel


class ProjectOut(BaseModel):
    id: str
    name: str
    node_id: str
    path: str
    type: str = "git"
    branch: str | None = None
    git_status: str | None = None  # clean | dirty | not_found | not_a_repo | error | unconfigured
    health: str | None = None  # healthy | dirty | error | unknown
    modified: int = 0
    remote: str | None = None
    ahead: int | None = None
    behind: int | None = None
    head: str | None = None  # full (40-char) HEAD sha
    last_commit: str | None = None  # short hash
    last_commit_subject: str | None = None
    last_commit_time: str | None = None