from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseDTO(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )


class TimingDTO(BaseDTO):
    created_at: datetime
    updated_at: datetime
