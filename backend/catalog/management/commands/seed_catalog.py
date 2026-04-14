from decimal import Decimal

from django.core.management.base import BaseCommand
from catalog.models import Category, Product, SiteSettings


class Command(BaseCommand):
    help = "Seed categories and sample products for local development."

    def handle(self, *args, **options):
        SiteSettings.objects.get_or_create(
            pk=1,
            defaults={"default_bulk_threshold": 100},
        )

        categories_data = [
            ("Baking supplies", "baking"),
            ("Packaging material", "packaging"),
            ("Decoration", "decoration"),
            ("Hamper baskets", "baskets"),
            ("New arrivals", "new"),
            ("Boxes", "boxes"),
            ("Pouches", "pouches"),
            ("Ribbons", "ribbons"),
            ("Gift wrap", "wrap"),
            ("Hampers", "hampers"),
            ("Bakeware", "bakeware"),
        ]

        cats = {}
        for name, slug in categories_data:
            c, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name},
            )
            cats[slug] = c

        products = [
            {
                "name": "Kraft gift box — medium",
                "slug": "kraft-gift-box-medium",
                "sku": "JFP-BOX-001",
                "category": "boxes",
                "price": Decimal("249.00"),
                "stock": 500,
                "is_bestseller": True,
                "bulk_threshold": 100,
            },
            {
                "name": "Satin ribbon spool — red 25mm",
                "slug": "satin-ribbon-red-25",
                "sku": "JFP-RIB-002",
                "category": "ribbons",
                "price": Decimal("189.00"),
                "compare_at_price": Decimal("229.00"),
                "stock": 800,
                "bulk_threshold": 200,
            },
            {
                "name": "Cupcake liners — gold foil",
                "slug": "cupcake-liners-gold",
                "sku": "JFP-BAKE-003",
                "category": "baking",
                "price": Decimal("129.00"),
                "stock": 1200,
                "is_bestseller": True,
            },
            {
                "name": "Clear PVC pouch — A5",
                "slug": "pvc-pouch-a5",
                "sku": "JFP-PVC-004",
                "category": "pouches",
                "price": Decimal("89.00"),
                "compare_at_price": Decimal("119.00"),
                "stock": 600,
                "bulk_threshold": 500,
            },
            {
                "name": "Wicker hamper — small",
                "slug": "wicker-hamper-small",
                "sku": "JFP-HMP-005",
                "category": "hampers",
                "price": Decimal("599.00"),
                "stock": 80,
                "is_bestseller": True,
            },
            {
                "name": "Party balloon arch kit",
                "slug": "balloon-arch-kit",
                "sku": "JFP-DEC-006",
                "category": "decoration",
                "price": Decimal("1299.00"),
                "stock": 120,
            },
            {
                "name": "Silicone chocolate mould — hearts",
                "slug": "chocolate-mould-hearts",
                "sku": "JFP-BAKE-007",
                "category": "bakeware",
                "price": Decimal("349.00"),
                "stock": 200,
            },
            {
                "name": "Metallic gift wrap roll",
                "slug": "metallic-wrap-roll",
                "sku": "JFP-WRP-008",
                "category": "wrap",
                "price": Decimal("199.00"),
                "stock": 400,
            },
            {
                "name": "Kraft paper bags — with handles",
                "slug": "kraft-bags-handles",
                "sku": "JFP-BAG-009",
                "category": "packaging",
                "price": Decimal("12.00"),
                "stock": 5000,
                "bulk_threshold": 200,
            },
            {
                "name": "Cake turntable — non-slip",
                "slug": "cake-turntable-nonslip",
                "sku": "JFP-BAKE-010",
                "category": "bakeware",
                "price": Decimal("899.00"),
                "stock": 45,
                "is_bestseller": True,
            },
            {
                "name": "Piping tips set — 24 pcs",
                "slug": "piping-tips-24",
                "sku": "JFP-BAKE-011",
                "category": "bakeware",
                "price": Decimal("449.00"),
                "stock": 90,
            },
            {
                "name": "Measuring cups — stainless",
                "slug": "measuring-cups-ss",
                "sku": "JFP-BAKE-012",
                "category": "bakeware",
                "price": Decimal("329.00"),
                "stock": 110,
            },
        ]

        for p in products:
            cat_slug = p.pop("category")
            compare = p.pop("compare_at_price", None)
            Product.objects.update_or_create(
                sku=p["sku"],
                defaults={
                    **p,
                    "category": cats[cat_slug],
                    "compare_at_price": compare,
                    "is_active": True,
                    "is_customizable": False,
                },
            )

        self.stdout.write(self.style.SUCCESS("Catalog seeded."))
