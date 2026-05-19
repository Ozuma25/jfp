#!/usr/bin/env python3
"""
Create a properly formatted Excel file for bulk product import.
Works without openpyxl by using zipfile to create valid .xlsx directly.
"""

import zipfile
import io
from datetime import datetime

def create_excel_file(filename="sample_products.xlsx"):
    """Create a valid Excel file with sample product data."""
    
    # Sample product data
    headers = [
        "Category", "Name", "Slug", "SKU", "HSN Code", "Price",
        "Compare At Price", "GST Percentage", "Stock", "Height CM",
        "Width CM", "Weight G", "Is Active", "Is Bestseller",
        "Is Customizable", "Is Returnable", "Bulk Threshold",
        "Min Qty", "Is_live", "Notes"
    ]
    
    rows = [
        ["Gift Boxes", "Premium Gift Box - Small", "premium-gift-box-small", "GIFT-BOX-001", "4819", "150.00", "199.00", "18.00", "100", "10.5", "15.0", "200", "Yes", "Yes", "No", "Yes", "50", "1", "", "Popular small gift box"],
        ["Gift Boxes", "Premium Gift Box - Medium", "premium-gift-box-medium", "GIFT-BOX-002", "4819", "250.00", "349.00", "18.00", "75", "15.0", "20.0", "350", "Yes", "No", "Yes", "Yes", "30", "1", "", "Customizable medium box"],
        ["Packaging", "Tissue Paper Pack", "tissue-paper-pack", "TISSUE-PAPER-001", "4802", "50.00", "", "5.00", "500", "", "", "", "Yes", "Yes", "No", "No", "100", "5", "", "Assorted colors"],
        ["Ribbon & String", "Silk Ribbon - Gold", "silk-ribbon-gold", "RIBBON-GOLD-001", "5807", "75.00", "99.00", "12.00", "200", "", "2.5", "50", "Yes", "No", "No", "Yes", "", "1", "", "5 meter roll"],
    ]
    
    # Create worksheet XML
    def create_cell_xml(col_num, row_num, value):
        """Create XML for a single cell."""
        col_letter = ""
        n = col_num
        while n > 0:
            n -= 1
            col_letter = chr(65 + (n % 26)) + col_letter
            n //= 26
        
        cell_ref = f"{col_letter}{row_num}"
        
        if value is None or value == "":
            return f'<c r="{cell_ref}"/>'
        
        # Determine if it's a number
        is_number = False
        try:
            float(str(value))
            is_number = True
        except (ValueError, TypeError):
            pass
        
        if is_number:
            return f'<c r="{cell_ref}"><v>{value}</v></c>'
        else:
            # String - use inline string for simplicity
            value_str = str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            return f'<c r="{cell_ref}" t="inlineStr"><is><t>{value_str}</t></is></c>'
    
    # Build worksheet
    worksheet_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    worksheet_xml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
    worksheet_xml += '<sheetData>\n'
    
    # Header row
    row_xml = '<row r="1">'
    for col_num, header in enumerate(headers, 1):
        row_xml += create_cell_xml(col_num, 1, header)
    row_xml += '</row>\n'
    worksheet_xml += row_xml
    
    # Data rows
    for row_idx, row_data in enumerate(rows, 2):
        row_xml = f'<row r="{row_idx}">'
        for col_num, value in enumerate(row_data, 1):
            row_xml += create_cell_xml(col_num, row_idx, value)
        row_xml += '</row>\n'
        worksheet_xml += row_xml
    
    worksheet_xml += '</sheetData>\n'
    worksheet_xml += '</worksheet>'
    
    # Create workbook XML
    workbook_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Products" sheetId="1" r:id="rId1"/>
</sheets>
</workbook>'''
    
    # Create relationships
    rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>'''
    
    # Create content types
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>'''
    
    # Create the .xlsx file (which is a ZIP archive)
    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as xlsx:
        xlsx.writestr("[Content_Types].xml", content_types)
        xlsx.writestr("_rels/.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>''')
        xlsx.writestr("xl/workbook.xml", workbook_xml)
        xlsx.writestr("xl/_rels/workbook.xml.rels", rels_xml)
        xlsx.writestr("xl/worksheets/sheet1.xml", worksheet_xml)
    
    return filename

if __name__ == "__main__":
    filename = create_excel_file()
    print(f"✓ Created: {filename}")
    print(f"  - Contains 4 sample products with proper data")
    print(f"  - Ready to upload to Bulk Import feature")
    print(f"\nNext steps:")
    print(f"  1. Go to Django Admin > Catalog > Products")
    print(f"  2. Click 'Bulk Import Products' button")
    print(f"  3. Upload {filename}")
    print(f"  4. Review the import summary")
