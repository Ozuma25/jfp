from decimal import Decimal

from catalog.models import Product, SiteSettings


def gst_inclusive_price(price, gst_percentage) -> Decimal:
    price = Decimal(str(price or 0))
    rate = Decimal(str(gst_percentage or 0))
    return (price + (price * rate / Decimal("100"))).quantize(Decimal("0.01"))


def effective_bulk_threshold(product: Product) -> int:
    if product.bulk_threshold is not None:
        return product.bulk_threshold
    row = SiteSettings.objects.first()
    return row.default_bulk_threshold if row else 100
