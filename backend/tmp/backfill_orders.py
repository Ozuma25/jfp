from orders.models import Order
from django.db.models import Q

def run():
    from orders.utils import generate_order_number
    orders = Order.objects.filter(Q(order_number='') | Q(order_number__isnull=True))
    count = 0
    for o in orders:
        o.order_number = generate_order_number(o)
        o.save(update_fields=['order_number'])
        count += 1
    print(f"Successfully forced backfill for {count} orders.")

if __name__ == "__main__":
    run()
