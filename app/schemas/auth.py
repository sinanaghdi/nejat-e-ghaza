from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class OTPRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)
    name: str | None = Field(default=None, min_length=2, max_length=100)


class OTPVerifyRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)
    code: str = Field(min_length=4, max_length=8)


class OTPRequestResponse(BaseModel):
    message: str
    expires_in_seconds: int
    debug_code: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr | None
    phone_number: str | None = None
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    csrf_token: str


class CSRFResponse(BaseModel):
    csrf_token: str
