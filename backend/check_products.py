import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from catalog.models import Product
prods = Product.objects.order_by('-id')[:10]
print("ID  | Active | Name")
print("-" * 60)
for p in prods:
    print(f"{p.id:<4} | {str(p.is_active):<6} | {p.name}")
