import io
from decimal import Decimal, ROUND_HALF_UP
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm

def generate_order_receipt_pdf(order):
    """
    Generates a professional PDF receipt for a boutique order.
    Returns: BytesIO object containing the PDF data.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=2*cm, 
        leftMargin=2*cm, 
        topMargin=2*cm, 
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=26,
        textColor=colors.HexColor("#004B6E"),
        spaceAfter=0.5*cm,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#D4AF37"),
        leading=14,
        textTransform='uppercase',
        letterSpacing=2
    )

    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#334155"),
        leading=12
    )
    
    item_name_style = ParagraphStyle(
        'ItemName',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#004B6E"),
        leading=11
    )

    elements = []

    # --- Header ---
    elements.append(Paragraph("Jai Fancy Packs", title_style))
    elements.append(Paragraph("Premium Return Gift & Packaging Solution — Estd. 2023", subtitle_style))
    elements.append(Spacer(1, 1*cm))

    # --- Order Info & Addresses ---
    o_num = order.order_number or f"#{order.id}"
    o_date = order.created_at.strftime('%d %b %Y') if order.created_at else 'N/A'
    s_name = order.shipping_name or 'Humble Customer'
    s_addr = order.shipping_address_line1 or 'Direct Boutique Pickup'
    s_city = order.shipping_city or ''
    s_state = order.shipping_state or ''
    s_pin = order.shipping_postal_code or ''
    s_phone = order.shipping_phone or ''

    is_store_pickup = getattr(order, "shipping_method", "") == "store_pickup"
    if is_store_pickup:
        ship_block = f"<b>SHIPPING TO:</b><br/>{s_name}<br/>In-store pickup"
    else:
        ship_block = (
            f"<b>SHIPPING TO:</b><br/>{s_name}<br/>{s_addr}<br/>"
            f"{s_city}, {s_state} — {s_pin}<br/>Phone: {s_phone}"
        )

    data = [
        [
            Paragraph(f"<b>ORDER RECEIPT</b><br/>Order: {o_num}<br/>Date: {o_date}", info_style),
            Paragraph(ship_block, info_style),
        ]
    ]
    t = Table(data, colWidths=[8*cm, 9*cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 1*cm))

    # --- Items Table (rate = per unit incl. taxes; no GST column) ---
    table_data = [["Product", "Rate", "Qty", "Line Total"]]

    for line in order.lines.all().select_related("product"):
        p_name = line.product.name if line.product else "Boutique Item"
        raw_qty = line.quantity or 0
        l_total = line.line_total or 0
        div_qty = raw_qty if raw_qty >= 1 else 1
        unit_incl = (Decimal(str(l_total)) / Decimal(div_qty)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        table_data.append([
            Paragraph(p_name, item_name_style),
            f"Rs. {unit_incl}",
            str(raw_qty),
            f"Rs. {l_total}",
        ])

    table = Table(table_data, colWidths=[8.5 * cm, 3 * cm, 1.5 * cm, 3.5 * cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#004B6E")),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('ALIGN', (1,1), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,1), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 1*cm))

    # --- Calculation Summary (tax-inclusive items; no GST breakdown) ---
    lines_sum = sum((Decimal(str(line.line_total or 0)) for line in order.lines.all()), Decimal("0")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    ship = Decimal(str(order.shipping_cost or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    o_total = Decimal(str(order.total or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    summary_data = [["Subtotal", f"Rs. {lines_sum}"]]
    if ship > 0:
        summary_data.append(["Delivery", f"Rs. {ship}"])
    summary_data.append(["Grand Total", f"Rs. {o_total}"])
    
    summary_table = Table(summary_data, colWidths=[13*cm, 4*cm])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (-2,-1), (-1,-1), 12),
        ('TOPPADDING', (0,-1), (-1,-1), 10),
        ('LINEABOVE', (0,-1), (-1,-1), 2, colors.HexColor("#D4AF37")),
    ]))
    elements.append(summary_table)

    # --- Footer ---
    elements.append(Spacer(1, 2*cm))
    elements.append(Paragraph("Thank you for choosing Jai Fancy Packs for your gifting needs.<br/>This is a computer-generated receipt and doesn't require a signature.", info_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
