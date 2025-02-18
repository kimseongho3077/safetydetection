# Generated by Django 4.2.18 on 2025-02-04 07:37

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("unique_num", models.BigAutoField(primary_key=True, serialize=False)),
                ("id", models.CharField(max_length=255, unique=True)),
                ("password", models.CharField(max_length=255)),
                ("name", models.CharField(max_length=255)),
                ("age", models.IntegerField()),
                ("address", models.CharField(max_length=255)),
                (
                    "detailed_address",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("phone_num", models.CharField(max_length=20)),
                ("guard_name", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "guard_phone_num",
                    models.CharField(blank=True, max_length=20, null=True),
                ),
                ("danger_degree", models.IntegerField(blank=True, null=True)),
                ("user_posture", models.IntegerField(blank=True, null=True)),
            ],
        ),
    ]
