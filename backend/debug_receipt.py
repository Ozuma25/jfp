import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Order
from orders.receipt_utils import generate_order_receipt_pdf

try:
    o = Order.objects.get(id=8)
    print(f"Order #8: Status={o.status}, Total={o.total}")
    buf = generate_order_receipt_pdf(o)
    print("PDF Generation: SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
