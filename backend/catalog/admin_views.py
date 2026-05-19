"""Admin views for catalog app - bulk import and other admin-specific functionality."""

import io
from django.shortcuts import render, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.urls import reverse
from django.utils.html import format_html, format_html_join

from catalog.forms import BulkImportProductForm
from catalog.utils import bulk_import_products


def _build_import_summary(result):
    created_products_html = ""
    if result["successful"] > 0:
        product_items = format_html_join(
            "",
            "<li>{}</li>",
            ((sku,) for sku in result["created_products"][:10]),
        )
        if len(result["created_products"]) > 10:
            product_items = format_html(
                "{}<li>... and {} more</li>",
                product_items,
                len(result["created_products"]) - 10,
            )

        created_products_html = format_html(
            """
            <strong>Created Products (SKUs):</strong><br>
            <ul style="margin: 10px 0; padding-left: 20px;">{}</ul>
            """,
            product_items,
        )

    errors_html = ""
    if result["errors"]:
        error_rows = []
        for error in result["errors"][:10]:
            if error["row"] == 0:
                error_rows.append((error["error"],))
            else:
                error_rows.append((
                    format_html(
                        "Row {}: {}",
                        error["row"],
                        error.get("error", "Unknown error"),
                    ),
                ))

        error_items = format_html_join("", "<li>{}</li>", error_rows)
        if len(result["errors"]) > 10:
            error_items = format_html(
                "{}<li>... and {} more errors</li>",
                error_items,
                len(result["errors"]) - 10,
            )

        errors_html = format_html(
            """
            <strong>Errors:</strong><br>
            <ul style="margin: 10px 0; padding-left: 20px; color: red;">{}</ul>
            """,
            error_items,
        )

    return format_html(
        """
        <div style="margin-top: 10px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
            <strong>Import Summary:</strong><br>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Total Rows Processed: <strong>{}</strong></li>
                <li>Successfully Imported: <strong style="color: green;">{}</strong></li>
                <li>Skipped: <strong>{}</strong></li>
                <li>Failed: <strong style="color: red;">{}</strong></li>
            </ul>
            {}
            {}
        </div>
        """,
        result["total_rows"],
        result["successful"],
        result["skipped"],
        result["failed"],
        created_products_html,
        errors_html,
    )


@staff_member_required
@require_http_methods(["GET", "POST"])
def bulk_import_products_view(request):
    """
    Handle bulk import of products from Excel file.
    """
    if request.method == "POST":
        form = BulkImportProductForm(request.POST, request.FILES)
        if form.is_valid():
            excel_file = form.cleaned_data["excel_file"]
            
            try:
                # Read the file into a BytesIO object
                file_content = io.BytesIO(excel_file.read())
                file_content.seek(0)
                
                # Process the bulk import
                result = bulk_import_products(file_content)
                
                summary_html = _build_import_summary(result)
                
                # Add success message
                if result['successful'] > 0:
                    messages.success(
                        request,
                        format_html(
                            "Successfully imported {} products. {}",
                            result["successful"],
                            summary_html,
                        ),
                    )
                
                # Add warning if there are row-level errors
                if result['failed'] > 0:
                    messages.warning(
                        request,
                        format_html(
                            "Import completed with {} errors. {}",
                            result["failed"],
                            summary_html,
                        ),
                    )
                
                # Add a useful message when nothing was imported
                if result['successful'] == 0 and result['failed'] == 0:
                    if result['errors']:
                        messages.error(
                            request,
                            format_html("Import failed. {}", summary_html),
                        )
                    elif result['total_rows'] == 0:
                        messages.info(
                            request,
                            "No data found in Excel file. Make sure your file has data rows below the header row.",
                        )
                    else:
                        messages.info(
                            request,
                            format_html(
                                "No products were imported. All {} rows were skipped (Is_live=yes or duplicate SKU). {}",
                                result["skipped"],
                                summary_html,
                            ),
                        )
                
                # Redirect back to product changelist
                return redirect("admin:catalog_product_changelist")
                
            except Exception as e:
                messages.error(request, f"Error processing file: {str(e)}")
    else:
        form = BulkImportProductForm()
    
    context = {
        "form": form,
        "title": "Bulk Import Products",
        "opts": None,
        "has_add_permission": True,
        "site_header": "Django Administration",
    }
    
    return render(request, "admin/catalog/bulk_import_products.html", context)
