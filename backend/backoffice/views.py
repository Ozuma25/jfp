import json
from decimal import Decimal
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.db import models, transaction
from django.db.models import Count, Q, Sum
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST, require_GET

from django.contrib.auth import get_user_model

User = get_user_model()
from catalog.models import Category, Product, ProductImage
from coupons.models import Coupon
from orders.models import BulkQuoteRequest, Order, OrderLine


# ---------------------------------------------------------------------------
# Executive Overview & Dashboard
# ---------------------------------------------------------------------------

@staff_member_required
def backoffice_dashboard(request):
    """Amazon/Shopify style Backoffice Dashboard Overview."""
    today = timezone.localdate()
    first_of_month = today.replace(day=1)

    # Key Metrics
    total_revenue = Order.objects.filter(
        status__in=[Order.Status.PAID, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]
    ).aggregate(total=Sum("total"))["total"] or Decimal("0")

    monthly_revenue = Order.objects.filter(
        status__in=[Order.Status.PAID, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED],
        created_at__date__gte=first_of_month
    ).aggregate(total=Sum("total"))["total"] or Decimal("0")

    total_orders_count = Order.objects.count()
    pending_orders_count = Order.objects.filter(
        status__in=[Order.Status.PENDING_PAYMENT, Order.Status.UNDER_REVIEW, Order.Status.PROCESSING]
    ).count()

    total_products_count = Product.objects.count()
    low_stock_products = Product.objects.filter(stock__lte=10, is_active=True)
    low_stock_count = low_stock_products.count()

    pending_quotes_count = BulkQuoteRequest.objects.filter(status=BulkQuoteRequest.Status.PENDING).count()

    # Recent 10 Orders
    recent_orders = Order.objects.select_related("user").order_by("-created_at")[:10]

    # Recent 5 Quote Requests
    recent_quotes = BulkQuoteRequest.objects.select_related("product").order_by("-created_at")[:5]

    # Low Stock Alerts (Top 5)
    low_stock_list = low_stock_products[:5]

    # Sales by Status
    status_counts = Order.objects.values("status").annotate(count=Count("id"))
    status_dict = {item["status"]: item["count"] for item in status_counts}

    context = {
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "total_orders_count": total_orders_count,
        "pending_orders_count": pending_orders_count,
        "total_products_count": total_products_count,
        "low_stock_count": low_stock_count,
        "pending_quotes_count": pending_quotes_count,
        "recent_orders": recent_orders,
        "recent_quotes": recent_quotes,
        "low_stock_list": low_stock_list,
        "status_dict": status_dict,
        "active_tab": "dashboard",
    }
    return render(request, "backoffice/dashboard.html", context)


# ---------------------------------------------------------------------------
# Catalog & Inventory Suite
# ---------------------------------------------------------------------------

@staff_member_required
def backoffice_products(request):
    """Catalog & Inventory Management Grid."""
    search_query = request.GET.get("q", "").strip()
    category_id = request.GET.get("category", "").strip()
    stock_status = request.GET.get("stock", "").strip()

    products_qs = Product.objects.select_related("category").prefetch_related("images").order_by("-created_at")

    if search_query:
        products_qs = products_qs.filter(
            Q(name__icontains=search_query) |
            Q(sku__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    if category_id:
        products_qs = products_qs.filter(category_id=category_id)

    if stock_status == "out_of_stock":
        products_qs = products_qs.filter(stock__lte=0)
    elif stock_status == "low_stock":
        products_qs = products_qs.filter(stock__gt=0, stock__lte=15)
    elif stock_status == "in_stock":
        products_qs = products_qs.filter(stock__gt=15)

    paginator = Paginator(products_qs, 20)
    page_number = request.GET.get("page", 1)
    products_page = paginator.get_page(page_number)

    categories = Category.objects.all().order_by("name")

    context = {
        "products": products_page,
        "categories": categories,
        "search_query": search_query,
        "selected_category": category_id,
        "selected_stock": stock_status,
        "total_count": paginator.count,
        "active_tab": "products",
    }
    return render(request, "backoffice/products.html", context)


@require_POST
@staff_member_required
def backoffice_product_save(request):
    """AJAX / Form endpoint: Create or update product."""
    try:
        product_id = request.POST.get("product_id")
        name = request.POST.get("name", "").strip()
        sku = request.POST.get("sku", "").strip()
        category_id = request.POST.get("category_id")
        price = Decimal(request.POST.get("price", "0"))
        compare_at_price_val = request.POST.get("compare_at_price", "").strip()
        compare_at_price = Decimal(compare_at_price_val) if compare_at_price_val else None
        stock = int(request.POST.get("stock", "0"))
        hsn_code = request.POST.get("hsn_code", "4819").strip()
        description = request.POST.get("description", "").strip()
        is_active = request.POST.get("is_active") == "on" or request.POST.get("is_active") == "true"

        category = get_object_or_404(Category, pk=category_id) if category_id else None

        if product_id:
            product = get_object_or_404(Product, pk=product_id)
            product.name = name
            product.sku = sku
            product.category = category
            product.price = price
            product.compare_at_price = compare_at_price
            product.stock = stock
            product.description = description
            product.is_active = is_active
            if hsn_code:
                product.hsn_code = hsn_code
            product.save()
            msg = f"Updated product '{name}' successfully."
        else:
            product = Product.objects.create(
                name=name,
                sku=sku or f"JFP-{Product.objects.count() + 100}",
                hsn_code=hsn_code or "4819",
                category=category,
                price=price,
                compare_at_price=compare_at_price,
                stock=stock,
                description=description,
                is_active=is_active,
            )
            msg = f"Created product '{name}' successfully."

        # Handle image upload if provided
        if "image_file" in request.FILES:
            image_file = request.FILES["image_file"]
            ProductImage.objects.create(
                product=product,
                image=image_file,
                is_primary=True
            )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({"success": True, "message": msg, "product_id": product.pk})

        messages.success(request, msg)
        return redirect("backoffice:products")

    except Exception as e:
        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({"success": False, "message": str(e)}, status=400)
        messages.error(request, f"Error saving product: {e}")
        return redirect("backoffice:products")


@require_POST
@staff_member_required
def backoffice_stock_update(request):
    """AJAX endpoint: Quick stock quantity update."""
    try:
        data = json.loads(request.body)
        product_id = data.get("product_id")
        new_stock = int(data.get("stock", 0))

        product = get_object_or_404(Product, pk=product_id)
        product.stock = max(0, new_stock)
        product.save(update_fields=["stock", "updated_at"])

        return JsonResponse({
            "success": True,
            "message": f"Stock for '{product.name}' updated to {product.stock}.",
            "new_stock": product.stock
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)


@require_POST
@staff_member_required
def backoffice_toggle_active(request):
    """AJAX endpoint: Toggle product is_active status."""
    try:
        data = json.loads(request.body)
        product_id = data.get("product_id")
        product = get_object_or_404(Product, pk=product_id)
        product.is_active = not product.is_active
        product.save(update_fields=["is_active", "updated_at"])

        return JsonResponse({
            "success": True,
            "message": f"Product '{product.name}' is now {'Active' if product.is_active else 'Inactive'}.",
            "is_active": product.is_active
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)


@require_POST
@staff_member_required
def backoffice_bulk_import(request):
    """Handles Excel / CSV bulk product import."""
    import_file = request.FILES.get("import_file")
    if not import_file:
        messages.error(request, "Please upload a valid Excel or CSV file.")
        return redirect("backoffice:products")

    filename = import_file.name.lower()
    created_count = 0
    updated_count = 0

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            import openpyxl
            wb = openpyxl.load_workbook(import_file, data_only=True)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                messages.error(request, "Excel file is empty.")
                return redirect("backoffice:products")

            header = [str(cell).strip().lower() if cell else "" for cell in rows[0]]

            for row_idx, row in enumerate(rows[1:], start=2):
                if not any(row):
                    continue
                row_dict = dict(zip(header, row))
                sku = str(row_dict.get("sku") or "").strip()
                name = str(row_dict.get("name") or "").strip()
                if not name:
                    continue

                price = Decimal(str(row_dict.get("price") or "0"))
                stock = int(row_dict.get("stock") or row_dict.get("stock_quantity") or "0")
                cat_name = str(row_dict.get("category") or "").strip()
                desc = str(row_dict.get("description") or "").strip()

                category = None
                if cat_name:
                    category, _ = Category.objects.get_or_create(name=cat_name)

                if sku:
                    prod, created = Product.objects.update_or_create(
                        sku=sku,
                        defaults={
                            "name": name,
                            "price": price,
                            "stock": stock,
                            "category": category,
                            "description": desc,
                            "is_active": True,
                        }
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                else:
                    Product.objects.create(
                        name=name,
                        hsn_code="4819",
                        price=price,
                        stock=stock,
                        category=category,
                        description=desc,
                        is_active=True,
                    )
                    created_count += 1

        messages.success(request, f"Bulk import complete: {created_count} created, {updated_count} updated.")
    except Exception as e:
        messages.error(request, f"Error processing bulk import: {e}")

    return redirect("backoffice:products")


# ---------------------------------------------------------------------------
# Order & Logistics Pipeline
# ---------------------------------------------------------------------------

@staff_member_required
def backoffice_orders(request):
    """Orders & Logistics Pipeline Management."""
    status_filter = request.GET.get("status", "").strip()
    search_query = request.GET.get("q", "").strip()

    orders_qs = Order.objects.select_related("user").prefetch_related("lines__product").order_by("-created_at")

    if status_filter:
        orders_qs = orders_qs.filter(status=status_filter)

    if search_query:
        orders_qs = orders_qs.filter(
            Q(pk__icontains=search_query) |
            Q(shipping_name__icontains=search_query) |
            Q(shipping_phone__icontains=search_query) |
            Q(user__email__icontains=search_query)
        )

    paginator = Paginator(orders_qs, 15)
    page_number = request.GET.get("page", 1)
    orders_page = paginator.get_page(page_number)

    status_choices = Order.Status.choices

    context = {
        "orders": orders_page,
        "status_choices": status_choices,
        "selected_status": status_filter,
        "search_query": search_query,
        "total_count": paginator.count,
        "active_tab": "orders",
    }
    return render(request, "backoffice/orders.html", context)


@require_POST
@staff_member_required
def backoffice_update_order_status(request, order_id):
    """AJAX endpoint: Update status of an order."""
    try:
        data = json.loads(request.body)
        new_status = data.get("status")

        if new_status not in dict(Order.Status.choices):
            return JsonResponse({"success": False, "message": "Invalid order status."}, status=400)

        order = get_object_or_404(Order, pk=order_id)
        old_status_display = order.get_status_display()
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

        return JsonResponse({
            "success": True,
            "message": f"Order #{order.pk} status updated from '{old_status_display}' to '{order.get_status_display()}'.",
            "new_status": new_status,
            "new_status_display": order.get_status_display()
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)


@staff_member_required
def backoffice_order_invoice(request, order_id):
    """Printable invoice / receipt for an order."""
    order = get_object_or_404(Order.objects.select_related("user").prefetch_related("lines__product"), pk=order_id)
    context = {
        "order": order,
        "items": order.lines.all(),
        "today": timezone.localdate(),
    }
    return render(request, "backoffice/invoice.html", context)


# ---------------------------------------------------------------------------
# Customer Accounts Directory
# ---------------------------------------------------------------------------

@staff_member_required
def backoffice_customers(request):
    """Customer Directory & Profile Overview."""
    search_query = request.GET.get("q", "").strip()

    customers_qs = User.objects.filter(is_staff=False).annotate(
        order_count=Count("orders"),
        total_spent=Sum("orders__total", filter=Q(orders__status__in=[Order.Status.PAID, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]))
    ).order_by("-date_joined")

    if search_query:
        customers_qs = customers_qs.filter(
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )

    paginator = Paginator(customers_qs, 20)
    page_number = request.GET.get("page", 1)
    customers_page = paginator.get_page(page_number)

    context = {
        "customers": customers_page,
        "search_query": search_query,
        "total_count": paginator.count,
        "active_tab": "customers",
    }
    return render(request, "backoffice/customers.html", context)


@require_POST
@staff_member_required
def backoffice_toggle_customer_status(request, user_id):
    """AJAX: Lock or unlock customer account."""
    try:
        customer = get_object_or_404(User, pk=user_id, is_staff=False)
        customer.is_active = not customer.is_active
        customer.save(update_fields=["is_active"])

        return JsonResponse({
            "success": True,
            "message": f"Customer '{customer.email or customer.username}' is now {'Active' if customer.is_active else 'Locked/Inactive'}.",
            "is_active": customer.is_active
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)


# ---------------------------------------------------------------------------
# Coupons & Marketing Suite
# ---------------------------------------------------------------------------

@staff_member_required
def backoffice_coupons(request):
    """Coupons & Discount Promotions Management."""
    coupons = Coupon.objects.annotate(usage_count=Count("orders")).order_by("-id")
    context = {
        "coupons": coupons,
        "active_tab": "coupons",
    }
    return render(request, "backoffice/coupons.html", context)


@require_POST
@staff_member_required
def backoffice_coupon_save(request):
    """AJAX / Form: Create a new coupon."""
    try:
        code = request.POST.get("code", "").strip().upper()
        discount_type = request.POST.get("discount_type", "fixed")
        discount_value = Decimal(request.POST.get("discount_value", "0"))
        max_uses_val = request.POST.get("max_uses", "").strip()
        max_uses = int(max_uses_val) if max_uses_val else None

        if not code or discount_value <= 0:
            messages.error(request, "Please enter a valid coupon code and positive discount amount.")
            return redirect("backoffice:coupons")

        Coupon.objects.create(
            code=code,
            discount_type=discount_type,
            discount_value=discount_value,
            max_uses=max_uses,
            active=True
        )
        messages.success(request, f"Coupon '{code}' created successfully!")
    except Exception as e:
        messages.error(request, f"Error creating coupon: {e}")

    return redirect("backoffice:coupons")
