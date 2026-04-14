from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cart", "0005_cart_abandoned_reminder_sent"),
    ]

    operations = [
        migrations.AddField(
            model_name="cartitem",
            name="price_at_add",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Product price at the time the item was added to cart.",
                max_digits=12,
                null=True,
            ),
        ),
    ]
