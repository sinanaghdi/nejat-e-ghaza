from enum import Enum

class UserRole(str, Enum):
    CUSTOMER = "CUSTOMER"
    MERCHANT = "MERCHANT"
    ADMIN = "ADMIN"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
