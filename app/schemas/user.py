from pydantic import BaseModel, ConfigDict
from app.models.enums import UserRole

class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: UserRole

class RoleUpdate(BaseModel):
    role: UserRole
