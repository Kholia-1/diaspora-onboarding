"""Migration des données SQLite → PostgreSQL (rejouable).

Copie table par table dans l'ordre des clés étrangères, avec conversions de types,
puis recale les séquences et imprime un rapport de comptage des deux côtés.

Usage :
    python tools/migrate_sqlite_to_pg.py [--pg "postgresql://postgres@localhost:5432/diaspora"]

Prérequis : le schéma PostgreSQL doit exister (Flyway V1 appliqué par le backend Spring,
ou `psql -f backend/src/main/resources/db/migration/V1__baseline.sql`).
"""
import argparse
import os
import sqlite3
import sys
from datetime import date, datetime

import psycopg

SQLITE_DB = os.path.join(os.path.dirname(__file__), "..", "diaspora_onboarding.db")

# Ordre FK : parents d'abord (TRUNCATE fait en ordre inverse avec CASCADE)
TABLES = [
    "backoffice_users",
    "backoffice_sessions",
    "audit_logs",
    "agencies",
    "nationalities",
    "countries",
    "account_applications",
    "application_documents",
    "payment_transactions",
    "account_opening_records",
]

BOOL_PREFIXES = ("is_", "has_")


def convert(table, column, value, pg_type):
    if value is None:
        return None
    if pg_type == "boolean":
        return bool(value)
    if pg_type in ("timestamp without time zone", "timestamp with time zone"):
        if isinstance(value, (datetime, date)):
            return value
        text = str(value).strip()
        if not text:
            return None
        try:
            return datetime.fromisoformat(text)
        except ValueError:
            return None
    if pg_type == "date":
        if isinstance(value, date):
            return value
        text = str(value).strip()
        if not text:
            return None
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return None
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pg", default=os.getenv("PG_URL", "postgresql://postgres@localhost:5432/diaspora"))
    parser.add_argument("--sqlite", default=SQLITE_DB)
    args = parser.parse_args()

    lite = sqlite3.connect(args.sqlite)
    lite.row_factory = sqlite3.Row
    # Fusionne le WAL avant lecture pour ne rien rater
    lite.execute("PRAGMA wal_checkpoint(TRUNCATE)")

    pg = psycopg.connect(args.pg, autocommit=False)
    report = []

    with pg.transaction():
        with pg.cursor() as cur:
            # Purge en ordre inverse pour rejouabilité
            for table in reversed(TABLES):
                cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")

            for table in TABLES:
                # Colonnes communes SQLite ∩ PostgreSQL
                lite_cols = [r["name"] for r in lite.execute(f"PRAGMA table_info({table})")]
                cur.execute(
                    "SELECT column_name, data_type FROM information_schema.columns "
                    "WHERE table_name = %s ORDER BY ordinal_position",
                    (table,),
                )
                pg_cols = {name: dtype for name, dtype in cur.fetchall()}
                cols = [c for c in lite_cols if c in pg_cols]

                rows = lite.execute(f"SELECT {', '.join(cols)} FROM {table}").fetchall()
                if rows:
                    placeholders = ", ".join(["%s"] * len(cols))
                    insert = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders})"
                    data = [
                        tuple(convert(table, c, row[c], pg_cols[c]) for c in cols)
                        for row in rows
                    ]
                    cur.executemany(insert, data)

                # Recale la séquence d'ID
                if "id" in cols:
                    cur.execute(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
                    )

                lite_count = lite.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                pg_count = cur.fetchone()[0]
                report.append((table, lite_count, pg_count))

    print(f"{'Table':<28} {'SQLite':>8} {'PostgreSQL':>11} {'OK':>4}")
    print("-" * 56)
    failures = 0
    for table, lite_count, pg_count in report:
        ok = "oui" if lite_count == pg_count else "NON"
        if lite_count != pg_count:
            failures += 1
        print(f"{table:<28} {lite_count:>8} {pg_count:>11} {ok:>4}")

    # Contrôles d'intégrité complémentaires
    checks = [
        ("références dossiers", "SELECT COUNT(DISTINCT reference) FROM account_applications"),
        ("emails dossiers", "SELECT COUNT(DISTINCT email) FROM account_applications"),
    ]
    with pg.cursor() as cur:
        for label, sql in checks:
            lite_val = lite.execute(sql).fetchone()[0]
            cur.execute(sql)
            pg_val = cur.fetchone()[0]
            status = "oui" if lite_val == pg_val else "NON"
            if lite_val != pg_val:
                failures += 1
            print(f"checksum {label:<19} {lite_val:>8} {pg_val:>11} {status:>4}")

    if failures:
        print(f"\nÉCHEC : {failures} écart(s) détecté(s).")
        sys.exit(1)
    print("\nMigration OK : comptages identiques des deux côtés.")


if __name__ == "__main__":
    main()
