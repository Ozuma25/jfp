from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0014_order_billing_company_name_order_billing_gst_number_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="shipping_method",
            field=models.CharField(
                choices=[
                    ("store_pickup", "Direct store pickup"),
                    ("doorstep", "Doorstep delivery"),
                    ("custom_courier", "Custom courier (fee quoted separately)"),
                ],
                db_index=True,
                default="doorstep",
                max_length=32,
            ),
        ),
    ]
