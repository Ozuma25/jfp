from decimal import Decimal

from django.test import TestCase

from cart.models import Cart, CartItem
from cart.serializers import CartSerializer
from catalog.models import Category, Product


class CartInclusiveMrpTests(TestCase):
    def test_cart_total_uses_mrp_without_adding_gst(self):
        category = Category.objects.create(name="Gift Boxes", slug="gift-boxes")
        product = Product.objects.create(
            category=category,
            name="Premium Box",
            slug="premium-box",
            sku="JFP-BOX-1",
            hsn_code="481920",
            price=Decimal("100.00"),
            gst_percentage=Decimal("18.00"),
            stock=10,
        )
        cart = Cart.objects.create(session_key="guest-session")
        CartItem.objects.create(cart=cart, product=product, quantity=2)

        data = CartSerializer(cart).data

        self.assertEqual(data["subtotal"], "236.00")
        self.assertEqual(data["total"], "236.00")
        self.assertEqual(data["tax_data"]["gst_amount"], "36.00")
