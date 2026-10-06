from pydantic import BaseModel, ConfigDict, Field, field_validator

class MerchantCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    address: str = Field(min_length=3, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

class MerchantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    business_name: str
    description: str | None
    address: str
    city: str
    latitude: float | None
    longitude: float | None


class MerchantUpdate(BaseModel):
    business_name: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    address: str = Field(min_length=3, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

