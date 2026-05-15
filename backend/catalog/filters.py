from decimal import Decimal

from django.db.models import Q
from django.db.models import DecimalField, ExpressionWrapper, F, Value
import django_filters

from catalog.models import Product


def with_customer_price(queryset):
    return queryset.annotate(
        customer_price=ExpressionWrapper(
            F("price") * (F("gst_percentage") + Value(Decimal("100.00"))) / Value(Decimal("100.00")),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
    )


class ProductFilter(django_filters.FilterSet):
    category_slug = django_filters.CharFilter(field_name="category__slug")
    cat = django_filters.CharFilter(field_name="category__slug")
    is_bestseller = django_filters.BooleanFilter()
    is_customizable = django_filters.BooleanFilter()
    search = django_filters.CharFilter(method="filter_search")

    min_price = django_filters.NumberFilter(method="filter_min_price")
    max_price = django_filters.NumberFilter(method="filter_max_price")

    class Meta:
        model = Product
        fields = ("category_slug", "cat", "is_bestseller", "is_customizable", "min_price", "max_price")

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(name__icontains=value)
            | Q(sku__icontains=value)
            | Q(description__icontains=value)
        )

    def filter_min_price(self, queryset, name, value):
        return with_customer_price(queryset).filter(customer_price__gte=value)

    def filter_max_price(self, queryset, name, value):
        return with_customer_price(queryset).filter(customer_price__lte=value)
