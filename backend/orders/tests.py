from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import Category, Product
from orders.models import Order, OrderLine


class OrderLineInclusiveMrpTests(TestCase):
    def test_order_line_keeps_mrp_as_line_total(self):
        user = get_user_model().objects.create_user(
            username="buyer",
            email="buyer@example.com",
            password="password",
        )
        category = Category.objects.create(name="Gift Boxes", slug="gift-boxes")
        product = Product.objects.create(
            category=category,
            name="Premium Box",
            slug="premium-box",
            sku="JFP-BOX-1",
            price=Decimal("100.00"),
            gst_percentage=Decimal("18.00"),
            stock=10,
        )
        order = Order.objects.create(
            user=user,
            subtotal=Decimal("236.00"),
            total=Decimal("236.00"),
            shipping_name="Buyer",
            shipping_phone="9999999999",
            shipping_address_line1="1 Market Road",
            shipping_city="Bengaluru",
            shipping_state="Karnataka",
            shipping_postal_code="560001",
        )

        line = OrderLine.objects.create(
            order=order,
            product=product,
            quantity=2,
            unit_price=Decimal("118.00"),
            gst_percentage=Decimal("18.00"),
            line_total=Decimal("236.00"),
        )

        self.assertEqual(line.line_total, Decimal("236.00"))
        self.assertEqual(line.gst_amount, Decimal("36.00"))
