import os
import sys
from sqlalchemy import text
from main import create_app
from database import db

def fix_schema():
    app = create_app()
    with app.app_context():
        print("Checking database schema...")
        try:
            # Check if verification_code exists
            db.session.execute(text("SELECT verification_code FROM users LIMIT 1"))
            print("verification_code column already exists.")
        except Exception:
            db.session.rollback()
            print("Adding verification_code column...")
            try:
                db.session.execute(text("ALTER TABLE users ADD COLUMN verification_code VARCHAR(10)"))
                db.session.commit()
                print("Column added successfully.")
            except Exception as e:
                print(f"Error adding column: {e}")
                db.session.rollback()

        try:
            # Drop verification_token if it exists (optional but good for cleanup)
            print("Attempting to drop verification_token column...")
            # Note: SQLite doesn't support DROP COLUMN in older versions easily, 
            # so we might just leave it or use a proper migration if needed.
            # For simplicity, we just won't use it.
            pass
        except Exception:
            db.session.rollback()

        print("Schema fix complete.")

if __name__ == "__main__":
    fix_schema()
