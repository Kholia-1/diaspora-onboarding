from pathlib import Path
import json

from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/api/subsectors",
    tags=["Sous-secteurs d'activité"]
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = PROJECT_ROOT / "data" / "bank_subsectors.json"


def load_subsectors():
    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Fichier des sous-secteurs introuvable: {DATA_FILE}"
        )

    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lecture fichier sous-secteurs: {exc}"
        )

    if not isinstance(data, list):
        raise HTTPException(
            status_code=500,
            detail="Format invalide: bank_subsectors.json doit contenir une liste"
        )

    return data


@router.get("/active")
async def get_active_subsectors():
    """
    Retourne tous les sous-secteurs d'activité actifs.
    """
    return load_subsectors()


@router.get("/by-sector/{sector_code}")
async def get_subsectors_by_sector(sector_code: str):
    """
    Retourne les sous-secteurs rattachés à un secteur d'activité.
    """
    data = load_subsectors()

    sector_code_clean = sector_code.strip().upper()

    results = [
        item for item in data
        if str(item.get("sector_code", "")).strip().upper() == sector_code_clean
    ]

    return results


@router.get("/grouped")
async def get_grouped_subsectors():
    """
    Retourne les sous-secteurs groupés par secteur parent.
    """
    data = load_subsectors()
    grouped = {}

    for item in data:
        sector_code = item.get("sector_code") or "UNKNOWN"
        sector_label = item.get("sector") or "Secteur non défini"

        if sector_code not in grouped:
            grouped[sector_code] = {
                "sector_code": sector_code,
                "sector": sector_label,
                "subsectors": []
            }

        grouped[sector_code]["subsectors"].append({
            "code": item.get("code"),
            "label": item.get("label")
        })

    return list(grouped.values())
