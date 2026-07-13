"""Banc d'essai OCR sur le corpus des CNI déjà envoyées.

Parcourt uploads/, déduplique les images CNI, exécute le pipeline complet
(OCR -> validation du type -> extraction des champs) et produit un rapport :
- data/ocr_corpus_report.json : résultats détaillés par image ;
- data/ocr_corpus_texts/      : textes OCR bruts pour analyse des règles.

Usage : python tools/ocr_cni_benchmark.py
"""
import io
import json
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.services.document_auth_service import (  # noqa: E402
    extract_text_with_best_engine,
    validate_document_type_against_ocr,
)
from app.routers.pre_onboarding import extract_prefill_fields  # noqa: E402

KEY_FIELDS = [
    "last_name",
    "first_name",
    "birth_date",
    "place_of_birth",
    "cni_number",
    "identity_issue_date",
    "identity_expiry_date",
    "sex",
]


def collect_corpus() -> list[Path]:
    seen: dict[str, Path] = {}
    for pattern in ("CNI_RECTO_*", "CNI_VERSO_*"):
        for path in (ROOT / "uploads").rglob(pattern):
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            seen.setdefault(path.name, path)
    return sorted(seen.values(), key=lambda p: p.name)


def main() -> None:
    corpus = collect_corpus()
    print(f"{len(corpus)} images CNI uniques trouvées.")

    texts_dir = ROOT / "data" / "ocr_corpus_texts"
    texts_dir.mkdir(parents=True, exist_ok=True)

    report = []

    for path in corpus:
        doc_type = "CNI_RECTO" if "RECTO" in path.name.upper() else "CNI_VERSO"
        content = path.read_bytes()
        mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"

        try:
            ocr = extract_text_with_best_engine(content, mime)
        except Exception as exc:
            report.append({"file": path.name, "error": str(exc)})
            print(f"ERREUR {path.name}: {exc}")
            continue

        text = ocr.get("text", "") or ""
        validation = validate_document_type_against_ocr(doc_type, text)
        fields = extract_prefill_fields("PERSONAL", doc_type, text)

        (texts_dir / (path.stem + ".txt")).write_text(text, encoding="utf-8")

        found = {k: fields.get(k) for k in KEY_FIELDS if fields.get(k)}
        entry = {
            "file": path.name,
            "document_type": doc_type,
            "size_bytes": len(content),
            "text_length": len(text),
            "type_validation": validation.get("status"),
            "detected_category": validation.get("detected_category"),
            "fields_found": found,
            "all_fields": fields,
        }
        report.append(entry)

        print(
            f"{path.name[:52]:52} | {entry['type_validation'] or '?':24} "
            f"| txt {len(text):4} | " + ", ".join(sorted(found)) if found else
            f"{path.name[:52]:52} | {entry['type_validation'] or '?':24} | txt {len(text):4} | (aucun champ)"
        )

    out = ROOT / "data" / "ocr_corpus_report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nRapport écrit : {out}")

    # Synthèse par champ
    rectos = [r for r in report if r.get("document_type") == "CNI_RECTO" and not r.get("error")]
    versos = [r for r in report if r.get("document_type") == "CNI_VERSO" and not r.get("error")]

    print(f"\nSynthèse ({len(rectos)} rectos, {len(versos)} versos) :")
    for field in KEY_FIELDS:
        rc = sum(1 for r in rectos if r["fields_found"].get(field))
        vc = sum(1 for r in versos if r["fields_found"].get(field))
        print(f"  {field:22} recto {rc}/{len(rectos)}   verso {vc}/{len(versos)}")


if __name__ == "__main__":
    main()
