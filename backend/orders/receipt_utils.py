import io
from datetime import datetime
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
        textColor=colors.HexColor("#1a1a1a"),
        spaceAfter=0.5*cm,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#c8a96e"),
        leading=14,
        textTransform='uppercase',
        letterSpacing=2
    )

    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#666666"),
        leading=12
    )

    elements = []

    # --- Header ---
    elements.append(Paragraph("Jai Fancy Packs", title_style))
    elements.append(Paragraph("Premium Gifting & Boutique Packaging — Estd. 1994", subtitle_style))
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

    data = [
        [
            Paragraph(f"<b>ORDER RECEIPT</b><br/>Order: {o_num}<br/>Date: {o_date}", info_style),
            Paragraph(f"<b>SHIPPING TO:</b><br/>{s_name}<br/>{s_addr}<br/>{s_city}, {s_state} — {s_pin}<br/>Phone: {s_phone}", info_style)
        ]
    ]
    t = Table(data, colWidths=[8*cm, 9*cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 1*cm))

    # --- Items Table ---
    # Header
    table_data = [['Product', 'Rate', 'GST %', 'Qty', 'Line Total']]
    
    for line in order.lines.all().select_related("product"):
        p_name = line.product.name if line.product else "Boutique Item"
        u_price = line.unit_price or 0
        g_pct = line.gst_percentage or 0
        qty = line.quantity or 0
        l_total = line.line_total or 0
        
        table_data.append([
            p_name,
            f"Rs. {u_price}",
            f"{g_pct}%",
            str(qty),
            f"Rs. {l_total}"
        ])

    table = Table(table_data, colWidths=[7*cm, 2.5*cm, 2*cm, 1.5*cm, 4*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1a1a1a")),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('ALIGN', (1,1), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#eeeeee")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 1*cm))

    # --- Calculation Summary ---
    o_sub = order.subtotal or 0
    o_disc = order.discount_amount or 0
    o_cgst = order.cgst_amount or 0
    o_sgst = order.sgst_amount or 0
    o_total = order.total or 0

    summary_data = [
        ["Subtotal", f"Rs. {o_sub}"],
        ["Coupon Discount", f"- Rs. {o_disc}"],
        ["CGST (9%)", f"Rs. {o_cgst}"],
        ["SGST (9%)", f"Rs. {o_sgst}"],
        ["Grand Total", f"Rs. {o_total}"],
    ]
    
    summary_table = Table(summary_data, colWidths=[13*cm, 4*cm])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (-2,-1), (-1,-1), 12),
        ('TOPPADDING', (0,-1), (-1,-1), 10),
        ('LINEABOVE', (0,-1), (-1,-1), 2, colors.HexColor("#c8a96e")),
    ]))
    elements.append(summary_table)

    # --- Footer ---
    elements.append(Spacer(1, 2*cm))
    elements.append(Paragraph("Thank you for choosing Jai Fancy Packs for your gifting needs.<br/>This is a computer-generated receipt and doesn't require a signature.", info_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
