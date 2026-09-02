from pydantic import BaseModel


class PowerOut(BaseModel):
    state: str
    battery: int | None = None
    charging: bool | None = None
    sleep_supported: bool = True