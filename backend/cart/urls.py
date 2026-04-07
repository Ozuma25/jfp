from django.urls import path

from cart import views

urlpatterns = [
    path("cart/", views.CartDetailView.as_view(), name="cart-detail"),
    path("cart/items/", views.CartItemListView.as_view(), name="cart-items"),
    path("cart/items/<int:item_id>/", views.CartItemDetailView.as_view(), name="cart-item-detail"),
]
