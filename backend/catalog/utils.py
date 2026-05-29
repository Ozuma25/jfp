from decimal import Decimal
from typing import Dict, List, Tuple, Any
import io

try:
    from openpyxl import load_workbook
except ImportError:
    load_workbook = None

from django.utils.text import slugify

from catalog.models import Product, Category, SiteSettings


def gst_inclusive_price(price, gst_percentage) -> Decimal:
    price = Decimal(str(price or 0))
    rate = Decimal(str(gst_percentage or 0))
    return (price + (price * rate / Decimal("100"))).quantize(Decimal("0.01"))


def effective_bulk_threshold(product: Product) -> int:
    if product.bulk_threshold is not None:
        return product.bulk_threshold
    row = SiteSettings.objects.first()
    return row.default_bulk_threshold if row else 100


def _parse_bool(value: Any) -> bool:
    """Convert various representations to boolean."""
    if value is None or value == "":
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower().strip() in ("yes", "true", "1", "on")
    return bool(value)


def _get_category_by_name(category_name: str) -> Tuple[Any, str]:
    """Get or create category by name. Returns (category, error_msg)."""
    if not category_name or not str(category_name).strip():
        return None, "Category name is empty"
    
    category_name = str(category_name).strip()
    try:
        category = Category.objects.get(name=category_name)
        return category, ""
    except Category.DoesNotExist:
        # Try to create the category
        try:
            slug = slugify(category_name)[:140]
            # Ensure unique slug
            base_slug = slug
            n = 2
            while Category.objects.filter(slug=slug).exists():
                suffix = f"-{n}"
                slug = f"{base_slug[:max(1, 140-len(suffix))]}{suffix}"
                n += 1
            
            category = Category.objects.create(name=category_name, slug=slug)
            return category, ""
        except Exception as e:
            return None, f"Failed to create category '{category_name}': {str(e)}"


def bulk_import_products(
    file_obj: io.BytesIO, 
) -> Dict[str, Any]:
    """
    Process Excel file and bulk import products.
    
    Returns:
        Dict with keys:
        - total_rows: Total rows processed
        - successful: Count of successfully imported products
        - skipped: Count of skipped products
        - failed: Count of failed products
        - errors: List of error details
        - created_products: List of created product SKUs
    """
    
    if load_workbook is None:
        return {
            "total_rows": 0,
            "successful": 0,
            "skipped": 0,
            "failed": 0,
            "errors": [{"row": 0, "error": "openpyxl is not installed. Please install it to use bulk import."}],
            "created_products": [],
        }
    
    result = {
        "total_rows": 0,
        "successful": 0,
        "skipped": 0,
        "failed": 0,
        "errors": [],
        "created_products": [],
    }
    
    try:
        workbook = load_workbook(file_obj, data_only=True)
        sheet = workbook.active
        
        required_headers = ["Category", "Name", "SKU", "Price"]
        
        # Read header row
        header_row = []
        for cell in sheet[1]:
            header_row.append(cell.value)
        
        # Create a mapping of column names to indices
        column_map = {}
        for idx, header in enumerate(header_row):
            if header:
                column_map[str(header).strip()] = idx

        missing_headers = [
            header for header in required_headers if header not in column_map
        ]
        if missing_headers:
            result["errors"].append({
                "row": 1,
                "error": (
                    "Missing required column(s): "
                    f"{', '.join(missing_headers)}. "
                    "Make sure the first row contains the bulk import template headers."
                )
            })
            return result
        
        # Check if there are any data rows
        has_data_rows = False
        
        # Process data rows
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=False), start=2):
            row_num = row_idx
            error_msg = ""
            
            # Get cell values
            def get_cell_value(col_name):
                if col_name in column_map:
                    idx = column_map[col_name]
                    cell = row[idx] if idx < len(row) else None
                    return cell.value if cell else None
                return None
            
            # Check for data in required fields (Category, Name, SKU, or Price)
            # This is more flexible than checking all cells
            has_required_data = (
                get_cell_value("Category") or
                get_cell_value("Name") or
                get_cell_value("SKU") or
                get_cell_value("Price")
            )
            
            if not has_required_data:
                # Skip completely empty rows
                continue
            
            has_data_rows = True
            result["total_rows"] += 1
            
            try:
                # Check Is_live status
                is_live_str = get_cell_value("Is_live")
                is_live = _parse_bool(is_live_str)
                if is_live or (is_live_str and str(is_live_str).lower().strip() == "yes"):
                    result["skipped"] += 1
                    continue
                
                # Get required fields
                category_name = get_cell_value("Category")
                product_name = get_cell_value("Name")
                sku = get_cell_value("SKU")
                price_str = get_cell_value("Price")
                
                # Validate required fields
                if not category_name or not str(category_name).strip():
                    raise ValueError("Category is required")
                if not product_name or not str(product_name).strip():
                    raise ValueError("Name is required")
                if not sku or not str(sku).strip():
                    raise ValueError("SKU is required")
                if price_str is None or str(price_str).strip() == "":
                    raise ValueError("Price is required")
                
                # Convert and clean values
                category_name = str(category_name).strip()
                product_name = str(product_name).strip()
                sku = str(sku).strip().upper()
                
                # Get or create category
                category, cat_error = _get_category_by_name(category_name)
                if cat_error:
                    raise ValueError(cat_error)
                
                # Check for duplicate SKU
                if Product.objects.filter(sku=sku).exists():
                    result["skipped"] += 1
                    result["errors"].append({
                        "row": row_num,
                        "sku": sku,
                        "error": "Duplicate product (SKU already exists)"
                    })
                    continue
                
                # Parse price
                try:
                    price = Decimal(str(price_str).strip())
                except:
                    raise ValueError(f"Invalid price: {price_str}")
                
                # Get optional fields
                slug = get_cell_value("Slug")
                if slug and str(slug).strip():
                    slug = str(slug).strip()
                else:
                    slug = ""
                
                hsn_code = get_cell_value("HSN Code")
                if hsn_code:
                    hsn_code = str(hsn_code).strip()
                else:
                    hsn_code = ""
                
                compare_at_price_str = get_cell_value("Compare At Price")
                compare_at_price = None
                if compare_at_price_str and str(compare_at_price_str).strip():
                    try:
                        compare_at_price = Decimal(str(compare_at_price_str).strip())
                    except:
                        pass
                
                gst_percentage_str = get_cell_value("GST Percentage")
                gst_percentage = Decimal("18.00")
                if gst_percentage_str and str(gst_percentage_str).strip():
                    try:
                        gst_percentage = Decimal(str(gst_percentage_str).strip())
                    except:
                        pass
                
                stock_str = get_cell_value("Stock")
                stock = 0
                if stock_str and str(stock_str).strip():
                    try:
                        stock = int(str(stock_str).strip())
                    except:
                        pass
                
                height_cm_str = get_cell_value("Height CM")
                height_cm = None
                if height_cm_str and str(height_cm_str).strip():
                    try:
                        height_cm = Decimal(str(height_cm_str).strip())
                    except:
                        pass
                
                width_cm_str = get_cell_value("Width CM")
                width_cm = None
                if width_cm_str and str(width_cm_str).strip():
                    try:
                        width_cm = Decimal(str(width_cm_str).strip())
                    except:
                        pass
                
                weight_g_str = get_cell_value("Weight G")
                weight_g = None
                if weight_g_str and str(weight_g_str).strip():
                    try:
                        weight_g = Decimal(str(weight_g_str).strip())
                    except:
                        pass
                
                is_active = _parse_bool(get_cell_value("Is Active"))
                is_bestseller = _parse_bool(get_cell_value("Is Bestseller"))
                is_customizable = _parse_bool(get_cell_value("Is Customizable"))
                is_returnable = _parse_bool(get_cell_value("Is Returnable"))
                
                bulk_threshold_str = get_cell_value("Bulk Threshold")
                bulk_threshold = None
                if bulk_threshold_str and str(bulk_threshold_str).strip():
                    try:
                        bulk_threshold = int(str(bulk_threshold_str).strip())
                    except:
                        pass
                
                min_qty_str = get_cell_value("Min Qty")
                min_qty = 1
                if min_qty_str and str(min_qty_str).strip():
                    try:
                        min_qty = int(str(min_qty_str).strip())
                    except:
                        pass
                
                description = get_cell_value("Description")
                if description:
                    description = str(description).strip()
                else:
                    description = ""
                
                # Create product
                product = Product(
                    category=category,
                    name=product_name,
                    slug=slug,
                    sku=sku,
                    hsn_code=hsn_code,
                    description=description,
                    price=price,
                    compare_at_price=compare_at_price,
                    gst_percentage=gst_percentage,
                    stock=stock,
                    height_cm=height_cm,
                    width_cm=width_cm,
                    weight_g=weight_g,
                    is_active=is_active,
                    is_bestseller=is_bestseller,
                    is_customizable=is_customizable,
                    is_returnable=is_returnable,
                    bulk_threshold=bulk_threshold,
                    min_qty=min_qty,
                )
                
                # The save() method will auto-generate slug if empty and normalize SKU
                product.full_clean()
                product.save()
                
                result["successful"] += 1
                result["created_products"].append(sku)
                
            except Exception as e:
                result["failed"] += 1
                result["errors"].append({
                    "row": row_num,
                    "error": str(e)
                })
    
    except Exception as e:
        result["errors"].append({
            "row": 0,
            "error": f"Failed to read Excel file: {str(e)}"
        })
    
    # Final check: if no data rows were found, add informative error
    if not has_data_rows and result["total_rows"] == 0:
        result["errors"].append({
            "row": 0,
            "error": "No data found in Excel file. Ensure you have data rows below the header with at least one of: Category, Name, SKU, or Price."
        })
    
    return result
