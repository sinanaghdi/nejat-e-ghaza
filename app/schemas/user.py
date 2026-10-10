from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.enums import UserRole

class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr | None
    role: UserRole

class RoleUpdate(BaseModel):
    role: UserRole
