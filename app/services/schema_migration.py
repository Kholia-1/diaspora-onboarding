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


# SCHEMA_MIGRATION_GENERIC_V1
def sync_table_columns(engine, table):
    """Ajoute à la table toutes les colonnes du modèle absentes de la base.

    Les colonnes sont ajoutées nullable (sans défaut SQL) : les défauts Python
    des modèles s'appliquent aux nouvelles insertions.
    """
    inspector = inspect(engine)

    if table.name not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table.name)
    }

    for column in table.columns:
        if column.name in existing_columns:
            continue

        try:
            column_type = column.type.compile(dialect=engine.dialect)
        except Exception:
            column_type = "TEXT"

        with engine.begin() as connection:
            connection.execute(
                text(f"ALTER TABLE {table.name} ADD COLUMN {column.name} {column_type}")
            )

        print(f"[MIGRATION] Colonne ajoutée : {table.name}.{column.name}")


def migrate_account_applications(engine):
    # Migration historique ciblée (conservée pour compatibilité).
    add_column_if_missing(engine, "account_applications", "birth_name", "VARCHAR(150)")
    add_column_if_missing(engine, "account_applications", "residency_status", "VARCHAR(50) DEFAULT 'RESIDENT'")

    add_column_if_missing(engine, "account_applications", "rib", "VARCHAR(100)")

    add_column_if_missing(engine, "account_applications", "account_object", "VARCHAR(150)")
    add_column_if_missing(engine, "account_applications", "account_object_other", "TEXT")

    add_column_if_missing(engine, "account_applications", "funds_origin", "VARCHAR(150)")
    add_column_if_missing(engine, "account_applications", "funds_origin_other", "TEXT")

    # Migration générique : aligne toutes les tables connues sur les modèles.
    from app.database import Base

    for table in Base.metadata.sorted_tables:
        sync_table_columns(engine, table)
