"""
create_pg_database.py
─────────────────────
Creates the PostgreSQL 'apointz' database if it does not already exist.

Usage (run from the backend/ directory):
    python create_pg_database.py

Set DB_PASSWORD in backend/.env before running.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "apointz")

if not DB_PASSWORD:
    print("ERROR: DB_PASSWORD is not set in backend/.env")
    sys.exit(1)

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2-binary not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Connect to the default 'postgres' database to manage databases
print(f"Connecting to PostgreSQL as {DB_USER}@{DB_HOST}:{DB_PORT} ...")
try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        dbname="postgres",         # connect to default DB to create a new one
        user=DB_USER,
        password=DB_PASSWORD,
    )
    conn.autocommit = True  # CREATE DATABASE must run outside a transaction
    cur = conn.cursor()
    print("  Connected successfully.")
except Exception as e:
    print(f"ERROR: Could not connect to PostgreSQL: {e}")
    sys.exit(1)

# Check if the database already exists
cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
exists = cur.fetchone()

if exists:
    print(f"\nDatabase '{DB_NAME}' already exists. Nothing to do.")
else:
    cur.execute(f'CREATE DATABASE "{DB_NAME}"')
    print(f"\nDatabase '{DB_NAME}' created successfully!")

cur.close()
conn.close()

print(f"\nAll done. Make sure Flask is running to let SQLAlchemy create the tables via db.create_all().")
