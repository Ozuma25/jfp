import string
from django.utils import timezone

def int_to_base36(n):
    """
    Converts an integer to a base36 string (0-9, A-Z).
    """
    if n < 0:
        raise ValueError("Only non-negative integers are supported.")
    
    chars = string.digits + string.ascii_uppercase
    if n == 0:
        return "0"
    
    result = ""
    while n > 0:
        n, i = divmod(n, len(chars))
        result = chars[i] + result
    return result

def generate_order_number(order):
    """
    Generates a professional hybrid alphanumeric order number.
    Format: [PREFIX][YYMM]-[BASE36_ID]
    Example: JFPA2403-X8K2
    """
    # 1. Prefix
    prefix = "JFPB" if order.is_bulk else "JFPA"
    
    # 2. Year/Month Component (YYMM)
    date_str = timezone.now().strftime("%y%m")
    
    # 3. Unique Component (Base36 of ID + Offset)
    # Using an offset of 100,000 ensures the ID is at least 4 characters in Base36
    # and makes the business look established.
    offset = 100000
    unique_id = order.pk + offset
    base36_id = int_to_base36(unique_id)
    
    # Ensure a minimum length (e.g., 5 characters) for consistency
    # (Optional: pad with zero-equivalent '0' if needed)
    base36_id = base36_id.zfill(5)
    
    return f"{prefix}{date_str}-{base36_id}"
