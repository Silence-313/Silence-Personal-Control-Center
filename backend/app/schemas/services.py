from pydantic import BaseModel


class DockerContainerCounts(BaseModel):
    total: int = 0
    running: int = 0
    stopped: int = 0
    paused: int = 0


class DockerDisk(BaseModel):
    images_bytes: int = 0
    containers_bytes: int = 0
    volumes_bytes: int = 0
    build_cache_bytes: int = 0


class DockerSummary(BaseModel):
    version: str | None = None
    daemon_running: bool = False
    containers: DockerContainerCounts = DockerContainerCounts()
    disk: DockerDisk = DockerDisk()


class ContainerOut(BaseModel):
    name: str
    image: str
    status: str  # running | stopped | paused
    status_text: str = ""
    ports: list[str] = []
    created_at: str = ""


class ServicesOut(BaseModel):
    docker: DockerSummary
    containers: list[ContainerOut] = []