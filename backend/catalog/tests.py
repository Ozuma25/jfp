from decimal import Decimal

from django.test import TestCase

from catalog.filters import ProductFilter
from catalog.models import Category, Product, ProductVariant
from catalog.serializers import ProductDetailSerializer, ProductListSerializer


class ProductDisplayPriceTests(TestCase):
    def test_product_price_is_displayed_including_gst(self):
        category = Category.objects.create(name="Gift Boxes", slug="gift-boxes")
        product = Product.objects.create(
            category=category,
            name="Premium Box",
            slug="premium-box",
            sku="JFP-BOX-1",
            price=Decimal("100.00"),
            compare_at_price=Decimal("120.00"),
            gst_percentage=Decimal("18.00"),
            stock=10,
        )

        data = ProductListSerializer(product).data

        self.assertEqual(data["price"], "₹ 118")

    def test_variant_override_price_is_displayed_including_product_gst(self):
        category = Category.objects.create(name="Gift Boxes", slug="gift-boxes")
        product = Product.objects.create(
            category=category,
            name="Premium Box",
            slug="premium-box",
            sku="JFP-BOX-1",
            price=Decimal("100.00"),
            compare_at_price=Decimal("120.00"),
            gst_percentage=Decimal("18.00"),
            stock=10,
        )
        ProductVariant.objects.create(
            product=product,
            color="Gold",
            price_override=Decimal("150.00"),
            stock=5,
        )

        data = ProductDetailSerializer(product).data

        self.assertEqual(data["compare_at_price_display"], "₹ 141.60")
        self.assertEqual(data["variants"][0]["price"], "₹ 177")

    def test_price_filter_uses_display_price_including_gst(self):
        category = Category.objects.create(name="Gift Boxes", slug="gift-boxes")
        Product.objects.create(
            category=category,
            name="Low GST Box",
            slug="low-gst-box",
            sku="JFP-BOX-LOW",
            price=Decimal("100.00"),
            gst_percentage=Decimal("5.00"),
            stock=10,
        )
        Product.objects.create(
            category=category,
            name="High GST Box",
            slug="high-gst-box",
            sku="JFP-BOX-HIGH",
            price=Decimal("100.00"),
            gst_percentage=Decimal("18.00"),
            stock=10,
        )

        filtered = ProductFilter({"max_price": "110"}, queryset=Product.objects.all()).qs

        self.assertEqual(list(filtered.values_list("slug", flat=True)), ["low-gst-box"])
