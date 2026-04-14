from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_product_gst_percentage"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductVariant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="variants", to="catalog.product")),
                ("color", models.CharField(blank=True, max_length=80, help_text="e.g. Red, Royal Blue, Gold")),
                ("size", models.CharField(blank=True, max_length=80, help_text="e.g. Small, Medium, Large, XL or 10x12cm")),
                ("price_override", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, help_text="Leave blank to use the base product price.")),
                ("stock", models.PositiveIntegerField(default=0)),
                ("sku_suffix", models.CharField(blank=True, max_length=64, help_text="Optional suffix appended to the base SKU (e.g. -RED-L).")),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="ProductVariantImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("variant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="catalog.productvariant")),
                ("image", models.ImageField(upload_to="variants/%Y/%m/")),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
    ]
