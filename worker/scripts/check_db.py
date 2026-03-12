#!/usr/bin/env python3
from __future__ import annotations

from sqlalchemy import text

from app.clients.db import engine


def main() -> None:
    with engine.connect() as conn:
        current_database = conn.execute(text("select current_database()")).scalar_one()
        version = conn.execute(text("show server_version")).scalar_one()
    print(f"database={current_database}")
    print(f"server_version={version}")


if __name__ == "__main__":
    main()
