import os
import sys
from sqlalchemy import text
from main import create_app
from database import db

def fix_schema_map():
    app = create_app()
    with app.app_context():
        print("Checking businesses table schema...")
        try:
            # Check if map_url exists
            db.session.execute(text("SELECT map_url FROM businesses LIMIT 1"))
            print("map_url column already exists.")
        except Exception:
            db.session.rollback()
            print("Adding map_url column...")
            try:
                db.session.execute(text("ALTER TABLE businesses ADD COLUMN map_url VARCHAR(500)"))
                db.session.commit()
                print("Column added successfully.")
            except Exception as e:
                print(f"Error adding column: {e}")
                db.session.rollback()
        print("Schema fix complete.")

if __name__ == "__main__":
    fix_schema_map()
