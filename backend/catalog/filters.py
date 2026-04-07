from django.db.models import Q
import django_filters

from catalog.models import Product


class ProductFilter(django_filters.FilterSet):
    category_slug = django_filters.CharFilter(field_name="category__slug")
    cat = django_filters.CharFilter(field_name="category__slug")
    is_bestseller = django_filters.BooleanFilter()
    is_customizable = django_filters.BooleanFilter()
    search = django_filters.CharFilter(method="filter_search")

    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")

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
