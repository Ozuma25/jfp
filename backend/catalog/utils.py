from catalog.models import Product, SiteSettings


def effective_bulk_threshold(product: Product) -> int:
    if product.bulk_threshold is not None:
        return product.bulk_threshold
    row = SiteSettings.objects.first()
    return row.default_bulk_threshold if row else 100
