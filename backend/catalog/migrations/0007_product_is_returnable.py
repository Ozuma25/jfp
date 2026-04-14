from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_productvariant"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="is_returnable",
            field=models.BooleanField(
                default=True,
                help_text="Uncheck for non-returnable items (e.g. perishables, custom prints).",
            ),
        ),
    ]
