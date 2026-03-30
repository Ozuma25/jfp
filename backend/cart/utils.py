from django.db.models import Prefetch

from cart.models import Cart, CartItem


SESSION_HEADER = "HTTP_X_CART_SESSION"


def get_or_create_cart(request):
    """
    Authenticated users get a user-bound cart.
    Anonymous clients must send `X-Cart-Session: <uuid>` (create in browser).
    """
    user = request.user
    if user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=user, defaults={"session_key": None})
        return cart, None

    session_key = request.META.get(SESSION_HEADER) or request.headers.get("X-Cart-Session")
    if not session_key or not str(session_key).strip():
        return None, "Authentication or X-Cart-Session header required."

    session_key = str(session_key).strip()[:64]
    cart, _ = Cart.objects.get_or_create(
        session_key=session_key,
        defaults={"user": None},
    )
    return cart, None


def cart_with_item_prefetch(cart: Cart) -> Cart:
    """Reload cart with product + images prefetched for cart API responses."""
    return (
        Cart.objects.filter(pk=cart.pk)
        .prefetch_related(
            Prefetch(
                "items",
                queryset=CartItem.objects.select_related("product").prefetch_related(
                    "product__images"
                ),
            )
        )
        .get()
    )
