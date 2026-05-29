# Bulk Product Import Feature - Implementation Guide

## Overview
The Bulk Product Import feature allows admins to import multiple products at once using an Excel file (.xlsx). This significantly speeds up product catalog setup.

## Features

### 1. **Admin Interface**
- Location: Django Admin > Products > "Bulk Import Products" button
- Accessible only to staff members with admin permissions
- User-friendly form for file upload with validation

### 2. **File Requirements**
- **Format**: .xlsx (Excel 2007 or later)
- **Maximum Size**: 10MB
- **Columns Required**: Category, Name, SKU, Price (minimum)
- **Additional Columns**: All other product fields (optional)

### 3. **Column Mapping**

| Column Name | Type | Required | Notes |
|---|---|---|---|
| Category | String | Yes | New categories auto-created if not exist |
| Name | String | Yes | Product name |
| Slug | String | No | URL slug; auto-generated from Name if empty |
| SKU | String | Yes | Stock Keeping Unit; JFP- prefix added if missing |
| HSN Code | String | No | HSN code (numbers only) |
| Price | Decimal | Yes | Base price before GST |
| Compare At Price | Decimal | No | Strike-through price (for sales) |
| Description | String | No | Product description; leave empty if not available |
| GST Percentage | Decimal | No | Default: 18.00 |
| Stock | Integer | No | Initial stock quantity |
| Height CM | Decimal | No | Height in centimeters |
| Width CM | Decimal | No | Width in centimeters |
| Weight G | Decimal | No | Weight in grams |
| Is Active | Boolean | No | Default: Yes (Yes/No, True/False, 1/0) |
| Is Bestseller | Boolean | No | Default: No |
| Is Customizable | Boolean | No | Default: No |
| Is Returnable | Boolean | No | Default: Yes |
| Bulk Threshold | Integer | No | Quantity threshold for bulk orders |
| Min Qty | Integer | No | Minimum order quantity; Default: 1 |
| Is_live | String | No | Set to "Yes" to skip this row |
| Notes | String | No | Internal notes |

### 4. **Import Rules**

#### Skipping Rows
- Rows where `Is_live = "Yes"` are skipped
- Rows with duplicate SKUs are skipped (based on existing products)

#### Data Processing
- **Category**: Auto-created if doesn't exist
- **Slug**: Auto-generated from product name if empty
- **SKU**: JFP- prefix automatically added (e.g., BOX-01 → JFP-BOX-01)
- **Boolean Values**: Converted from Yes/No/True/False/1/0
- **Prices**: Stored as base price (before GST)
- **Empty Fields**: Handled gracefully with defaults

#### Validation
- Required fields checked before import
- Invalid rows are skipped with error messages
- Import continues even if individual rows fail
- File type validated (.xlsx only)
- File size validated (max 10MB)

### 5. **Error Handling**
- **Non-Blocking**: Invalid rows don't stop the import process
- **Detailed Errors**: Each failed row gets a specific error message
- **Summary Report**: Displayed after import completion
- **Graceful Failure**: File read errors handled properly

### 6. **Import Summary**
After each import, admins see:
- Total rows processed
- Successfully imported count
- Skipped count (with reasons)
- Failed count (with error details)
- List of created product SKUs (first 10 shown)

## How to Use

### Step 1: Prepare Excel File
1. Create an Excel file (.xlsx) with product data
2. Use the template format provided
3. Ensure required columns: Category, Name, SKU, Price
4. Optional: Add other product fields

### Step 2: Access Import Feature
1. Go to Django Admin Panel
2. Navigate to Catalog > Products
3. Click "Bulk Import Products" button

### Step 3: Upload File
1. Select your prepared Excel file
2. Click "Upload & Import"
3. Wait for processing (may take a few moments for large files)

### Step 4: Review Results
1. Check the import summary displayed
2. Review error messages if any
3. Verify products in the Products list

### Step 5: Post-Import Setup
1. Add product descriptions manually (not part of bulk import)
2. Upload product images (can use the product edit page)
3. Create product variants if needed (color/size combinations)

## Examples

### Example 1: Basic Product Import
```
Category,Name,Slug,SKU,HSN Code,Price,Stock,Is Active
Boxes,Brown Box,brown-box,BOX-01,9403,150.00,500,Yes
Boxes,White Box,white-box,BOX-02,9403,120.00,300,Yes
```

### Example 2: With Optional Fields
```
Category,Name,SKU,Price,Compare At Price,GST Percentage,Stock,Is Bestseller,Is Returnable,Min Qty
Boxes,Premium Box,BOX-03,200.00,250.00,18.00,200,Yes,Yes,5
Boxes,Economy Box,BOX-04,80.00,,18.00,1000,No,Yes,1
```

### Example 3: Skipping Rows
```
Category,Name,SKU,Price,Is_live
Boxes,Active Box,BOX-05,150.00,
Boxes,Inactive Box,BOX-06,150.00,Yes
```
In this case, BOX-05 would be imported but BOX-06 would be skipped.

## API/View Details

### Files Modified/Created

1. **catalog/utils.py** - `bulk_import_products()`
   - Processes Excel files and creates products
   - Handles all validation and error checking
   - Returns detailed import summary

2. **catalog/forms.py** - `BulkImportProductForm`
   - Validates file upload
   - Checks file type and size
   - Provides user-friendly error messages

3. **catalog/admin_views.py** - `bulk_import_products_view()`
   - Django admin view for handling imports
   - Displays import form and results
   - Staff-only access

4. **catalog/admin.py** - ProductAdmin changes
   - Added custom URL for bulk import
   - Added button to product changelist
   - Integrated with Django admin site

5. **catalog/templates/admin/catalog/bulk_import_products.html**
   - Import form UI
   - Instructions and column reference
   - Result display

6. **catalog/templates/admin/catalog/product_changelist.html**
   - Custom product changelist template
   - Added "Bulk Import Products" button

## Troubleshooting

### File Not Accepted
- Ensure file is in .xlsx format (not .csv or .xls)
- File size should be less than 10MB
- Check file isn't corrupted

### Products Not Importing
- Verify required columns: Category, Name, SKU, Price
- Check for duplicate SKUs (will be skipped)
- Verify Category exists or will be auto-created
- Check for syntax errors in boolean fields

### Partial Import Success
- Review the error summary to see which rows failed
- Common issues: Invalid price format, missing required fields
- Fix errors and re-upload the file

### Performance Issues
- For very large files (1000+ rows), consider splitting into multiple files
- Import runs synchronously (doesn't use background tasks)

## Future Enhancements

Potential improvements for future versions:
1. Background task processing for large files
2. Template download from admin
3. Import history/logs
4. Batch edit after import
5. Product variant import
6. Image URL import
7. CSV format support

## Security Considerations

1. **Staff-Only Access**: Only authenticated admins can access
2. **CSRF Protection**: Django CSRF token required
3. **File Validation**: Strict file type and size checks
4. **Data Validation**: All fields validated before DB insertion
5. **Error Handling**: Safe error messages (no sensitive info leak)

## Performance Notes

- Processing speed: ~100-500 rows/second (depends on system)
- Memory usage: Moderate (file read into memory)
- Database: Each row is individual transaction (could be optimized with batch_create)

## Notes

- Product descriptions and images must be added manually post-import
- Product variants are not included in bulk import
- Order of columns doesn't matter (matched by header name)
- Slug is automatically ensured to be unique
- SKU normalization is applied automatically
