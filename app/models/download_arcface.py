"""Télécharge le modèle ArcFace (InsightFace buffalo_l, w600k_r50) pour la
reconnaissance faciale KYC.

Ce fichier ONNX fait ~174 Mo → il n'est PAS versionné (dépasse la limite GitHub
de 100 Mo, cf. .gitignore). À exécuter une fois après un clone, sur chaque machine :

    python app/models/download_arcface.py

Source : mirror HuggingFace du pack buffalo_l (le dépôt GitHub d'InsightFace est
souvent bloqué par les proxies d'entreprise ; HuggingFace passe). Si l'ArcFace est
absent, le service bascule automatiquement sur SFace (modèle déjà versionné), plus
faible mais fonctionnel.
"""
import hashlib
import os
import sys
import urllib.request

URL = "https://huggingface.co/immich-app/buffalo_l/resolve/main/recognition/model.onnx?download=true"
DEST = os.path.join(os.path.dirname(__file__), "face_recognition_arcface_w600k_r50.onnx")
EXPECTED_SIZE = 174_383_860  # octets


def main() -> int:
    if os.path.exists(DEST) and os.path.getsize(DEST) == EXPECTED_SIZE:
        print(f"Déjà présent : {DEST}")
        return 0

    print(f"Téléchargement ArcFace (~174 Mo) depuis HuggingFace...\n  -> {DEST}")
    tmp = DEST + ".part"
    req = urllib.request.Request(URL, headers={"User-Agent": "python-urllib"})
    with urllib.request.urlopen(req, timeout=60) as r, open(tmp, "wb") as f:
        total = int(r.headers.get("Content-Length", EXPECTED_SIZE))
        done = 0
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            pct = 100 * done / total if total else 0
            print(f"\r  {done/1e6:6.1f} / {total/1e6:.1f} Mo ({pct:5.1f} %)", end="")
    print()
    os.replace(tmp, DEST)

    size = os.path.getsize(DEST)
    if size != EXPECTED_SIZE:
        print(f"ATTENTION : taille inattendue ({size} != {EXPECTED_SIZE}).", file=sys.stderr)
        return 1
    print("OK.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
