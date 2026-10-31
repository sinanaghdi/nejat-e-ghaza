from app.db.models.food_offer import FoodOffer
from app.db.models.order_item import OrderItem


def test_orm_metadata_matches_check_constraints_in_initial_migrations():
    offer_constraints = {constraint.name for constraint in FoodOffer.__table__.constraints}
    assert {
        "ck_food_offers_original_price_positive",
        "ck_food_offers_sale_price_positive",
        "ck_food_offers_sale_lte_original",
        "ck_food_offers_quantity_positive",
        "ck_food_offers_available_nonnegative",
    }.issubset(offer_constraints)

    item_constraints = {constraint.name for constraint in OrderItem.__table__.constraints}
    assert "ck_order_items_quantity_positive" in item_constraints
