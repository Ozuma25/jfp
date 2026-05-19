from decimal import Decimal

from django.test import TestCase

from catalog.filters import ProductFilter
from catalog.forms import ProductAdminForm
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
            hsn_code="481920",
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
            hsn_code="481920",
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
            hsn_code="481920",
            price=Decimal("100.00"),
            gst_percentage=Decimal("5.00"),
            stock=10,
        )
        Product.objects.create(
            category=category,
            name="High GST Box",
            slug="high-gst-box",
            sku="JFP-BOX-HIGH",
            hsn_code="481920",
            price=Decimal("100.00"),
            gst_percentage=Decimal("18.00"),
            stock=10,
        )

        filtered = ProductFilter({"max_price": "110"}, queryset=Product.objects.all()).qs

        self.assertEqual(list(filtered.values_list("slug", flat=True)), ["low-gst-box"])


class ProductAdminFormHsnTests(TestCase):
    def _valid_data(self, **overrides):
        category = Category.objects.create(name="Gift Boxes", slug="gift-boxes")
        data = {
            "category": str(category.id),
            "name": "Premium Box",
            "slug": "premium-box",
            "sku": "JFP-BOX-1",
            "hsn_code": "481920",
            "description": "",
            "price": "100.00",
            "compare_at_price": "",
            "gst_percentage": "18.00",
            "stock": "10",
            "height_cm": "",
            "width_cm": "",
            "weight_g": "",
            "is_active": "on",
            "bulk_threshold": "",
            "min_qty": "1",
        }
        data.update(overrides)
        return data

    def test_hsn_code_is_required(self):
        form = ProductAdminForm(data=self._valid_data(hsn_code=""))

        self.assertFalse(form.is_valid())
        self.assertIn("hsn_code", form.errors)

    def test_hsn_code_accepts_numbers_only(self):
        form = ProductAdminForm(data=self._valid_data(hsn_code="4819AB"))

        self.assertFalse(form.is_valid())
        self.assertEqual(form.errors["hsn_code"], ["HSN code must contain numbers only."])
