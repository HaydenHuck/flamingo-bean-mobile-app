from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints


class AdminLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]


class AdminUserResponse(BaseModel):
    id: int
    email: str
    role: str
    active: bool


class AdminLoginResponse(BaseModel):
    admin: AdminUserResponse
    csrf_token: str


class AdminSessionResponse(BaseModel):
    admin: AdminUserResponse
    csrf_token: str
