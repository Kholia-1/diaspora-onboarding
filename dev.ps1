# dev.ps1 — lance l'environnement de développement de la nouvelle architecture.
# Usage :
#   .\dev.ps1 pg        # démarre PostgreSQL 16 (binaires zip, données dans Documents\pgsql16-data)
#   .\dev.ps1 backend   # démarre le backend Spring Boot sur :8080 (force JAVA_HOME vers le JDK 21)
#   .\dev.ps1 frontend  # démarre le frontend React (Vite) sur :5173
#   .\dev.ps1 ocr       # démarre le microservice OCR sur :8020
#   .\dev.ps1 legacy    # démarre l'app FastAPI historique sur :8010 (onboarding.afb-firstagent.com)
#   .\dev.ps1 newstack  # démarre la NOUVELLE stack : PG + OCR:8020 + Spring:8080 + gateway Angular:8090
#                       # (public : onboardingv2.afb-firstagent.com) — isolée du legacy
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
        # Node est une installation portable absente du PATH des sous-shells.
        $Node = "C:\Users\daniel_dzangue\Documents\node-v24.17.0-win-x64"
        if (Test-Path $Node) { $env:PATH = "$Node;$env:PATH" }
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
    "buildfront" {
        # Build des 3 apps Angular avec les base-href de service (shell à la racine,
        # remotes sous /remotes/*).
        # PIÈGE : lancer ces builds depuis Git Bash CORROMPT --base-href / — MSYS
        # convertit "/" en chemin Windows et produit <base href="C:/.../PortableGit/">,
        # ce qui casse tous les assets côté navigateur (page blanche). Depuis
        # PowerShell il n'y a pas de conversion. (En Git Bash : MSYS_NO_PATHCONV=1.)
        $Node = "C:\Users\daniel_dzangue\Documents\node-v24.17.0-win-x64\node.exe"
        $Ng   = "$Root\portal\node_modules\@angular\cli\bin\ng.js"
        Set-Location "$Root\portal"
        & $Node $Ng build shell    --base-href /
        & $Node $Ng build promote  --base-href /remotes/promote/
        & $Node $Ng build diaspora --base-href /remotes/diaspora/
        Write-Output ""
        Write-Output "Verification des <base href> (doivent etre / , /remotes/promote/ , /remotes/diaspora/) :"
        foreach ($a in @("shell", "promote", "diaspora")) {
            $f = "$Root\portal\dist\$a\browser\index.html"
            if (Test-Path $f) {
                $m = Select-String -Path $f -Pattern '<base href="[^"]*"'
                if ($m) { Write-Output ("  " + $a + " : " + $m.Matches[0].Value) }
            }
        }
    }
    "promote" {
        # Backend promoteApp (souscription produit + recharge de carte) sur :8390,
        # en profil dev (H2 en mémoire + stockage mémoire) : AUCUN Docker/Postgres/
        # MinIO requis. Dépôt SÉPARÉ, cloné à côté (..\promoteApp). Sert /promote-api
        # du gateway (le remote Angular « promote » l'appelle).
        # Build (pas de mvnw dans promoteApp) : depuis ce repo,
        #   .\backend\mvnw.cmd -DskipTests -f ..\..\promoteApp\backend\pom.xml package
        $PromoteJar = "$Root\..\promoteApp\backend\target\promote-backend-1.0.0.jar"
        if (-not (Test-Path $PromoteJar)) {
            Write-Warning "Jar promoteApp absent : $PromoteJar. Cf. commande de build en commentaire."
            break
        }
        $env:JAVA_HOME = $Jdk21
        $env:SPRING_PROFILES_ACTIVE = "dev"
        $env:SERVER_PORT = "8390"
        $env:JWT_SECRET = "dev-local-promote-secret-key-at-least-32-bytes-long-000"
        $env:ADMIN_EMAIL = "admin.promote@afrilandfirstbank.com"; $env:ADMIN_PASSWORD = "Promote@Admin1"; $env:ADMIN_NAME = "Administrateur Promote"
        $env:PRINT_EMAIL = "imprimeur.promote@afrilandfirstbank.com"; $env:PRINT_PASSWORD = "Promote@Print1"; $env:PRINT_NAME = "Point d'impression"
        $env:CASHIER_EMAIL = "caissier.promote@afrilandfirstbank.com"; $env:CASHIER_PASSWORD = "Promote@Cash1"; $env:CASHIER_NAME = "Caissier Promote"
        $env:SEED_TEST_AGENT = "true"
        Set-Location "$Root\..\promoteApp\backend"
        & "$Jdk21\bin\java.exe" -jar $PromoteJar
    }
    "newstack" {
        # Lance TOUTE la nouvelle stack sur l'hôte, chacun dans sa fenêtre :
        #   PostgreSQL(:5432) + OCR(:8020) + Spring(:8080) + Gateway Angular(:8090).
        # Le gateway hôte (host-gateway.mjs) remplace l'image Docker nginx du
        # portal (indisponible ici : pas de Docker Linux / WSL2). En prod Linux,
        # utiliser l'image du portal à la place.
        # Public : https://onboardingv2.afb-firstagent.com (tunnel cloudflared).
        $Node   = "C:\Users\daniel_dzangue\Documents\node-v24.17.0-win-x64\node.exe"
        $VenvPy = "$Root\.venv\Scripts\python.exe"
        $Jar    = "$Root\backend\target\diaspora-backend-0.0.1-SNAPSHOT.jar"
        if (-not $env:OCR_SERVICE_API_KEY) { $env:OCR_SERVICE_API_KEY = "dev-local-key" }

        # 0. PostgreSQL
        & "$Pg\bin\pg_ctl" -D $PgData status | Out-Null
        if ($LASTEXITCODE -ne 0) {
            & "$Pg\bin\pg_ctl" -D $PgData -l "$PgData\server.log" start
            Start-Sleep -Seconds 2
        }

        # 1. OCR :8020 (clé partagée avec Spring via $env:OCR_SERVICE_API_KEY)
        Start-Process -FilePath $VenvPy `
            -ArgumentList "-m","uvicorn","main:app","--host","127.0.0.1","--port","8020" `
            -WorkingDirectory "$Root\ocr-service"

        # 2. Backend Spring :8080 (JDK 21 ; pointe vers l'OCR)
        if (Test-Path $Jar) {
            $env:JAVA_HOME = $Jdk21
            $env:OCR_SERVICE_BASE_URL = "http://127.0.0.1:8020"
            Start-Process -FilePath "$Jdk21\bin\java.exe" `
                -ArgumentList "-jar",$Jar `
                -WorkingDirectory "$Root\backend"
        } else {
            Write-Warning "Jar Spring absent. Build : cd backend; .\mvnw.cmd -DskipTests package"
        }

        # 3. Gateway Angular :8090 (sert shell+remotes, proxifie /api -> Spring :8080)
        if (Test-Path "$Root\portal\dist\shell\browser\index.html") {
            Start-Process -FilePath $Node `
                -ArgumentList "deploy\host-gateway.mjs" `
                -WorkingDirectory "$Root\portal"
        } else {
            Write-Warning "Build Angular absent. Build : cd portal; puis 3 x ng build (shell --base-href /, promote --base-href /remotes/promote/, diaspora --base-href /remotes/diaspora/)"
        }

        Write-Output ""
        Write-Output "Nouvelle stack lancee (chaque service dans sa propre fenetre) :"
        Write-Output "  Gateway Angular : http://localhost:8090   -> public https://onboardingv2.afb-firstagent.com"
        Write-Output "  Backend Spring  : http://localhost:8080/api"
        Write-Output "  OCR service     : http://localhost:8020/health"
        Write-Output "  Tunnel          : gere par cloudflared (run firstagent) - separe"
    }
    default {
        "Usage : .\dev.ps1 [pg|backend|frontend|ocr|legacy|buildfront|promote|newstack]"
    }
}
