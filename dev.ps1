# dev.ps1 — lance l'environnement de développement de la nouvelle architecture.
# Usage :
#   .\dev.ps1 pg        # démarre PostgreSQL 16 (binaires zip, données dans Documents\pgsql16-data)
#   .\dev.ps1 backend   # démarre le backend Spring Boot sur :8080 (force JAVA_HOME vers le JDK 21)
#   .\dev.ps1 frontend  # démarre le frontend React (Vite) sur :5173
#   .\dev.ps1 ocr       # démarre le microservice OCR sur :8020
#   .\dev.ps1 legacy    # démarre l'app FastAPI historique sur :8010 (tunnel Cloudflare)
param([string]$Service = "")

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Pg = "C:\Users\daniel_dzangue\Documents\pgsql16"
$PgData = "C:\Users\daniel_dzangue\Documents\pgsql16-data"
$Jdk21 = "C:\Users\daniel_dzangue\Documents\jdk-21.0.11+10"

switch ($Service) {
    "pg" {
        & "$Pg\bin\pg_ctl" -D $PgData status
        if ($LASTEXITCODE -ne 0) {
            & "$Pg\bin\pg_ctl" -D $PgData -l "$PgData\server.log" start
        } else {
            "PostgreSQL tourne déjà."
        }
    }
    "backend" {
        # ATTENTION : le java du PATH est un JDK 1.7 — on force le 21.
        $env:JAVA_HOME = $Jdk21
        $env:PATH = "$Jdk21\bin;$env:PATH"
        Set-Location "$Root\backend"
        .\mvnw.cmd spring-boot:run
    }
    "frontend" {
        Set-Location "$Root\frontend"
        npm run dev
    }
    "ocr" {
        Set-Location "$Root\ocr-service"
        if (-not $env:OCR_SERVICE_API_KEY) { $env:OCR_SERVICE_API_KEY = "dev-local-key" }
        python -m uvicorn main:app --host 127.0.0.1 --port 8020
    }
    "legacy" {
        Set-Location $Root
        & .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8010
    }
    default {
        "Usage : .\dev.ps1 [pg|backend|frontend|ocr|legacy]"
    }
}
