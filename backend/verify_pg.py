import os, sys
from dotenv import load_dotenv
load_dotenv()
import psycopg2

conn = psycopg2.connect(
    host=os.getenv("DB_HOST","localhost"),
    port=int(os.getenv("DB_PORT","5432")),
    dbname=os.getenv("DB_NAME","apointz"),
    user=os.getenv("DB_USER","postgres"),
    password=os.getenv("DB_PASSWORD",""),
)
cur = conn.cursor()
tables = ["services","users","businesses","appointment_slots","bookings","notifications","reviews"]
print("=== PostgreSQL apointz DB ===")
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t}: {cur.fetchone()[0]} rows")
    except Exception as e:
        conn.rollback()
        print(f"  {t}: ERROR {e}")

print("\n--- Sample users (id, name, email, role, is_verified) ---")
cur.execute("SELECT id, name, email, role, is_verified FROM users LIMIT 10")
for r in cur.fetchall():
    print(f"  {r}")

conn.close()
print("\nDone.")
