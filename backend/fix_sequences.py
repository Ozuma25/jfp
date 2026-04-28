import os
import sys
import django

# -- Bootstrap Django --
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from psycopg2 import sql

QUERY = """
SELECT
    tc.table_name,
    pg_get_serial_sequence(quote_ident(tc.table_name), 'id') AS seq_name
FROM information_schema.tables tc
JOIN information_schema.columns c
    ON  c.table_name  = tc.table_name
    AND c.table_schema = tc.table_schema
    AND c.column_name  = 'id'
WHERE tc.table_schema = 'public'
  AND tc.table_type   = 'BASE TABLE'
"""

fixed = []
skipped = []

with connection.cursor() as cursor:
    cursor.execute(QUERY)
    rows = cursor.fetchall()

    for table_name, seq_name in rows:
        if not seq_name:
            skipped.append("%s: no sequence" % table_name)
            continue
        try:
            query = sql.SQL("SELECT SETVAL(%s, COALESCE(MAX(id), 1)) FROM {}").format(
                sql.Identifier(table_name)
            )
            cursor.execute(query, [seq_name])
            val = cursor.fetchone()[0]
            fixed.append("  %-50s -> reset to %d" % (table_name, val))
        except Exception as e:
            skipped.append("  %s: %s" % (table_name, e))

print("[OK] Reset %d sequences:" % len(fixed))
for line in fixed:
    print(line)

if skipped:
    print("\n[WARN] Skipped %d:" % len(skipped))
    for line in skipped:
        print(line)
