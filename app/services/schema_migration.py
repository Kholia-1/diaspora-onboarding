from sqlalchemy import inspect, text


def add_column_if_missing(engine, table_name: str, column_name: str, column_definition: str):
    inspector = inspect(engine)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    if column_name in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")
        )


def migrate_account_applications(engine):
    add_column_if_missing(engine, "account_applications", "birth_name", "VARCHAR(150)")
    add_column_if_missing(engine, "account_applications", "residency_status", "VARCHAR(50) DEFAULT 'RESIDENT'")

    add_column_if_missing(engine, "account_applications", "rib", "VARCHAR(100)")

    add_column_if_missing(engine, "account_applications", "account_object", "VARCHAR(150)")
    add_column_if_missing(engine, "account_applications", "account_object_other", "TEXT")

    add_column_if_missing(engine, "account_applications", "funds_origin", "VARCHAR(150)")
    add_column_if_missing(engine, "account_applications", "funds_origin_other", "TEXT")