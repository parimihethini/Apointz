"""
migrate_sqlite_to_postgres.py
─────────────────────────────
Migrates existing data from the Apointz SQLite database into PostgreSQL.

Usage (run from the backend/ directory):
    python migrate_sqlite_to_postgres.py
"""

import os
import sqlite3 as _sl
import sys
from dotenv import load_dotenv

# ── Load env vars ─────────────────────────────────────────────────────────────
load_dotenv()

DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "apointz")

# Columns that are BOOLEAN in PostgreSQL but 0/1 integers in SQLite
BOOLEAN_COLUMNS = {
    "users":             {"is_admin", "is_verified"},
    "appointment_slots": {"is_booked"},
    "notifications":     {"is_read"},
}

# ── Locate SQLite file (pick the one with actual user data) ───────────────────
CANDIDATE_PATHS = [
    # Root-level instance/ — Flask writes here when run from project root
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "apointz.db")),
    # Backend-level instance/
    os.path.abspath(os.path.join(os.path.dirname(__file__), "instance", "apointz.db")),
    # Direct backend folder
    os.path.abspath(os.path.join(os.path.dirname(__file__), "apointz.db")),
]

sqlite_path = None
best_user_count = -1
for p in CANDIDATE_PATHS:
    if not os.path.exists(p):
        continue
    try:
        _c = _sl.connect(p)
        _cur = _c.cursor()
        _cur.execute("SELECT COUNT(*) FROM users")
        cnt = _cur.fetchone()[0]
        _c.close()
        print(f"  Candidate: {p}  ({cnt} users)")
        if cnt > best_user_count:
            best_user_count = cnt
            sqlite_path = p
    except Exception:
        pass

if not sqlite_path:
    print("ERROR: Could not find apointz.db with user data.")
    sys.exit(1)

print(f"\nUsing SQLite DB: {sqlite_path}  ({best_user_count} users)")

if not DB_PASSWORD:
    print("ERROR: DB_PASSWORD is not set in backend/.env")
    sys.exit(1)

# ── Connect  ──────────────────────────────────────────────────────────────────
try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2-binary not installed.")
    sys.exit(1)

print(f"PostgreSQL : {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")
try:
    pg_conn = psycopg2.connect(
        host=DB_HOST, port=int(DB_PORT),
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
    )
    pg_conn.autocommit = False
    pg_cur = pg_conn.cursor()
    print("Connection : OK\n")
except Exception as e:
    print(f"ERROR connecting to PostgreSQL: {e}")
    sys.exit(1)

sl_conn = _sl.connect(sqlite_path)
sl_conn.row_factory = _sl.Row
sl_cur = sl_conn.cursor()

# Migration order respects FK constraints
TABLES = [
    "services",
    "users",
    "businesses",
    "appointment_slots",
    "bookings",
    "notifications",
    "reviews",
]


def get_pg_columns(table):
    pg_cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = %s ORDER BY ordinal_position",
        (table,),
    )
    return [r[0] for r in pg_cur.fetchall()]


def coerce(value, col_name, table):
    """Convert SQLite 0/1 booleans to Python bool for PostgreSQL BOOLEAN columns."""
    if col_name in BOOLEAN_COLUMNS.get(table, set()):
        if value is None:
            return None
        return bool(int(value))
    return value


def migrate_table(table):
    sl_cur.execute(f"SELECT * FROM [{table}]")
    rows = sl_cur.fetchall()

    if not rows:
        print(f"  {table:28s}: 0 rows — skipped")
        return

    pg_cols = get_pg_columns(table)
    if not pg_cols:
        print(f"  {table:28s}: WARNING — table missing in PostgreSQL")
        return

    sl_cols  = list(rows[0].keys())
    common   = [c for c in sl_cols if c in pg_cols]
    col_list = ", ".join(f'"{c}"' for c in common)
    plh_list = ", ".join(["%s"] * len(common))
    sql      = f'INSERT INTO "{table}" ({col_list}) VALUES ({plh_list}) ON CONFLICT DO NOTHING'

    ok = skip = 0
    for row in rows:
        values = tuple(coerce(row[c], c, table) for c in common)
        try:
            pg_cur.execute(sql, values)
            ok += 1
        except Exception as e:
            pg_conn.rollback()
            row_id = row["id"] if "id" in row.keys() else "?"
            print(f"    SKIP id={row_id}: {type(e).__name__}: {e}")
            skip += 1

    pg_conn.commit()

    # Advance sequence so new INSERTs don't clash with migrated IDs
    try:
        pg_cur.execute(
            f"SELECT setval(pg_get_serial_sequence('\"{table}\"', 'id'), "
            f"COALESCE(MAX(id), 1)) FROM \"{table}\""
        )
        pg_conn.commit()
    except Exception:
        pg_conn.rollback()

    summary = f"{ok} migrated"
    if skip:
        summary += f", {skip} skipped"
    print(f"  {table:28s}: {summary}")


# ── Run ───────────────────────────────────────────────────────────────────────
print("Starting migration...\n")
for t in TABLES:
    try:
        migrate_table(t)
    except Exception as exc:
        print(f"  ERROR in {t}: {exc}")
        pg_conn.rollback()

sl_conn.close()
pg_cur.close()
pg_conn.close()
print("\nMigration complete!")
