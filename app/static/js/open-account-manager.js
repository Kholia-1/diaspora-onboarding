;/* ==== bloc script 1/40 (ordre du document preserve) ==== */

(function () {
            let opencvPromise = null;

            function loadOpenCv() {
                return new Promise(function (resolve) {
                    window.onOpenCvReady = function () {
                        if (window.cv && cv.onRuntimeInitialized) {
                            cv.onRuntimeInitialized = function () {
                                console.log("OpenCV.js prêt");
                                resolve(true);
                            };
                        } else {
                            console.log("OpenCV.js prêt");
                            resolve(true);
                        }
                    };

                    const script = document.createElement("script");
                    script.async = true;
                    script.src = "https://docs.opencv.org/4.x/opencv.js";
                    script.onload = function () { window.onOpenCvReady(); };
                    script.onerror = function () {
                        console.warn("OpenCV.js indisponible : capture en mode simple.");
                        resolve(false);
                    };
                    document.head.appendChild(script);
                });
            }

            Object.defineProperty(window, "OPENCV_READY", {
                configurable: true,
                get: function () {
                    if (!opencvPromise) opencvPromise = loadOpenCv();
                    return opencvPromise;
                }
            });
        })();

;/* ==== bloc script 2/40 (ordre du document preserve) ==== */

(function () {
            const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22";
            let visionModulePromise = null;
            let faceDetectorPromise = null;
            let faceLandmarkerPromise = null;

            function loadVisionModule() {
                if (!visionModulePromise) {
                    visionModulePromise = import(CDN);
                }
                return visionModulePromise;
            }

            function initFaceDetector() {
                return (async function () {
                    try {
                        const mod = await loadVisionModule();
                        const vision = await mod.FilesetResolver.forVisionTasks(CDN + "/wasm");

                        const detector = await mod.FaceDetector.createFromOptions(vision, {
                            baseOptions: {
                                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
                            },
                            runningMode: "VIDEO",
                            minDetectionConfidence: 0.60
                        });

                        window.mediaPipeFaceDetector = detector;
                        console.log("MediaPipe FaceDetector prêt");
                        return detector;
                    } catch (error) {
                        console.error("MediaPipe FaceDetector indisponible :", error);
                        return null;
                    }
                })();
            }

            function initFaceLandmarker() {
                return (async function () {
                    try {
                        const mod = await loadVisionModule();
                        const vision = await mod.FilesetResolver.forVisionTasks(CDN + "/wasm");

                        const landmarker = await mod.FaceLandmarker.createFromOptions(vision, {
                            baseOptions: {
                                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                                delegate: "GPU"
                            },
                            runningMode: "VIDEO",
                            numFaces: 1
                        });

                        window.mediaPipeFaceLandmarker = landmarker;
                        console.log("MediaPipe FaceLandmarker prêt");
                        return landmarker;
                    } catch (error) {
                        console.warn("MediaPipe FaceLandmarker indisponible, fallback FaceDetector/manual :", error);
                        return null;
                    }
                })();
            }

            Object.defineProperty(window, "MEDIAPIPE_FACE_READY", {
                configurable: true,
                get: function () {
                    if (!faceDetectorPromise) faceDetectorPromise = initFaceDetector();
                    return faceDetectorPromise;
                }
            });

            Object.defineProperty(window, "MEDIAPIPE_FACE_LANDMARKER_READY", {
                configurable: true,
                get: function () {
                    if (!faceLandmarkerPromise) faceLandmarkerPromise = initFaceLandmarker();
                    return faceLandmarkerPromise;
                }
            });

            window.detectFacesWithMediaPipe = async function (video) {
                const detector = await window.MEDIAPIPE_FACE_READY;
                if (!detector) {
                    return [];
                }

                const result = detector.detectForVideo(video, performance.now());
                return result && result.detections ? result.detections : [];
            };

            window.detectFaceLandmarksWithMediaPipe = async function (video) {
                const landmarker = await window.MEDIAPIPE_FACE_LANDMARKER_READY;
                if (!landmarker || !video || !video.videoWidth || !video.videoHeight) {
                    return [];
                }

                const result = landmarker.detectForVideo(video, performance.now());
                return result && result.faceLandmarks ? result.faceLandmarks : [];
            };
        })();

;/* ==== bloc script 3/40 (ordre du document preserve) ==== */

/* AFB_MOBILE_BURGER_NAV_V1 : ouverture/fermeture du menu mobile */
(function () {
    var btn = document.getElementById("navToggle");
    var nav = document.getElementById("clientNav");
    if (!btn || !nav) return;

    function setOpen(open) {
        nav.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }

    btn.addEventListener("click", function () {
        setOpen(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", function (event) {
        if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", function (event) {
        if (!nav.classList.contains("open")) return;
        if (event.target.closest(".topbar")) return;
        setOpen(false);
    });
})();

;/* ==== bloc script 4/40 (ordre du document preserve) ==== */

const API_BASE = "";

    let agencies = [];
    let nationalities = [];
    let countries = [];

    let agencySearchTimer = null;
    let nationalitySearchTimer = null;

    const PHONE_COUNTRY_CODES = [
        {country: "Cameroun", code: "+237"},
        {country: "Côte d’Ivoire", code: "+225"},
        {country: "Sénégal", code: "+221"},
        {country: "Sao Tomé", code: "+239"},
        {country: "France", code: "+33"},
        {country: "Belgique", code: "+32"},
        {country: "Canada", code: "+1"},
        {country: "États-Unis", code: "+1"},
        {country: "Royaume-Uni", code: "+44"},
        {country: "Allemagne", code: "+49"},
        {country: "Italie", code: "+39"},
        {country: "Espagne", code: "+34"},
        {country: "Suisse", code: "+41"},
        {country: "Gabon", code: "+241"},
        {country: "Congo", code: "+242"},
        {country: "RDC", code: "+243"},
        {country: "Tchad", code: "+235"},
        {country: "Centrafrique", code: "+236"},
        {country: "Guinée équatoriale", code: "+240"},
        {country: "Nigeria", code: "+234"},
        {country: "Bénin", code: "+229"},
        {country: "Togo", code: "+228"},
        {country: "Ghana", code: "+233"},
        {country: "Mali", code: "+223"},
        {country: "Burkina Faso", code: "+226"},
        {country: "Niger", code: "+227"},
        {country: "Maroc", code: "+212"},
        {country: "Algérie", code: "+213"},
        {country: "Tunisie", code: "+216"},
        {country: "Égypte", code: "+20"},
        {country: "Afrique du Sud", code: "+27"},
        {country: "Chine", code: "+86"},
        {country: "Inde", code: "+91"},
        {country: "Turquie", code: "+90"},
        {country: "Brésil", code: "+55"}
    ];

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function setFieldMessage(id, message, type = "") {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        element.className = `field-message ${type}`.trim();
        element.innerText = message || "";
    }

    function fillCountryCodeSelects() {
        document.querySelectorAll(".phone-country-select").forEach(select => {
            const defaultCode = select.dataset.default || "+237";
            select.innerHTML = PHONE_COUNTRY_CODES.map(item => {
                const selected = item.code === defaultCode && item.country === "Cameroun" ? "selected" : "";
                return `<option value="${item.code}" ${selected}>${item.country} ${item.code}</option>`;
            }).join("");
        });
    }

    function composePhoneNumber(codeId, localId, hiddenId) {
        const codeElement = document.getElementById(codeId);
        const localElement = document.getElementById(localId);
        const hiddenElement = document.getElementById(hiddenId);

        if (!codeElement || !localElement || !hiddenElement) {
            return "";
        }

        let localNumber = localElement.value.trim().replace(/\s+/g, " ");

        if (!localNumber) {
            hiddenElement.value = "";
            return "";
        }

        if (localNumber.startsWith("+")) {
            hiddenElement.value = localNumber;
            return hiddenElement.value;
        }

        localNumber = localNumber.replace(/^0+/, "");
        hiddenElement.value = `${codeElement.value} ${localNumber}`.trim();
        return hiddenElement.value;
    }

    function syncAllPhoneFields() {
        composePhoneNumber("phone_country", "phone_local", "phone");
        composePhoneNumber("contact1_country", "contact1_local", "contact_person_1_phone");
        composePhoneNumber("contact2_country", "contact2_local", "contact_person_2_phone");
    }

    function setupPhoneInputs() {
        [
            ["phone_country", "phone_local", "phone"],
            ["contact1_country", "contact1_local", "contact_person_1_phone"],
            ["contact2_country", "contact2_local", "contact_person_2_phone"]
        ].forEach(([codeId, localId, hiddenId]) => {
            const codeElement = document.getElementById(codeId);
            const localElement = document.getElementById(localId);

            if (!codeElement || !localElement) {
                return;
            }

            codeElement.addEventListener("change", () => composePhoneNumber(codeId, localId, hiddenId));
            localElement.addEventListener("input", () => composePhoneNumber(codeId, localId, hiddenId));
        });
    }

    async function fetchAgencyResults(query = "") {
        try {
            const url = query
                ? `/api/agencies/active?q=${encodeURIComponent(query)}`
                : "/api/agencies/active";

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("API agences indisponible");
            }

            agencies = await response.json();
            return agencies;
        } catch (error) {
            console.error("Erreur chargement agences :", error);
            setFieldMessage("agencyHelper", "Impossible de charger les agences. Vérifiez le serveur ou réessayez.", "error");
            return [];
        }
    }

    async function loadAgenciesForClient() {
        const results = await fetchAgencyResults("");
        renderAgencyOptions(results);
    }

    async function showAgencyDropdown() {
        const dropdown = document.getElementById("agencyDropdown");

        if (!dropdown) {
            return;
        }

        dropdown.style.display = "block";

        if (!agencies || agencies.length === 0) {
            const results = await fetchAgencyResults("");
            renderAgencyOptions(results);
            return;
        }

        renderAgencyOptions(agencies);
    }

    function filterAgencies() {
        const searchInput = document.getElementById("agencySearch");
        const hiddenInput = document.getElementById("preferred_branch");
        const query = searchInput.value.trim();

        hiddenInput.value = "";

        if (!query) {
            setFieldMessage("agencyHelper", "Tapez quelques lettres puis cliquez sur une agence proposée.");
            renderAgencyOptions(agencies);
            showAgencyDropdown();
            return;
        }

        setFieldMessage("agencyHelper", "Recherche automatique en cours...");

        const normalizedQuery = normalizeText(query);
        const localFiltered = agencies.filter(agency =>
            normalizeText(agency.name).includes(normalizedQuery) ||
            normalizeText(agency.code).includes(normalizedQuery) ||
            normalizeText(agency.city).includes(normalizedQuery)
        );

        renderAgencyOptions(localFiltered);
        showAgencyDropdown();

        clearTimeout(agencySearchTimer);
        agencySearchTimer = setTimeout(async () => {
            const results = await fetchAgencyResults(query);
            renderAgencyOptions(results);
        }, 200);
    }

    function renderAgencyOptions(items) {
        const dropdown = document.getElementById("agencyDropdown");

        if (!dropdown) {
            return;
        }

        dropdown.innerHTML = "";

        if (!items || items.length === 0) {
            dropdown.innerHTML = `<div class="agency-empty">Aucune agence trouvée. Vérifiez l’orthographe ou contactez la banque.</div>`;
            return;
        }

        items.forEach(agency => {
            const div = document.createElement("div");
            div.className = "agency-option";

            div.innerHTML = `
                <strong>${agency.name}</strong>
                <small>${agency.code}${agency.city ? " - " + agency.city : ""}</small>
            `;

            div.onclick = function () {
                document.getElementById("agencySearch").value = agency.name;
                document.getElementById("preferred_branch").value = agency.name;
                dropdown.style.display = "none";
                setFieldMessage("agencyHelper", "Agence sélectionnée.", "success");
            };

            dropdown.appendChild(div);
        });
    }

    async function fetchNationalityResults(query = "") {
        try {
            const url = query
                ? `/api/nationalities/active?q=${encodeURIComponent(query)}`
                : "/api/nationalities/active";

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("API nationalités indisponible");
            }

            nationalities = await response.json();
            return nationalities;
        } catch (error) {
            console.error("Erreur chargement nationalités :", error);
            setFieldMessage("nationalityHelper", "Impossible de charger les nationalités. Vérifiez le serveur ou réessayez.", "error");
            return [];
        }
    }

    async function loadNationalitiesForClient() {
        const results = await fetchNationalityResults("");
        renderNationalityOptions(results);
    }

    async function showNationalityDropdown() {
        const dropdown = document.getElementById("nationalityDropdown");

        if (!dropdown) {
            return;
        }

        dropdown.style.display = "block";

        if (!nationalities || nationalities.length === 0) {
            const results = await fetchNationalityResults("");
            renderNationalityOptions(results);
            return;
        }

        renderNationalityOptions(nationalities);
    }

    function filterNationalities() {
        const searchInput = document.getElementById("nationalitySearch");
        const hiddenInput = document.getElementById("nationality");
        const query = searchInput.value.trim();

        hiddenInput.value = "";

        if (!query) {
            setFieldMessage("nationalityHelper", "Tapez quelques lettres puis cliquez sur une nationalité proposée.");
            renderNationalityOptions(nationalities);
            showNationalityDropdown();
            return;
        }

        setFieldMessage("nationalityHelper", "Recherche automatique en cours...");

        const normalizedQuery = normalizeText(query);
        const localFiltered = nationalities.filter(nationality =>
            normalizeText(nationality.label).includes(normalizedQuery) ||
            normalizeText(nationality.code).includes(normalizedQuery)
        );

        renderNationalityOptions(localFiltered);
        showNationalityDropdown();

        clearTimeout(nationalitySearchTimer);
        nationalitySearchTimer = setTimeout(async () => {
            const results = await fetchNationalityResults(query);
            renderNationalityOptions(results);
        }, 200);
    }

    function renderNationalityOptions(items) {
        const dropdown = document.getElementById("nationalityDropdown");

        if (!dropdown) {
            return;
        }

        dropdown.innerHTML = "";

        if (!items || items.length === 0) {
            dropdown.innerHTML = `<div class="nationality-option">Aucune nationalité trouvée. Sélectionnez “Autre” si disponible ou contactez la banque.</div>`;
            return;
        }

        items.forEach(nationality => {
            const div = document.createElement("div");
            div.className = "nationality-option";

            div.innerHTML = `
                <strong>${nationality.label}</strong>
                <small>${nationality.code}</small>
            `;

            div.onclick = function () {
                document.getElementById("nationalitySearch").value = nationality.label;
                document.getElementById("nationality").value = nationality.label;
                dropdown.style.display = "none";
                setFieldMessage("nationalityHelper", "Nationalité sélectionnée.", "success");
            };

            dropdown.appendChild(div);
        });
    }

    document.addEventListener("click", function (event) {
        const agencyPicker = document.querySelector(".agency-picker");
        const agencyDropdown = document.getElementById("agencyDropdown");

        if (agencyPicker && agencyDropdown && !agencyPicker.contains(event.target)) {
            agencyDropdown.style.display = "none";
        }

        const nationalityPicker = document.querySelector(".nationality-picker");
        const nationalityDropdown = document.getElementById("nationalityDropdown");

        if (nationalityPicker && nationalityDropdown && !nationalityPicker.contains(event.target)) {
            nationalityDropdown.style.display = "none";
        }
    });

    fillCountryCodeSelects();
    setupPhoneInputs();
    loadAgenciesForClient();
    loadNationalitiesForClient();

    document.querySelectorAll(".section-header").forEach(header => {
        header.addEventListener("click", function () {
            const currentSection = this.parentElement;

            document.querySelectorAll(".section").forEach(section => {
                if (section !== currentSection) {
                    section.classList.remove("open");
                }
            });

            currentSection.classList.toggle("open");
        });
    });

    // AFB_FORM_STEPPER_V1 — stepper dynamique synchronisé avec les sections du formulaire
    (function initFormStepper() {
        const stepper = document.getElementById("formStepper");
        const sections = Array.from(document.querySelectorAll("#accountForm .section"));

        if (!stepper || !sections.length) return;

        const stepperLang = (localStorage.getItem("diaspora_client_lang") === "en") ? "en" : "fr";
        const shortLabels = {
            "0": {fr: "Documents à fournir", en: "Required documents"},
            "1": {fr: "Identité", en: "Identity"},
            "2": {fr: "Parents / tuteurs", en: "Parents / guardians"},
            "3": {fr: "Coordonnées", en: "Contact details"},
            "4": {fr: "Pièce & activité", en: "ID & activity"},
            "5": {fr: "Votre compte", en: "Your account"},
            "6": {fr: "Documents", en: "Documents"},
            "7": {fr: "Consentement", en: "Consent"}
        };

        function stepLabel(number) {
            const entry = shortLabels[number];
            if (!entry) return (stepperLang === "en" ? "Step " : "Étape ") + number;
            return entry[stepperLang];
        }

        stepper.innerHTML = "";

        const preDone = localStorage.getItem("diaspora_step0_whatsapp_otp_verified") === "true";
        const preItem = document.createElement("button");
        preItem.type = "button";
        preItem.className = "step-item" + (preDone ? " is-done" : "");
        preItem.title = stepperLang === "en"
            ? "Required documents (WhatsApp verification and document capture)"
            : "Documents à fournir (vérification WhatsApp et capture des documents)";
        preItem.innerHTML = '<div class="step' + (preDone ? ' done' : '') + '">' + (preDone ? "✓" : "0") + '</div><div class="step-label">' + stepLabel("0") + '</div>';
        stepper.appendChild(preItem);

        sections.forEach(function (section, index) {
            const line = document.createElement("div");
            line.className = "line";
            stepper.appendChild(line);

            const numEl = section.querySelector(".section-number");
            const number = numEl ? numEl.textContent.trim() : String(index + 1);
            const label = stepLabel(number);

            const item = document.createElement("button");
            item.type = "button";
            item.className = "step-item";
            item.title = label;
            item.innerHTML = '<div class="step">' + number + '</div><div class="step-label">' + label + '</div>';

            item.addEventListener("click", function () {
                sections.forEach(function (other) { other.classList.remove("open"); });
                section.classList.add("open");
                requestAnimationFrame(function () {
                    section.scrollIntoView({behavior: "smooth", block: "start"});
                });
            });

            stepper.appendChild(item);
        });

        function syncStepper() {
            const openIndex = sections.findIndex(function (s) { return s.classList.contains("open"); });
            const items = stepper.querySelectorAll(".step-item");

            items.forEach(function (item, i) {
                if (i === 0) return; // pastille pré-inscription gérée à part

                const sectionIndex = i - 1;
                const circle = item.querySelector(".step");
                const isActive = sectionIndex === openIndex;
                const isDone = openIndex >= 0 && sectionIndex < openIndex;

                item.classList.toggle("is-active", isActive);
                item.classList.toggle("is-done", isDone);
                circle.classList.toggle("active", isActive);
                circle.classList.toggle("done", isDone && !isActive);

                if (isActive) {
                    item.setAttribute("aria-current", "step");
                    // Centre la pastille active en ne faisant défiler QUE le stepper
                    // horizontal : item.scrollIntoView ferait aussi défiler la page
                    // vers le haut et annulerait le scroll vers la section ouverte.
                    if (stepper.scrollWidth > stepper.clientWidth) {
                        const left = item.offsetLeft - (stepper.clientWidth - item.offsetWidth) / 2;
                        stepper.scrollTo({left: Math.max(0, left), behavior: "smooth"});
                    }
                } else {
                    item.removeAttribute("aria-current");
                }
            });
        }

        const stepperObserver = new MutationObserver(syncStepper);
        sections.forEach(function (section) {
            stepperObserver.observe(section, {attributes: true, attributeFilter: ["class"]});
        });

        syncStepper();
    })();

    // AFB_SECTION_WIZARD_NAV_V1 — navigation Précédent / Étape suivante en bas de chaque section
    (function initSectionWizardNav() {
        const sections = Array.from(document.querySelectorAll("#accountForm .section"));
        if (sections.length < 2) return;

        const isEn = localStorage.getItem("diaspora_client_lang") === "en";

        function openSection(index) {
            sections.forEach(function (s, i) { s.classList.toggle("open", i === index); });
            // Attend le repli/dépli des sections (reflow) avant de défiler,
            // sinon la position calculée de la cible est déjà périmée.
            requestAnimationFrame(function () {
                sections[index].scrollIntoView({behavior: "smooth", block: "start"});
            });
        }

        sections.forEach(function (section, index) {
            const body = section.querySelector(".section-body");
            if (!body || body.querySelector(".section-nav")) return;

            const nav = document.createElement("div");
            nav.className = "section-nav";

            if (index > 0) {
                const prev = document.createElement("button");
                prev.type = "button";
                prev.className = "section-nav-prev";
                prev.textContent = isEn ? "← Previous" : "← Précédent";
                prev.addEventListener("click", function () { openSection(index - 1); });
                nav.appendChild(prev);
            }

            if (index < sections.length - 1) {
                const next = document.createElement("button");
                next.type = "button";
                next.className = "section-nav-next";
                next.textContent = isEn ? "Next step →" : "Étape suivante →";
                next.addEventListener("click", function () { openSection(index + 1); });
                nav.appendChild(next);
            }

            if (nav.children.length) body.appendChild(nav);
        });
    })();

    // AFB_FORM_DRAFT_V1 — brouillon local de la saisie client, purgé à l'envoi du formulaire
    (function initFormDraft() {
        const DRAFT_KEY = "diaspora_form_draft_v1";
        const form = document.getElementById("accountForm");
        if (!form) return;

        let draftSaveTimer = null;

        function collectDraft() {
            const fields = {};
            form.querySelectorAll("input, select, textarea").forEach(function (field) {
                const key = field.name || field.id;
                if (!key || field.type === "file" || field.type === "password") return;

                if (field.type === "checkbox" || field.type === "radio") {
                    fields[key + "::" + field.value] = field.checked;
                } else {
                    fields[key] = field.value;
                }
            });
            return fields;
        }

        function saveDraft() {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({
                    saved_at: new Date().toISOString(),
                    fields: collectDraft()
                }));
            } catch (err) { /* stockage local indisponible ou plein */ }
        }

        function scheduleDraftSave() {
            if (draftSaveTimer) clearTimeout(draftSaveTimer);
            draftSaveTimer = setTimeout(saveDraft, 800);
        }

        function restoreDraft() {
            let raw = null;
            try { raw = localStorage.getItem(DRAFT_KEY); } catch (err) { return; }
            if (!raw) return;

            let draft = null;
            try { draft = JSON.parse(raw); } catch (err) { return; }
            const fields = draft && draft.fields;
            if (!fields) return;

            let restoredCount = 0;

            form.querySelectorAll("input, select, textarea").forEach(function (field) {
                const key = field.name || field.id;
                if (!key || field.type === "file" || field.type === "password") return;

                if (field.type === "checkbox" || field.type === "radio") {
                    const stored = fields[key + "::" + field.value];
                    if (typeof stored === "boolean" && field.checked !== stored) {
                        field.checked = stored;
                        restoredCount += 1;
                    }
                    return;
                }

                const stored = fields[key];
                if (typeof stored !== "string" || stored === "") return;

                if ((field.tagName === "SELECT" || !field.value) && field.value !== stored) {
                    field.value = stored;
                    restoredCount += 1;
                }
            });

            if (restoredCount > 0) {
                showDraftNotice(draft.saved_at);
            }
        }

        function showDraftNotice(savedAt) {
            const isEn = localStorage.getItem("diaspora_client_lang") === "en";
            let savedLabel = "";

            try {
                if (savedAt) {
                    savedLabel = new Date(savedAt).toLocaleString(isEn ? "en-GB" : "fr-FR");
                }
            } catch (err) { /* date invalide : on affiche sans horodatage */ }

            const notice = document.createElement("div");
            notice.id = "draftRestoreNotice";
            notice.style.cssText = "background:#FFF7E0;border:1px solid #F0C36D;border-radius:10px;padding:12px 16px;margin:0 0 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:14px;";

            const message = document.createElement("span");
            message.textContent = isEn
                ? ("We restored your previous answers" + (savedLabel ? " (saved on " + savedLabel + ")" : "") + ". Your input is saved automatically on this device.")
                : ("Nous avons repris votre saisie précédente" + (savedLabel ? " (enregistrée le " + savedLabel + ")" : "") + ". Vos réponses sont sauvegardées automatiquement sur cet appareil.");

            const resetBtn = document.createElement("button");
            resetBtn.type = "button";
            resetBtn.textContent = isEn ? "Start over" : "Recommencer à zéro";
            resetBtn.style.cssText = "background:none;border:1px solid #B45309;color:#B45309;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:bold;";
            resetBtn.addEventListener("click", function () {
                try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}
                form.reset();
                notice.remove();
            });

            notice.appendChild(message);
            notice.appendChild(resetBtn);
            form.parentElement.insertBefore(notice, form);
        }

        window.clearClientFormDraft = function () {
            try {
                localStorage.removeItem(DRAFT_KEY);

                const toRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.indexOf("diaspora_step0_") === 0 || key.indexOf("diaspora_pre_onboarding_") === 0)) {
                        toRemove.push(key);
                    }
                }
                toRemove.forEach(function (key) { localStorage.removeItem(key); });
            } catch (err) { /* stockage local indisponible */ }
        };

        form.addEventListener("input", scheduleDraftSave);
        form.addEventListener("change", scheduleDraftSave);

        restoreDraft();
    })();

    // AFB_STEP0_HANDOFF_BANNER_V1 — confirme la reprise des données de pré-inscription
    (function showStep0HandoffBanner() {
        // AFB_CLIENT_VIEW_CLEAN_V1 : bannière désactivée pour épurer la vue client.
        return;

        const form = document.getElementById("accountForm");
        if (!form || document.getElementById("step0HandoffBanner")) return;

        let payload = null;
        try {
            payload = JSON.parse(localStorage.getItem("diaspora_step0_payload") || "null");
        } catch (err) { return; }
        if (!payload || (!payload.email && !payload.whatsapp_phone_full)) return;

        const isEn = localStorage.getItem("diaspora_client_lang") === "en";
        const parts = [];

        if (payload.email) parts.push(payload.email);
        if (payload.whatsapp_phone_full) {
            parts.push(payload.whatsapp_phone_full + (payload.whatsapp_otp_verified ? (isEn ? " (WhatsApp verified ✓)" : " (WhatsApp vérifié ✓)") : ""));
        }
        if (payload.residence) parts.push(payload.residence);

        const banner = document.createElement("div");
        banner.id = "step0HandoffBanner";
        banner.style.cssText = "background:#E8F7EE;border:1px solid #86D3A5;border-radius:10px;padding:12px 16px;margin:0 0 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:14px;color:#14532D;";

        const message = document.createElement("span");
        message.textContent = (isEn
            ? "Your pre-registration details were carried over: "
            : "Vos informations de pré-inscription ont bien été reprises : ") + parts.join(" · ");

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", isEn ? "Close" : "Fermer");
        closeBtn.textContent = "✕";
        closeBtn.style.cssText = "background:none;border:none;color:#14532D;cursor:pointer;font-size:16px;font-weight:bold;";
        closeBtn.addEventListener("click", function () { banner.remove(); });

        banner.appendChild(message);
        banner.appendChild(closeBtn);
        form.parentElement.insertBefore(banner, form);
    })();

    function updateIdentityLabels() {
        const sex = document.getElementById("sex") ? document.getElementById("sex").value : "";
        const maritalStatus = document.getElementById("marital_status") ? document.getElementById("marital_status").value : "";

        const lastNameLabel = document.getElementById("lastNameLabel");
        const lastNameHint = document.getElementById("lastNameHint");
        const birthNameLabel = document.getElementById("birthNameLabel");

        if (!lastNameLabel || !lastNameHint || !birthNameLabel) {
            return;
        }

        if (sex === "Féminin" && maritalStatus === "Marié(e)") {
            lastNameLabel.innerHTML = 'Nom d’épouse / Nom d’usage <span class="required">*</span>';
            lastNameHint.innerText = "Pour une femme mariée, le nom d’épouse est renseigné en priorité s’il figure dans les documents.";
            birthNameLabel.innerText = "Nom de jeune fille / Nom de naissance";
        } else {
            lastNameLabel.innerHTML = 'Nom d’usage / Nom de famille <span class="required">*</span>';
            lastNameHint.innerText = "Renseignez votre nom tel qu’il figure sur votre pièce d’identité.";
            birthNameLabel.innerText = "Nom de naissance";
        }
    }

    function toggleOtherField(selectId, boxId) {
        const select = document.getElementById(selectId);
        const box = document.getElementById(boxId);

        if (!select || !box) {
            return;
        }

        if (select.value === "Autres") {
            box.style.display = "block";
        } else {
            box.style.display = "none";

            const input = box.querySelector("input");
            if (input) {
                input.value = "";
            }
        }
    }

    function toggleNonResidentDocuments() {
        const status = document.getElementById("residency_status") ? document.getElementById("residency_status").value : "";
        const box = document.getElementById("nonResidentDocuments");


        if (!box) {
            return;
        }

        box.style.display = status === "NON_RESIDENT" ? "block" : "none";
    }

    function getFormValue(form, name) {
        return form.elements[name] ? form.elements[name].value : "";
    }

    function getFormValue(form, name) {
        return form.elements[name] ? form.elements[name].value : "";
    }

    function selectPackage(card, packageName) {
        document.querySelectorAll(".package-card").forEach(item => {
            item.classList.remove("selected");
        });

        card.classList.add("selected");
        document.querySelector("input[name='selected_package_ui']").value = packageName;
    }

    function combineNames(lastName, firstName) {
        return `${lastName || ""} ${firstName || ""}`.trim();
    }

    async function uploadPhoto(applicationId, documentType, fileInputId) {
        const input = document.getElementById(fileInputId);

        if (!input.files || input.files.length === 0) {
            return null;
        }

        const formData = new FormData();
        formData.append("file", input.files[0]);

        const response = await fetch(
            `${API_BASE}/api/applications/${applicationId}/documents?document_type=${documentType}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur upload ${documentType} : ${errorText}`);
        }

        return await response.json();
    }

    // AFB_SUBMIT_HARDENING_V1 — verrou anti double-soumission + reprise des uploads
    let isSubmitting = false;

    function setSubmitButtonBusy(busy) {
        const submitBtn = document.querySelector(".submit-btn");
        if (!submitBtn) return;

        if (busy) {
            if (!submitBtn.dataset.originalLabel) {
                submitBtn.dataset.originalLabel = submitBtn.textContent;
            }
            submitBtn.disabled = true;
            submitBtn.textContent = "Envoi en cours... Merci de patienter.";
        } else {
            submitBtn.disabled = false;
            if (submitBtn.dataset.originalLabel) {
                submitBtn.textContent = submitBtn.dataset.originalLabel;
            }
        }
    }

    const DOCUMENT_UPLOAD_STEPS = [
        {key: "identity", label: "Pièce d’identité", run: function (id) { return uploadIdentityDocuments(id); }},
        {key: "extra", label: "Documents complémentaires", run: function (id) { return uploadManagerExtraDocuments(id); }},
        {key: "address", label: "Justificatif de domicile", run: function (id) { return uploadPhoto(id, "PROOF_OF_ADDRESS_PHOTO", "address_photo"); }},
        {key: "selfie", label: "Selfie", run: function (id) { return uploadSelfieDocument(id); }},
        {key: "birth", label: "Acte de naissance", run: function (id) { return uploadPhoto(id, "BIRTH_CERTIFICATE_PHOTO", "birth_certificate_photo"); }},
        {key: "employment", label: "Attestation d’emploi / scolarité", run: function (id) { return uploadPhoto(id, "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO", "employment_school_photo"); }},
        {key: "tax", label: "Attestation de conformité fiscale", run: function (id) { return uploadPhoto(id, "TAX_COMPLIANCE_CERTIFICATE_PHOTO", "tax_compliance_photo"); }}
    ];

    async function runDocumentUploads(applicationId, steps) {
        const failedSteps = [];

        for (const step of steps) {
            try {
                await step.run(applicationId);
            } catch (err) {
                console.error("Échec upload " + step.key + " :", err);
                failedSteps.push(step);
            }
        }

        return failedSteps;
    }

    function showUploadRetry(application, failedSteps) {
        const resultBox = document.getElementById("result");
        resultBox.style.display = "block";
        resultBox.className = "result error";
        resultBox.innerHTML = "";

        const message = document.createElement("p");
        message.style.margin = "0 0 10px";
        message.textContent =
            "Votre dossier " + application.reference + " a bien été créé, mais certains documents n’ont pas pu être envoyés : " +
            failedSteps.map(function (s) { return s.label; }).join(", ") +
            ". Vérifiez votre connexion puis réessayez — seuls les documents manquants seront renvoyés.";

        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.textContent = "Réessayer l’envoi des documents manquants";
        retryBtn.style.cssText = "background:var(--red);color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-weight:bold;";
        retryBtn.addEventListener("click", async function () {
            retryBtn.disabled = true;
            retryBtn.textContent = "Nouvel envoi en cours...";

            const stillFailed = await runDocumentUploads(application.id, failedSteps);

            if (stillFailed.length > 0) {
                showUploadRetry(application, stillFailed);
            } else {
                await completeSubmission(application);
            }
        });

        resultBox.appendChild(message);
        resultBox.appendChild(retryBtn);
    }

    document.getElementById("accountForm").addEventListener("submit", async function (event) {
    event.preventDefault();

        const form = event.target;

        if (isSubmitting) {
            return;
        }

        if (!validateRequiredFields(form)) {
            return;
        }

        isSubmitting = true;
        setSubmitButtonBusy(true);

        const resultBox = document.getElementById("result");
        const successPanel = document.getElementById("successPanel");

        if (successPanel) {
            successPanel.style.display = "none";
        }

        resultBox.style.display = "block";
        resultBox.className = "result loading";
        resultBox.innerHTML = "Soumission de la demande en cours...";

        try {
            // form déjà défini plus haut : const form = event.target;
            syncAllPhoneFields();

            const fatherName = combineNames(
                getFormValue(form, "father_last_name_ui"),
                getFormValue(form, "father_first_name_ui")
            );

            const motherName = combineNames(
                getFormValue(form, "mother_last_name_ui"),
                getFormValue(form, "mother_first_name_ui")
            );

            const contact1Name = combineNames(
                getFormValue(form, "contact_1_last_name_ui"),
                getFormValue(form, "contact_1_first_name_ui")
            );

            const contact2Name = combineNames(
                getFormValue(form, "contact_2_last_name_ui"),
                getFormValue(form, "contact_2_first_name_ui")
            );

            const accountPurposeDetails = `
Nom de naissance : ${getFormValue(form, "birth_name_ui")}
NIU : ${getFormValue(form, "niu_ui")}
Type de pièce : ${getFormValue(form, "document_type_ui")}
Profession : ${getFormValue(form, "profession_ui")}
Tranche de revenus : ${getFormValue(form, "income_range_ui")}
Devise : ${getFormValue(form, "currency_ui")}
Code de parrainage : ${getFormValue(form, "referral_code_ui")}
Package : ${getFormValue(form, "selected_package_ui")}
            `.trim();

            if (!getFormValue(form, "phone")) {
                throw new Error("Veuillez renseigner votre numéro Téléphone / WhatsApp avec l’indicatif du pays.");
            }

            if (!getFormValue(form, "nationality")) {
                const typedNationality = document.getElementById("nationalitySearch").value.trim();
                if (typedNationality) {
                    throw new Error("Veuillez choisir une nationalité dans les propositions affichées, au lieu de seulement la saisir au clavier.");
                }
                throw new Error("Veuillez rechercher puis sélectionner une nationalité dans la liste.");
            }

            if (!getFormValue(form, "preferred_branch")) {
                const typedAgency = document.getElementById("agencySearch").value.trim();
                if (typedAgency) {
                    throw new Error("Veuillez choisir une agence dans les propositions affichées, au lieu de seulement la saisir au clavier.");
                }
                throw new Error("Veuillez rechercher puis sélectionner une agence dans la liste.");
            }

            syncPhoneFields();

            if (!getFormValue(form, "phone")) {
                throw new Error("Veuillez renseigner votre numéro WhatsApp avec l’indicatif du pays.");
            }

            const payload = {
                last_name: getFormValue(form, "last_name"),
                first_name: getFormValue(form, "first_name"),
                birth_date: getFormValue(form, "birth_date") || null,
                birth_place: getFormValue(form, "birth_place"),
                birth_department: getFormValue(form, "birth_department"),
                birth_name: getFormValue(form, "birth_name") || null,

                residency_status: getFormValue(form, "residency_status") || "RESIDENT",

                address_location: getFormValue(form, "address_location"),
                postal_box: getFormValue(form, "postal_box"),
                phone: getFormValue(form, "phone"),
                email: getFormValue(form, "email"),

                contact_person_1_name: contact1Name,
                contact_person_1_phone: getFormValue(form, "contact_person_1_phone"),
                contact_person_2_name: contact2Name,
                contact_person_2_phone: getFormValue(form, "contact_person_2_phone"),

                father_name: fatherName,
                mother_name: motherName,

                nationality: getFormValue(form, "nationality"),
                residence: getFormValue(form, "residence"),

                sex: getFormValue(form, "sex"),
                marital_status: getFormValue(form, "marital_status"),
                matrimonial_regime: getFormValue(form, "matrimonial_regime"),

                identity_document_number: getFormValue(form, "identity_document_number"),
                identity_document_issue_date: getFormValue(form, "identity_document_issue_date") || null,
                identity_document_issue_place: getFormValue(form, "identity_document_issue_place"),

                account_object: getFormValue(form, "account_object") || null,
                account_object_other: getFormValue(form, "account_object_other") || null,

                funds_origin: getFormValue(form, "funds_origin") || null,
                funds_origin_other: getFormValue(form, "funds_origin_other") || null,

                account_type: getFormValue(form, "account_type"),
                preferred_branch: getFormValue(form, "preferred_branch"),
                account_purpose: accountPurposeDetails,

                is_pep: false,
                pep_details: null
            };

            const createResponse = await fetch(`${API_BASE}/api/applications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!createResponse.ok) {
                console.error("Erreur création dossier :", createResponse.status, await createResponse.text());
                throw new Error(
                    "Le serveur n’a pas pu enregistrer votre dossier. Veuillez réessayer dans quelques instants. " +
                    "(code " + createResponse.status + ")"
                );
            }

            const application = await createResponse.json();

            resultBox.innerHTML = "Dossier créé. Envoi et authentification des documents en cours...";

            const failedSteps = await runDocumentUploads(application.id, DOCUMENT_UPLOAD_STEPS);

            if (failedSteps.length > 0) {
                showUploadRetry(application, failedSteps);
                return;
            }

            await completeSubmission(application);

        } catch (error) {
            resultBox.className = "result error";
            resultBox.innerHTML = "Erreur : " + error.message;
            isSubmitting = false;
            setSubmitButtonBusy(false);
        }
    });

    async function completeSubmission(application) {
        const form = document.getElementById("accountForm");
        const resultBox = document.getElementById("result");

        resultBox.style.display = "block";
        resultBox.className = "result loading";
        resultBox.innerHTML = "Documents envoyés. Vérifications de conformité en cours...";

        try {
            await fetch(`${API_BASE}/api/applications/${application.id}/screen-blackmodule`, {
                method: "POST"
            });
        } catch (err) {
            console.error("Vérification de conformité indisponible :", err);
        }

        resultBox.style.display = "none";
        resultBox.className = "result";

        showSubmissionSuccess(application.reference, getFormValue(form, "email"));

        if (typeof window.clearClientFormDraft === "function") {
            window.clearClientFormDraft();
        }

        form.reset();

        document.getElementById("preferred_branch").value = "";
        document.getElementById("agencySearch").value = "";

        document.getElementById("nationality").value = "";
        document.getElementById("nationalitySearch").value = "";

        setFieldMessage("agencyHelper", "Tapez quelques lettres puis cliquez sur une agence proposée.");
        setFieldMessage("nationalityHelper", "Tapez quelques lettres puis cliquez sur une nationalité proposée.");
        syncAllPhoneFields();

        document.querySelectorAll(".package-card").forEach(item => {
            item.classList.remove("selected");
        });

        const defaultPackageCard = document.querySelector(".package-card");
        if (defaultPackageCard) {
            defaultPackageCard.classList.add("selected");
        }

        document.querySelector("input[name='selected_package_ui']").value = "Package Budget";

        isSubmitting = false;
        setSubmitButtonBusy(false);
    }

    function showSubmissionSuccess(reference, email) {
        const successPanel = document.getElementById("successPanel");
        const successReference = document.getElementById("successReference");
        const trackRequestLink = document.getElementById("trackRequestLink");

        successReference.innerText = reference;

        let trackingUrl = `/client/status`;

        if (reference) {
            trackingUrl += `?reference=${encodeURIComponent(reference)}`;

            if (email) {
                trackingUrl += `&email=${encodeURIComponent(email)}`;
            }
        }

        trackRequestLink.href = trackingUrl;

        successPanel.style.display = "block";

        successPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function startNewApplication() {
        window.location.href = "/";
    }


    async function loadCountriesForClient() {
        try {
            const response = await fetch("/api/countries/active");

            if (!response.ok) {
                console.error("Impossible de charger les pays. Statut :", response.status);
                return;
            }

            countries = await response.json();

            console.log("Pays chargés :", countries.length, countries);

            populateCountrySelect("phone_country", "CM");
            populateCountrySelect("contact1_country", "CM");
            populateCountrySelect("contact2_country", "CM");

            // Reprend le numéro WhatsApp saisi en pré-inscription (step0).
            prefillWhatsappFromStep0();

            // Rend les listes d'indicatifs pays cherchables (le <select> natif
            // n'est pas filtrable).
            ["phone_country", "contact1_country", "contact2_country"].forEach(function (id) {
                const s = document.getElementById(id);
                if (s) enhanceSearchableCountrySelect(s);
            });

        } catch (error) {
            console.error("Erreur chargement pays :", error);
        }
    }

    function normalizeCountryText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .trim();
    }

    // Transforme un <select> d'indicatifs en liste cherchable, tout en gardant le
    // <select> natif comme source de vérité : aucun autre code n'est à modifier,
    // `select.value` continue de fonctionner exactement comme avant.
    function enhanceSearchableCountrySelect(select) {
        if (!select || select.dataset.searchableEnhanced === "1") return;
        select.dataset.searchableEnhanced = "1";

        // AFB_PHONE_COUNTRY_SINGLE_SEARCH_V1 : si l'ancien filtre superposé
        // (country-code-search-box) a déjà été injecté dans ce bloc téléphone,
        // le retirer — ce combo assure seul la recherche de pays.
        const phoneGroup = select.closest(".phone-group");
        if (phoneGroup) {
            phoneGroup.querySelectorAll(".country-code-search-box").forEach(function (node) {
                node.remove();
            });
        }

        const options = Array.from(select.options).map(function (opt) {
            return {
                value: opt.value,
                text: opt.textContent,
                norm: normalizeCountryText(opt.textContent + " " + opt.value)
            };
        });

        const wrapper = document.createElement("div");
        wrapper.className = "searchable-country";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "searchable-country-input";
        input.setAttribute("autocomplete", "off");
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-expanded", "false");
        input.placeholder = "Rechercher un pays…";

        const dropdown = document.createElement("div");
        dropdown.className = "searchable-country-dropdown";
        dropdown.style.display = "none";

        // Le wrapper prend la place du <select> dans la grille, puis on y déplace
        // le <select> (masqué) pour qu'il reste la source de vérité.
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(input);
        wrapper.appendChild(select);
        wrapper.appendChild(dropdown);
        select.classList.add("searchable-country-native");

        let activeIndex = -1;

        function selectedText() {
            const opt = select.options[select.selectedIndex];
            return opt ? opt.textContent : "";
        }

        function syncInputToSelection() {
            input.value = selectedText();
        }

        function renderList(filter) {
            const norm = normalizeCountryText(filter);
            dropdown.innerHTML = "";
            activeIndex = -1;

            const matches = options.filter(function (o) {
                return !norm || o.norm.includes(norm);
            });

            if (!matches.length) {
                const empty = document.createElement("div");
                empty.className = "searchable-country-empty";
                empty.textContent = "Aucun pays trouvé.";
                dropdown.appendChild(empty);
                return;
            }

            matches.forEach(function (o) {
                const item = document.createElement("div");
                item.className = "searchable-country-option";
                if (o.value === select.value) item.classList.add("is-selected");
                item.textContent = o.text;
                item.dataset.value = o.value;
                item.addEventListener("mousedown", function (e) {
                    e.preventDefault(); // empêche le blur de fermer avant le clic
                    choose(o.value);
                });
                dropdown.appendChild(item);
            });
        }

        function open() {
            renderList("");
            dropdown.style.display = "block";
            input.setAttribute("aria-expanded", "true");
        }

        function close() {
            dropdown.style.display = "none";
            input.setAttribute("aria-expanded", "false");
            syncInputToSelection();
        }

        function choose(value) {
            select.value = value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            syncInputToSelection();
            close();
        }

        input.addEventListener("focus", function () { open(); input.select(); });
        input.addEventListener("click", function () {
            if (dropdown.style.display === "none") open();
        });
        input.addEventListener("input", function () {
            dropdown.style.display = "block";
            renderList(input.value);
        });
        input.addEventListener("keydown", function (e) {
            const items = Array.from(dropdown.querySelectorAll(".searchable-country-option"));
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (dropdown.style.display === "none") open();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
            } else if (e.key === "Enter") {
                if (dropdown.style.display !== "none") {
                    e.preventDefault();
                    const target = items[activeIndex] || items[0];
                    if (target) choose(target.dataset.value);
                }
                return;
            } else if (e.key === "Escape") {
                close();
                return;
            } else {
                return;
            }
            items.forEach(function (it, i) { it.classList.toggle("is-active", i === activeIndex); });
            if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: "nearest" });
        });

        // Fermeture au clic en dehors du widget.
        document.addEventListener("click", function (e) {
            if (!wrapper.contains(e.target)) close();
        });

        // Rafraîchit l'affichage quand le select change par programmation
        // (préremplissage step0, restauration de brouillon, etc.).
        select.addEventListener("change", syncInputToSelection);

        syncInputToSelection();
    }

    // Préremplit l'indicatif + le numéro WhatsApp à partir des données de
    // pré-inscription (localStorage step0). Le numéro complet est stocké sous
    // la forme "+<indicatif><local>" (ex. "+237653935666") ; on le découpe en
    // cherchant l'indicatif pays le plus long qui préfixe le numéro.
    function prefillWhatsappFromStep0() {
        const select = document.getElementById("phone_country");
        const localInput = document.getElementById("phone_local");
        if (!select || !localInput || !countries || !countries.length) return;

        // Ne jamais écraser une saisie existante (OCR, brouillon, utilisateur).
        if (cleanPhoneNumber(localInput.value)) return;

        let full = (
            localStorage.getItem("diaspora_step0_whatsapp_full") ||
            localStorage.getItem("diaspora_step0_whatsapp_otp_phone") ||
            ""
        ).trim();
        if (!full) return;

        const digits = full.replace(/\D/g, "");
        if (!digits) return;

        let best = null;
        countries.forEach(function (country) {
            const cc = String(country.calling_code || "").replace(/\D/g, "");
            if (cc && digits.startsWith(cc)) {
                if (!best || cc.length > best.ccLen) {
                    best = { country: country, ccLen: cc.length };
                }
            }
        });

        if (best) {
            select.value = best.country.calling_code;
            localInput.value = digits.slice(best.ccLen);
        } else {
            // Aucun indicatif reconnu : on met le numéro complet dans le champ.
            localInput.value = full.startsWith("+") ? full : ("+" + digits);
        }

        syncPhoneFields();
    }

    function populateCountrySelect(selectId, defaultIsoCode) {
        const select = document.getElementById(selectId);

        if (!select) {
            console.error("Champ indicatif introuvable :", selectId);
            return;
        }

        select.innerHTML = "";

        if (!countries || countries.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Aucun pays disponible";
            select.appendChild(option);
            return;
        }

        countries.forEach(country => {
            const option = document.createElement("option");

            option.value = country.calling_code;
            option.dataset.isoCode = country.iso_code;
            option.textContent = `${country.flag || ""} ${country.name_fr} (${country.calling_code})`;

            if (country.iso_code === defaultIsoCode) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    }

    function cleanPhoneNumber(value) {
        return (value || "").replace(/\s+/g, " ").trim();
    }

    function buildPhoneNumber(selectId, inputId) {
        const select = document.getElementById(selectId);
        const input = document.getElementById(inputId);

        if (!select || !input) {
            return "";
        }

        const callingCode = select.value;
        const localNumber = cleanPhoneNumber(input.value);

        if (!localNumber) {
            return "";
        }

        if (localNumber.startsWith("+")) {
            return localNumber;
        }

        return `${callingCode} ${localNumber}`;
    }

    function syncPhoneFields() {
        document.getElementById("phone").value = buildPhoneNumber("phone_country", "phone_local");
        document.getElementById("contact_person_1_phone").value = buildPhoneNumber("contact1_country", "contact1_local");
        document.getElementById("contact_person_2_phone").value = buildPhoneNumber("contact2_country", "contact2_local");
    }

    document.addEventListener("DOMContentLoaded", function () {
        loadCountriesForClient();
    });


    let identityDocumentFiles = {
        recto: null,
        verso: null,
        imported: null
    };

    let cameraStream = null;
    let currentDocumentSide = "recto";

    function getSelectedDocumentType() {
        const form = document.getElementById("accountForm");
        return form && form.elements["document_type_ui"]
            ? form.elements["document_type_ui"].value
            : "";
    }

    function documentNeedsBackSide() {
        const type = getSelectedDocumentType();

        return [
            "Carte nationale d'identité",
            "Carte consulaire",
            "Titre de séjour"
        ].includes(type);
    }

    function openIdentityImport() {
        document.getElementById("identity_import").click();
    }

    function handleIdentityImport(event) {
        const files = Array.from(event.target.files || []);

        if (files.length === 0) {
            return;
        }

        identityDocumentFiles = {
            recto: null,
            verso: null,
            imported: null
        };

        const firstFile = files[0];

        if (firstFile.type === "application/pdf") {
            identityDocumentFiles.imported = firstFile;
        } else {
            identityDocumentFiles.recto = firstFile;

            if (files.length > 1) {
                identityDocumentFiles.verso = files[1];
            }
        }

        updateIdentityCaptureStatus();
    }


    let documentSmartInterval = null;
    let documentGoodFrameCount = 0;
    let documentPreviousFrameSignature = null;
    let lastDocumentCheck = null;

    let selfieSmartInterval = null;
    let selfieGoodFrameCount = 0;
    let selfiePreviousFrameSignature = null;
    let browserFaceDetector = null;

    if ("FaceDetector" in window) {
        try {
            browserFaceDetector = new FaceDetector({fastMode: true, maxDetectedFaces: 1});
        } catch (error) {
            browserFaceDetector = null;
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function setProgress(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = Math.round(clamp(value || 0, 0, 100));
        }
    }

    function setSmartMessage(id, message, state = "") {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        element.className = `smart-message ${state}`.trim();
        element.innerText = message;
    }

    function getDocumentCaptureProfile() {
        const type = getSelectedDocumentType();

        if (type === "Passeport") {
            return {
                key: "passport",
                label: "Passeport",
                frameClass: "passport-frame",
                aspectRatio: 1.42,
                widthRatio: 0.72,
                instruction: "Ouvrez le passeport sur la page d’identité et placez-la entièrement dans le cadre."
            };
        }

        if (type === "Titre de séjour") {
            return {
                key: "residence",
                label: "Titre de séjour",
                frameClass: "residence-frame",
                aspectRatio: 1.586,
                widthRatio: 0.82,
                instruction: "Placez le titre de séjour bien à plat dans le cadre."
            };
        }

        return {
            key: "card",
            label: type || "Carte d’identité",
            frameClass: "card-frame",
            aspectRatio: 1.586,
            widthRatio: 0.82,
            instruction: "Placez la carte entière dans le cadre rouge. Les bords de la pièce doivent être visibles."
        };
    }

    function applyDocumentFrameProfile() {
        const frame = document.querySelector("#cameraModal .document-frame");
        const profile = getDocumentCaptureProfile();

        if (!frame) {
            return profile;
        }

        frame.classList.remove("card-frame", "passport-frame", "residence-frame");
        frame.classList.add(profile.frameClass);
        frame.style.setProperty("--document-aspect-ratio", String(profile.aspectRatio));
        frame.style.setProperty("--document-frame-width", `${Math.round(profile.widthRatio * 100)}%`);

        return profile;
    }

    function getDocumentCropArea(video) {
        const profile = getDocumentCaptureProfile();
        let cropWidth = video.videoWidth * profile.widthRatio;
        let cropHeight = cropWidth / profile.aspectRatio;

        const maxHeight = video.videoHeight * 0.68;
        if (cropHeight > maxHeight) {
            cropHeight = maxHeight;
            cropWidth = cropHeight * profile.aspectRatio;
        }

        const cropX = (video.videoWidth - cropWidth) / 2;
        const cropY = (video.videoHeight - cropHeight) / 2;

        return {cropX, cropY, cropWidth, cropHeight, profile};
    }

    function getGrayAt(data, width, x, y) {
        const index = (y * width + x) * 4;
        return (data[index] + data[index + 1] + data[index + 2]) / 3;
    }

    function averageGray(data, width, x, y) {
        const index = (y * width + x) * 4;
        return (data[index] + data[index + 1] + data[index + 2]) / 3;
    }

    function scanMaxVerticalBorder(data, width, height, xStartRatio, xEndRatio) {
        const xStart = Math.max(2, Math.round(width * xStartRatio));
        const xEnd = Math.min(width - 3, Math.round(width * xEndRatio));
        const yStart = Math.round(height * 0.16);
        const yEnd = Math.round(height * 0.84);

        let best = 0;

        for (let x = xStart; x <= xEnd; x++) {
            let total = 0;
            let count = 0;

            for (let y = yStart; y <= yEnd; y++) {
                const left = averageGray(data, width, x - 2, y);
                const right = averageGray(data, width, x + 2, y);
                total += Math.abs(left - right);
                count += 1;
            }

            best = Math.max(best, count ? total / count : 0);
        }

        return best;
    }

    function scanMaxHorizontalBorder(data, width, height, yStartRatio, yEndRatio) {
        const yStart = Math.max(2, Math.round(height * yStartRatio));
        const yEnd = Math.min(height - 3, Math.round(height * yEndRatio));
        const xStart = Math.round(width * 0.12);
        const xEnd = Math.round(width * 0.88);

        let best = 0;

        for (let y = yStart; y <= yEnd; y++) {
            let total = 0;
            let count = 0;

            for (let x = xStart; x <= xEnd; x++) {
                const top = averageGray(data, width, x, y - 2);
                const bottom = averageGray(data, width, x, y + 2);
                total += Math.abs(top - bottom);
                count += 1;
            }

            best = Math.max(best, count ? total / count : 0);
        }

        return best;
    }

    function analyzeDocumentFrame(video) {
        const crop = getDocumentCropArea(video);
        const sampleWidth = 280;
        const sampleHeight = Math.max(100, Math.round(sampleWidth / crop.profile.aspectRatio));

        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        ctx.drawImage(
            video,
            crop.cropX,
            crop.cropY,
            crop.cropWidth,
            crop.cropHeight,
            0,
            0,
            sampleWidth,
            sampleHeight
        );

        const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        const data = imageData.data;

        let brightnessTotal = 0;
        let edgeTotal = 0;
        let signatureTotal = 0;
        let innerEdgeTotal = 0;
        let innerEdgeCount = 0;

        for (let y = 2; y < sampleHeight - 2; y++) {
            for (let x = 2; x < sampleWidth - 2; x++) {
                const gray = averageGray(data, sampleWidth, x, y);
                brightnessTotal += gray;

                const rightGray = averageGray(data, sampleWidth, x + 1, y);
                const bottomGray = averageGray(data, sampleWidth, x, y + 1);
                const edge = Math.abs(gray - rightGray) + Math.abs(gray - bottomGray);
                edgeTotal += edge;

                const inTextZone =
                    x > sampleWidth * 0.18 && x < sampleWidth * 0.82 &&
                    y > sampleHeight * 0.18 && y < sampleHeight * 0.82;

                if (inTextZone) {
                    innerEdgeTotal += edge;
                    innerEdgeCount += 1;
                }

                if (x % 14 === 0 && y % 14 === 0) {
                    signatureTotal += gray;
                }
            }
        }

        const pixels = sampleWidth * sampleHeight;
        const brightness = brightnessTotal / pixels;
        const sharpnessScore = clamp((edgeTotal / pixels) * 3.5, 0, 100);
        const brightnessScore = clamp(100 - Math.abs(brightness - 140) * 1.25, 0, 100);
        const innerTextureScore = clamp(((innerEdgeCount ? innerEdgeTotal / innerEdgeCount : 0) * 3.2), 0, 100);

        // Détection rectangulaire : il faut trouver un bord gauche, droit, haut et bas.
        // Un visage peut être net et lumineux, mais il n’a généralement pas 4 bords rectangulaires francs.
        const leftBorder = scanMaxVerticalBorder(data, sampleWidth, sampleHeight, 0.03, 0.22);
        const rightBorder = scanMaxVerticalBorder(data, sampleWidth, sampleHeight, 0.78, 0.97);
        const topBorder = scanMaxHorizontalBorder(data, sampleWidth, sampleHeight, 0.03, 0.24);
        const bottomBorder = scanMaxHorizontalBorder(data, sampleWidth, sampleHeight, 0.76, 0.97);

        const leftScore = clamp(leftBorder * 5.2, 0, 100);
        const rightScore = clamp(rightBorder * 5.2, 0, 100);
        const topScore = clamp(topBorder * 5.2, 0, 100);
        const bottomScore = clamp(bottomBorder * 5.2, 0, 100);

        const oppositeSidesScore = Math.min(leftScore, rightScore) * 0.5 + Math.min(topScore, bottomScore) * 0.5;
        const allSidesScore = (leftScore + rightScore + topScore + bottomScore) / 4;
        const rectangularScore = clamp((oppositeSidesScore * 0.65) + (allSidesScore * 0.35), 0, 100);

        const documentPresenceScore = clamp(
            (rectangularScore * 0.68) +
            (innerTextureScore * 0.18) +
            (sharpnessScore * 0.14),
            0,
            100
        );

        return {
            documentPresenceScore,
            rectangularScore,
            innerTextureScore,
            sharpnessScore,
            brightnessScore,
            signature: Math.round(signatureTotal),
            crop,
            borderScores: {
                left: leftScore,
                right: rightScore,
                top: topScore,
                bottom: bottomScore
            }
        };
    }

    async function detectFaceOverlapInDocumentFrame(video, crop) {
        if (!browserFaceDetector) {
            return {
                faceDetected: false,
                overlapScore: 0
            };
        }

        try {
            const faces = await browserFaceDetector.detect(video);

            if (!faces || faces.length === 0) {
                return {
                    faceDetected: false,
                    overlapScore: 0
                };
            }

            const face = faces[0].boundingBox;
            const faceArea = face.width * face.height;
            const cropArea = crop.cropWidth * crop.cropHeight;

            const x1 = Math.max(face.x, crop.cropX);
            const y1 = Math.max(face.y, crop.cropY);
            const x2 = Math.min(face.x + face.width, crop.cropX + crop.cropWidth);
            const y2 = Math.min(face.y + face.height, crop.cropY + crop.cropHeight);

            const overlapArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
            const overlapScore = cropArea ? clamp((overlapArea / cropArea) * 220, 0, 100) : 0;
            const faceSizeScore = cropArea ? clamp((faceArea / cropArea) * 180, 0, 100) : 0;

            return {
                faceDetected: true,
                overlapScore: Math.max(overlapScore, faceSizeScore)
            };
        } catch (error) {
            return {
                faceDetected: false,
                overlapScore: 0
            };
        }
    }

    function getVideoFrameMetrics(video, sampleWidth = 180, sampleHeight = 180) {
        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

        const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        const data = imageData.data;

        let brightnessTotal = 0;
        let edgeTotal = 0;
        let signatureTotal = 0;

        for (let y = 1; y < sampleHeight - 1; y++) {
            for (let x = 1; x < sampleWidth - 1; x++) {
                const gray = getGrayAt(data, sampleWidth, x, y);
                brightnessTotal += gray;

                const rightGray = getGrayAt(data, sampleWidth, x + 1, y);
                const bottomGray = getGrayAt(data, sampleWidth, x, y + 1);

                edgeTotal += Math.abs(gray - rightGray) + Math.abs(gray - bottomGray);

                if (x % 12 === 0 && y % 12 === 0) {
                    signatureTotal += gray;
                }
            }
        }

        const pixels = sampleWidth * sampleHeight;
        const brightness = brightnessTotal / pixels;

        return {
            sharpnessScore: clamp((edgeTotal / pixels) * 3.2, 0, 100),
            brightnessScore: clamp(100 - Math.abs(brightness - 135) * 1.25, 0, 100),
            signature: Math.round(signatureTotal)
        };
    }

    function computeStabilityScore(currentSignature, previousSignature) {
        if (previousSignature === null || previousSignature === undefined) {
            return 0;
        }

        const diff = Math.abs(currentSignature - previousSignature);
        return clamp(100 - diff / 35, 0, 100);
    }

    async function openDocumentCamera() {
        const modal = document.getElementById("cameraModal");
        const video = document.getElementById("documentVideo");
        const errorBox = document.getElementById("cameraError");
        const profile = applyDocumentFrameProfile();

        errorBox.innerHTML = "";
        currentDocumentSide = "recto";
        documentGoodFrameCount = 0;
        documentPreviousFrameSignature = null;
        lastDocumentCheck = null;

        updateSideIndicator();
        setSmartMessage("documentQualityMessage", `${profile.instruction} Capture automatique uniquement si une pièce est détectée.`, "");

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {ideal: "environment"},
                    width: {ideal: 1920},
                    height: {ideal: 1080}
                },
                audio: false
            });

            video.srcObject = cameraStream;
            modal.style.display = "block";

            video.onloadedmetadata = function () {
                startDocumentSmartCapture();
            };

        } catch (error) {
            errorBox.innerHTML = `
            Caméra indisponible ou permission refusée.
            <button type="button" onclick="openIdentityImport()">Importer une photo</button>
        `;
            modal.style.display = "block";
        }
    }

    function startDocumentSmartCapture() {
        stopDocumentSmartCapture();

        documentSmartInterval = setInterval(async function () {
            const video = document.getElementById("documentVideo");

            if (!video || !video.videoWidth || !video.videoHeight) {
                return;
            }

            const metrics = analyzeDocumentFrame(video);
            const faceCheck = await detectFaceOverlapInDocumentFrame(video, metrics.crop);
            const stabilityScore = computeStabilityScore(metrics.signature, documentPreviousFrameSignature);
            documentPreviousFrameSignature = metrics.signature;

            const faceBlocksDocument = faceCheck.faceDetected && faceCheck.overlapScore >= 35;

            const valid =
                !faceBlocksDocument &&
                metrics.documentPresenceScore >= 68 &&
                metrics.rectangularScore >= 62 &&
                metrics.sharpnessScore >= 40 &&
                metrics.brightnessScore >= 48 &&
                stabilityScore >= 70;

            lastDocumentCheck = {
                valid,
                metrics,
                stabilityScore,
                faceCheck,
                faceBlocksDocument
            };

            setProgress("documentPresenceBar", metrics.documentPresenceScore);
            setProgress("documentSharpnessBar", metrics.sharpnessScore);
            setProgress("documentBrightnessBar", metrics.brightnessScore);
            setProgress("documentStabilityBar", stabilityScore);

            if (valid) {
                documentGoodFrameCount += 1;
                setSmartMessage(
                    "documentQualityMessage",
                    `Pièce détectée dans le cadre. Capture automatique dans ${Math.max(1, 4 - documentGoodFrameCount)}...`,
                    "good"
                );
            } else {
                documentGoodFrameCount = 0;

                if (faceBlocksDocument) {
                    setSmartMessage("documentQualityMessage", "Visage détecté dans le cadre de la pièce. Éloignez votre visage et présentez uniquement le document.", "bad");
                } else if (metrics.rectangularScore < 62) {
                    setSmartMessage("documentQualityMessage", "Les 4 bords de la pièce ne sont pas détectés. Posez la pièce entière dans le cadre rouge, bords visibles.", "bad");
                } else if (metrics.documentPresenceScore < 68) {
                    setSmartMessage("documentQualityMessage", "Pièce insuffisamment détectée. Rapprochez la pièce ou améliorez le contraste avec le fond.", "bad");
                } else if (metrics.brightnessScore < 48) {
                    setSmartMessage("documentQualityMessage", "Luminosité insuffisante ou reflet. Déplacez légèrement la pièce ou augmentez l’éclairage.", "bad");
                } else if (metrics.sharpnessScore < 40) {
                    setSmartMessage("documentQualityMessage", "Image trop floue. Stabilisez la caméra et rapprochez légèrement la pièce.", "bad");
                } else if (stabilityScore < 70) {
                    setSmartMessage("documentQualityMessage", "Tenez la caméra stable quelques secondes.", "bad");
                } else {
                    setSmartMessage("documentQualityMessage", "Ajustez la pièce dans le cadre rouge.", "");
                }
            }

            if (documentGoodFrameCount >= 4) {
                captureDocumentSide({auto: true});
                documentGoodFrameCount = 0;
            }
        }, 500);
    }

    function stopDocumentSmartCapture() {
        if (documentSmartInterval) {
            clearInterval(documentSmartInterval);
            documentSmartInterval = null;
        }
    }

    function closeDocumentCamera() {
        stopDocumentSmartCapture();

        const modal = document.getElementById("cameraModal");
        const video = document.getElementById("documentVideo");

        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }

        video.srcObject = null;
        modal.style.display = "none";
    }

    function updateSideIndicator() {
        const rectoStep = document.getElementById("rectoStep");
        const versoStep = document.getElementById("versoStep");
        const instruction = document.getElementById("cameraInstruction");
        const profile = applyDocumentFrameProfile();

        if (currentDocumentSide === "recto") {
            rectoStep.classList.add("active");
            versoStep.classList.remove("active");
            instruction.innerText = `${profile.label} - Recto : ${profile.instruction}`;
        } else {
            rectoStep.classList.remove("active");
            versoStep.classList.add("active");
            instruction.innerText = `${profile.label} - Verso : retournez la pièce et placez-la entièrement dans le cadre.`;
        }

        if (!documentNeedsBackSide()) {
            versoStep.style.display = "none";
        } else {
            versoStep.style.display = "inline-block";
        }
    }

    function captureDocumentSide(options = {}) {
        const video = document.getElementById("documentVideo");
        const canvas = document.getElementById("documentCanvas");

        if (!video.videoWidth || !video.videoHeight) {
            return;
        }

        if (!lastDocumentCheck || !lastDocumentCheck.valid) {
            const blockedByFace = lastDocumentCheck && lastDocumentCheck.faceBlocksDocument;
            setSmartMessage(
                "documentQualityMessage",
                blockedByFace
                    ? "Capture bloquée : un visage est détecté dans le cadre. Présentez uniquement la pièce d’identité."
                    : "Capture bloquée : les 4 bords de la pièce ne sont pas correctement détectés dans le cadre rouge.",
                "bad"
            );
            return;
        }

        const crop = getDocumentCropArea(video);

        canvas.width = Math.round(crop.cropWidth);
        canvas.height = Math.round(crop.cropHeight);

        const context = canvas.getContext("2d");
        context.drawImage(
            video,
            crop.cropX,
            crop.cropY,
            crop.cropWidth,
            crop.cropHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(function (blob) {
            if (!blob) {
                return;
            }

            const fileName = currentDocumentSide === "recto"
                ? "piece_recto.jpg"
                : "piece_verso.jpg";

            const file = new File([blob], fileName, {
                type: "image/jpeg"
            });

            if (currentDocumentSide === "recto") {
                identityDocumentFiles.recto = file;

                if (documentNeedsBackSide()) {
                    currentDocumentSide = "verso";
                    documentGoodFrameCount = 0;
                    documentPreviousFrameSignature = null;
                    lastDocumentCheck = null;
                    updateSideIndicator();
                    setSmartMessage("documentQualityMessage", "Recto capturé. Retournez la pièce pour capturer le verso.", "good");
                    return;
                }
            } else {
                identityDocumentFiles.verso = file;
            }

            closeDocumentCamera();
            updateIdentityCaptureStatus();

        }, "image/jpeg", 0.92);
    }

    function updateIdentityCaptureStatus() {
        const status = document.getElementById("identityCaptureStatus");
        const preview = document.getElementById("identityPreview");

        preview.innerHTML = "";

        if (identityDocumentFiles.imported) {
            status.className = "capture-status success";
            status.innerText = `📁 ${identityDocumentFiles.imported.name} importé ✓`;
            return;
        }

        if (identityDocumentFiles.recto) {
            preview.appendChild(createPreviewCard("Recto", identityDocumentFiles.recto, "recto"));
        }

        if (identityDocumentFiles.verso) {
            preview.appendChild(createPreviewCard("Verso", identityDocumentFiles.verso, "verso"));
        }

        if (identityDocumentFiles.recto && (!documentNeedsBackSide() || identityDocumentFiles.verso)) {
            status.className = "capture-status success";

            const type = getSelectedDocumentType() || "Pièce";
            status.innerText = documentNeedsBackSide()
                ? `🪪 ${type} — recto & verso capturés ✓`
                : `🪪 ${type} — document capturé ✓`;
        } else if (identityDocumentFiles.recto && documentNeedsBackSide()) {
            status.className = "capture-status";
            status.innerText = "Recto capturé. Veuillez photographier le verso.";
        } else {
            status.className = "capture-status";
            status.innerText = "Aucune pièce capturée ou importée.";
        }
    }

    function createPreviewCard(label, file, side) {
        const card = document.createElement("div");
        card.className = "preview-card";

        const url = URL.createObjectURL(file);

        card.innerHTML = `
        <strong>${label}</strong>
        <img src="${url}" alt="${label}">
        <button type="button" onclick="retakeIdentitySide('${side}')">Reprendre</button>
    `;

        return card;
    }

    function retakeIdentitySide(side) {
        if (side === "recto") {
            identityDocumentFiles.recto = null;
        }

        if (side === "verso") {
            identityDocumentFiles.verso = null;
        }

        updateIdentityCaptureStatus();
    }

    async function uploadFileObject(applicationId, documentType, file) {
        if (!file) {
            return null;
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            `${API_BASE}/api/applications/${applicationId}/documents?document_type=${documentType}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur upload ${documentType} : ${errorText}`);
        }

        return await response.json();
    }

    async function uploadIdentityDocuments(applicationId) {
        if (identityDocumentFiles.imported) {
            await uploadFileObject(applicationId, "IDENTITY_DOCUMENT_IMPORTED", identityDocumentFiles.imported);
            return;
        }

        if (!identityDocumentFiles.recto) {
            throw new Error("Veuillez photographier la pièce d’identité.");
        }

        await uploadFileObject(applicationId, "IDENTITY_DOCUMENT_RECTO", identityDocumentFiles.recto);

        if (documentNeedsBackSide()) {
            if (!identityDocumentFiles.verso) {
                throw new Error("Le verso de la pièce d’identité est requis pour ce type de document.");
            }

            await uploadFileObject(applicationId, "IDENTITY_DOCUMENT_VERSO", identityDocumentFiles.verso);
        }
    }


    let selfieFiles = {
        photo: null,
        video: null,
        imported: null
    };

    let selfieStream = null;
    let selfieMode = "photo";
    let selfieRecorder = null;
    let selfieRecordedChunks = [];

    function openSelfieImport() {
        document.getElementById("selfie_import").click();
    }

    function handleSelfieImport(event) {
        const files = Array.from(event.target.files || []);

        if (files.length === 0) {
            return;
        }

        selfieFiles = {
            photo: null,
            video: null,
            imported: files[0]
        };

        updateSelfieCaptureStatus();
    }

    async function openSelfiePhotoCamera() {
        selfieMode = "photo";
        await openSelfieCamera();
    }

    async function openSelfieVideoCamera() {
        selfieMode = "video";
        await openSelfieCamera();
    }

    async function openSelfieCamera() {
        const modal = document.getElementById("selfieModal");
        const video = document.getElementById("selfieVideo");
        const errorBox = document.getElementById("selfieCameraError");

        errorBox.innerHTML = "";
        selfieGoodFrameCount = 0;
        selfiePreviousFrameSignature = null;

        document.getElementById("selfiePhotoButton").style.display = selfieMode === "photo" ? "inline-block" : "none";
        document.getElementById("startSelfieVideoButton").style.display = selfieMode === "video" ? "inline-block" : "none";
        document.getElementById("stopSelfieVideoButton").style.display = "none";

        document.getElementById("selfieModalTitle").innerText =
            selfieMode === "photo" ? "Capture photo selfie" : "Enregistrement vidéo selfie";

        document.getElementById("selfieInstruction").innerText =
            selfieMode === "photo"
                ? "Placez votre visage dans le cadre. La photo peut être capturée automatiquement si le cadrage est bon."
                : "Placez votre visage dans le cadre et enregistrez une courte vidéo de 5 à 10 secondes.";

        setSmartMessage(
            "selfieQualityMessage",
            selfieMode === "photo"
                ? "Analyse du cadrage visage en cours..."
                : "Pour la vidéo, regardez la caméra et restez stable.",
            ""
        );

        try {
            selfieStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {ideal: "user"},
                    width: {ideal: 1280},
                    height: {ideal: 720}
                },
                audio: selfieMode === "video"
            });

            video.srcObject = selfieStream;
            modal.style.display = "block";

            video.onloadedmetadata = function () {
                if (selfieMode === "photo") {
                    startSelfieSmartCapture();
                }
            };

        } catch (error) {
            errorBox.innerHTML = `
            Caméra indisponible ou permission refusée.
            <button type="button" onclick="openSelfieImport()">Importer une photo</button>
        `;
            modal.style.display = "block";
        }
    }

    function startSelfieSmartCapture() {
        stopSelfieSmartCapture();

        selfieSmartInterval = setInterval(async function () {
            const video = document.getElementById("selfieVideo");

            if (!video || !video.videoWidth || !video.videoHeight) {
                return;
            }

            const metrics = getVideoFrameMetrics(video, 180, 180);
            const stabilityScore = computeStabilityScore(metrics.signature, selfiePreviousFrameSignature);
            selfiePreviousFrameSignature = metrics.signature;

            let faceScore = 0;

            if (browserFaceDetector) {
                try {
                    const faces = await browserFaceDetector.detect(video);

                    if (faces && faces.length > 0) {
                        const face = faces[0].boundingBox;
                        const centerX = face.x + face.width / 2;
                        const centerY = face.y + face.height / 2;
                        const expectedX = video.videoWidth / 2;
                        const expectedY = video.videoHeight / 2;
                        const distanceX = Math.abs(centerX - expectedX) / expectedX;
                        const distanceY = Math.abs(centerY - expectedY) / expectedY;
                        const sizeRatio = face.height / video.videoHeight;
                        const centerScore = 100 - ((distanceX + distanceY) * 90);
                        const sizeScore = 100 - Math.abs(sizeRatio - 0.48) * 160;
                        faceScore = clamp((centerScore + sizeScore) / 2, 0, 100);
                    }
                } catch (error) {
                    faceScore = 0;
                }
            } else {
                faceScore = 45;
            }

            setProgress("selfieFaceBar", faceScore);
            setProgress("selfieSharpnessBar", metrics.sharpnessScore);
            setProgress("selfieBrightnessBar", metrics.brightnessScore);
            setProgress("selfieStabilityBar", stabilityScore);

            const valid =
                browserFaceDetector &&
                faceScore >= 60 &&
                metrics.sharpnessScore >= 35 &&
                metrics.brightnessScore >= 50 &&
                stabilityScore >= 68;

            if (valid) {
                selfieGoodFrameCount += 1;
                setSmartMessage("selfieQualityMessage", `Visage bien cadré. Capture automatique dans ${Math.max(1, 4 - selfieGoodFrameCount)}...`, "good");
            } else {
                selfieGoodFrameCount = 0;

                if (!browserFaceDetector) {
                    setSmartMessage("selfieQualityMessage", "Votre navigateur ne supporte pas la détection visage automatique. Cadrez votre visage puis cliquez sur Capturer la photo.", "");
                } else if (faceScore < 60) {
                    setSmartMessage("selfieQualityMessage", "Placez votre visage au centre du cadre ovale.", "bad");
                } else if (metrics.brightnessScore < 50) {
                    setSmartMessage("selfieQualityMessage", "Visage trop sombre ou trop éclairé.", "bad");
                } else if (stabilityScore < 68) {
                    setSmartMessage("selfieQualityMessage", "Restez stable quelques secondes.", "bad");
                }
            }

            if (selfieGoodFrameCount >= 4) {
                captureSelfiePhoto();
                selfieGoodFrameCount = 0;
            }
        }, 500);
    }

    function stopSelfieSmartCapture() {
        if (selfieSmartInterval) {
            clearInterval(selfieSmartInterval);
            selfieSmartInterval = null;
        }
    }

    function closeSelfieCamera() {
        stopSelfieSmartCapture();

        const modal = document.getElementById("selfieModal");
        const video = document.getElementById("selfieVideo");

        if (selfieRecorder && selfieRecorder.state !== "inactive") {
            selfieRecorder.stop();
        }

        if (selfieStream) {
            selfieStream.getTracks().forEach(track => track.stop());
            selfieStream = null;
        }

        video.srcObject = null;
        modal.style.display = "none";
    }

    function captureSelfiePhoto() {
        const video = document.getElementById("selfieVideo");
        const canvas = document.getElementById("selfieCanvas");

        if (!video.videoWidth || !video.videoHeight) {
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function (blob) {
            if (!blob) {
                return;
            }

            const file = new File([blob], "selfie_photo.jpg", {
                type: "image/jpeg"
            });

            selfieFiles = {
                photo: file,
                video: null,
                imported: null
            };

            closeSelfieCamera();
            updateSelfieCaptureStatus();

        }, "image/jpeg", 0.9);
    }

    function startSelfieRecording() {
        if (!selfieStream) {
            return;
        }

        selfieRecordedChunks = [];

        let mimeType = "video/webm";

        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "";
        }

        selfieRecorder = new MediaRecorder(selfieStream, mimeType ? {mimeType} : {});

        selfieRecorder.ondataavailable = function (event) {
            if (event.data && event.data.size > 0) {
                selfieRecordedChunks.push(event.data);
            }
        };

        selfieRecorder.onstop = function () {
            const blob = new Blob(selfieRecordedChunks, {
                type: "video/webm"
            });

            const file = new File([blob], "selfie_video.webm", {
                type: "video/webm"
            });

            selfieFiles = {
                photo: null,
                video: file,
                imported: null
            };

            closeSelfieCamera();
            updateSelfieCaptureStatus();
        };

        selfieRecorder.start();

        document.getElementById("startSelfieVideoButton").style.display = "none";
        document.getElementById("stopSelfieVideoButton").style.display = "inline-block";
        document.getElementById("selfieInstruction").innerHTML =
            '<span class="recording-indicator">● Enregistrement en cours...</span> Regardez la caméra pendant quelques secondes.';
    }

    function stopSelfieRecording() {
        if (selfieRecorder && selfieRecorder.state !== "inactive") {
            selfieRecorder.stop();
        }
    }

    function updateSelfieCaptureStatus() {
        const status = document.getElementById("selfieCaptureStatus");
        const preview = document.getElementById("selfiePreview");

        preview.innerHTML = "";

        if (selfieFiles.imported) {
            status.className = "capture-status success";
            status.innerText = `📁 ${selfieFiles.imported.name} importé ✓`;

            if (selfieFiles.imported.type.startsWith("image/")) {
                preview.appendChild(createSelfieImagePreview("Selfie importé", selfieFiles.imported));
            }

            return;
        }

        if (selfieFiles.photo) {
            status.className = "capture-status success";
            status.innerText = "📷 Selfie photo capturé ✓";
            preview.appendChild(createSelfieImagePreview("Selfie photo", selfieFiles.photo));
            return;
        }

        if (selfieFiles.video) {
            status.className = "capture-status success";
            status.innerText = "🎥 Vidéo selfie enregistrée ✓";
            preview.appendChild(createSelfieVideoPreview("Vidéo selfie", selfieFiles.video));
            return;
        }

        status.className = "capture-status";
        status.innerText = "Aucun selfie capturé ou importé.";
    }

    function createSelfieImagePreview(label, file) {
        const card = document.createElement("div");
        card.className = "preview-card";

        const url = URL.createObjectURL(file);

        card.innerHTML = `
        <strong>${label}</strong>
        <img src="${url}" alt="${label}">
        <button type="button" onclick="retakeSelfie()">Reprendre</button>
    `;

        return card;
    }

    function createSelfieVideoPreview(label, file) {
        const card = document.createElement("div");
        card.className = "preview-card";

        const url = URL.createObjectURL(file);

        card.innerHTML = `
        <strong>${label}</strong>
        <video class="video-preview" src="${url}" controls></video>
        <button type="button" onclick="retakeSelfie()">Reprendre</button>
    `;

        return card;
    }

    function retakeSelfie() {
        selfieFiles = {
            photo: null,
            video: null,
            imported: null
        };

        updateSelfieCaptureStatus();
    }

    async function uploadSelfieDocument(applicationId) {
        if (selfieFiles.video) {
            await uploadFileObject(applicationId, "SELFIE_VIDEO", selfieFiles.video);
            return;
        }

        if (selfieFiles.photo) {
            await uploadFileObject(applicationId, "SELFIE_PHOTO", selfieFiles.photo);
            return;
        }

        if (selfieFiles.imported) {
            await uploadFileObject(applicationId, "SELFIE_IMPORTED", selfieFiles.imported);
            return;
        }

        throw new Error("Veuillez photographier, filmer ou importer un selfie.");
    }

function openSectionForField(field) {
    const section = field.closest(".section");

    if (section) {
        section.classList.add("open");

        const body = section.querySelector(".section-body");
        if (body) {
            body.style.display = "block";
        }
    }

    setTimeout(function () {
        try {
            field.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            field.focus();
        } catch (error) {
            console.warn("Impossible de focus le champ :", field.name);
        }
    }, 100);
}

// AFB_INLINE_VALIDATION_V1 — remplace les alert() : toutes les erreurs affichées sous les champs
function clearFieldError(field) {
    field.classList.remove("field-invalid");
    field.removeAttribute("aria-invalid");

    const box = field.closest("div");
    const msg = box ? box.querySelector(".field-error-msg") : null;
    if (msg) msg.remove();
}

function markFieldError(field, message) {
    field.classList.add("field-invalid");
    field.setAttribute("aria-invalid", "true");

    const box = field.closest("div");
    if (!box || box.querySelector(".field-error-msg")) return;

    const msg = document.createElement("span");
    msg.className = "field-error-msg";
    msg.id = (field.id || field.name || "champ") + "-error";
    msg.textContent = message;
    field.setAttribute("aria-describedby", msg.id);
    box.appendChild(msg);

    field.addEventListener("input", function onFix() {
        if ((field.value || "").trim()) {
            clearFieldError(field);
            field.removeEventListener("input", onFix);
        }
    });
    field.addEventListener("change", function onFixChange() {
        if ((field.value || "").trim()) {
            clearFieldError(field);
            field.removeEventListener("change", onFixChange);
        }
    });
}

function validateRequiredFields(form) {
    const requiredFields = Array.from(form.querySelectorAll("[required]"));
    const invalidFields = [];

    requiredFields.forEach(clearFieldError);

    for (const field of requiredFields) {
        if (field.disabled || field.type === "hidden") {
            continue;
        }

        // AFB_CONSENT_CHECKBOX_VALIDATION_V1 : une case à cocher a toujours
        // field.value = "on" — il faut tester field.checked, sinon le
        // consentement passe même décoché.
        if (field.type === "checkbox") {
            if (!field.checked) {
                markFieldError(field, "Veuillez cocher cette case pour continuer.");
                invalidFields.push(field);
            }
            continue;
        }

        const value = (field.value || "").trim();

        if (!value) {
            markFieldError(field, "Ce champ est obligatoire.");
            invalidFields.push(field);
        }
    }

    const summary = document.getElementById("result");

    if (invalidFields.length > 0) {
        if (summary) {
            summary.style.display = "block";
            summary.className = "result error";
            summary.textContent = invalidFields.length === 1
                ? "1 champ obligatoire reste à compléter. Il est signalé en rouge."
                : invalidFields.length + " champs obligatoires restent à compléter. Ils sont signalés en rouge.";
        }

        const first = invalidFields[0];
        openSectionForField(first);
        setTimeout(function () {
            first.scrollIntoView({behavior: "smooth", block: "center"});
            first.focus({preventScroll: true});
        }, 150);

        return false;
    }

    if (summary && summary.classList.contains("error")) {
        summary.style.display = "none";
    }

    return true;
}

// AFB_LABEL_AUTOLINK_V1 — associe chaque label au champ voisin (accessibilité)
document.addEventListener("DOMContentLoaded", function () {
    let autoId = 0;

    document.querySelectorAll("#accountForm label:not([for])").forEach(function (label) {
        const box = label.closest("div");
        if (!box) return;

        const field = box.querySelector("input, select, textarea");
        if (!field) return;

        if (!field.id) {
            autoId += 1;
            field.id = "afb-field-" + (field.name || "auto") + "-" + autoId;
        }

        label.setAttribute("for", field.id);
    });
});



/* ==========================================================
   V7 - Capture adaptative pièce d’identité
   Objectif : le cadre ne reste plus fixe. Il se rétrécit ou
   s’agrandit selon la proximité réelle de la pièce détectée.
   ========================================================== */
let adaptiveDocumentFrame = null;
let adaptiveFrameInitialized = false;

function getDocumentCaptureProfile() {
    const type = getSelectedDocumentType();

    if (type === "Passeport") {
        return {
            key: "passport",
            label: "Passeport",
            frameClass: "passport-frame",
            aspectRatio: 1.42,
            defaultWidthRatio: 0.72,
            minWidthRatio: 0.38,
            maxWidthRatio: 0.90,
            targetMinWidthRatio: 0.34,
            targetMaxWidthRatio: 0.86,
            instruction: "Ouvrez le passeport sur la page d’identité. Le cadre s’ajuste automatiquement à la page détectée."
        };
    }

    if (type === "Titre de séjour") {
        return {
            key: "residence",
            label: "Titre de séjour",
            frameClass: "residence-frame",
            aspectRatio: 1.586,
            defaultWidthRatio: 0.82,
            minWidthRatio: 0.34,
            maxWidthRatio: 0.94,
            targetMinWidthRatio: 0.30,
            targetMaxWidthRatio: 0.86,
            instruction: "Présentez le titre de séjour. Le cadre s’ajuste automatiquement aux bords détectés."
        };
    }

    return {
        key: "card",
        label: type || "Carte d’identité",
        frameClass: "card-frame",
        aspectRatio: 1.586,
        defaultWidthRatio: 0.74,
        minWidthRatio: 0.28,
        maxWidthRatio: 0.94,
        targetMinWidthRatio: 0.30,
        targetMaxWidthRatio: 0.84,
        instruction: "Présentez la carte entière. Le cadre rouge se rétrécit ou s’agrandit selon la proximité de la pièce."
    };
}

function getDefaultAdaptiveDocumentFrame(profile) {
    const widthRatio = profile.defaultWidthRatio;
    const heightRatio = widthRatio / profile.aspectRatio;

    return {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        widthRatio,
        heightRatio,
        detected: false,
        confidence: 0,
        tooClose: false,
        tooFar: false,
        ratioScore: 0,
        borderScore: 0
    };
}

function applyDocumentFrameToDom(profile, frameState) {
    const frame = document.querySelector("#cameraModal .document-frame");

    if (!frame) {
        return;
    }

    frame.classList.remove("card-frame", "passport-frame", "residence-frame", "detected", "searching", "too-close", "too-far");
    frame.classList.add(profile.frameClass);

    if (frameState.detected && frameState.confidence >= 58) {
        frame.classList.add("detected");
    } else {
        frame.classList.add("searching");
    }

    if (frameState.tooClose) {
        frame.classList.add("too-close");
    }

    if (frameState.tooFar) {
        frame.classList.add("too-far");
    }

    frame.style.setProperty("--document-aspect-ratio", String(profile.aspectRatio));
    frame.style.setProperty("--document-frame-left", `${Math.round(frameState.centerXRatio * 100)}%`);
    frame.style.setProperty("--document-frame-top", `${Math.round(frameState.centerYRatio * 100)}%`);
    frame.style.setProperty("--document-frame-width", `${Math.round(frameState.widthRatio * 100)}%`);
    frame.style.setProperty("--document-frame-height", `${Math.round(frameState.heightRatio * 100)}%`);
}

function applyDocumentFrameProfile() {
    const profile = getDocumentCaptureProfile();

    if (!adaptiveDocumentFrame || !adaptiveFrameInitialized) {
        adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
        adaptiveFrameInitialized = true;
    }

    applyDocumentFrameToDom(profile, adaptiveDocumentFrame);
    return profile;
}

function quantile(sortedValues, q) {
    if (!sortedValues || sortedValues.length === 0) {
        return 0;
    }

    const index = Math.max(0, Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * q)));
    return sortedValues[index];
}

function normalizeBoxToAspect(box, expectedAspect, sampleWidth, sampleHeight) {
    let centerX = (box.x1 + box.x2) / 2;
    let centerY = (box.y1 + box.y2) / 2;
    let width = Math.max(1, box.x2 - box.x1);
    let height = Math.max(1, box.y2 - box.y1);

    // Marge volontaire pour inclure les bords de la pièce et éviter de couper les coins.
    width *= 1.18;
    height *= 1.18;

    const currentAspect = width / height;

    if (currentAspect < expectedAspect) {
        width = height * expectedAspect;
    } else {
        height = width / expectedAspect;
    }

    const maxWidth = sampleWidth * 0.94;
    const maxHeight = sampleHeight * 0.86;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / expectedAspect;
    }

    if (height > maxHeight) {
        height = maxHeight;
        width = height * expectedAspect;
    }

    centerX = clamp(centerX, width / 2, sampleWidth - width / 2);
    centerY = clamp(centerY, height / 2, sampleHeight - height / 2);

    return {
        x1: centerX - width / 2,
        y1: centerY - height / 2,
        x2: centerX + width / 2,
        y2: centerY + height / 2,
        width,
        height,
        centerX,
        centerY,
        aspect: width / height
    };
}

function estimateAdaptiveDocumentBox(video, profile) {
    const sampleWidth = 360;
    const sampleHeight = Math.max(160, Math.round(sampleWidth * (video.videoHeight / video.videoWidth)));

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    const edgePointsX = [];
    const edgePointsY = [];
    let edgeSum = 0;
    let edgeCount = 0;
    let maxEdge = 0;

    // Première passe : niveau d’activité des bords.
    for (let y = 3; y < sampleHeight - 3; y += 2) {
        for (let x = 3; x < sampleWidth - 3; x += 2) {
            const gray = averageGray(data, sampleWidth, x, y);
            const gx = Math.abs(averageGray(data, sampleWidth, x + 2, y) - averageGray(data, sampleWidth, x - 2, y));
            const gy = Math.abs(averageGray(data, sampleWidth, x, y + 2) - averageGray(data, sampleWidth, x, y - 2));
            const edge = gx + gy;

            edgeSum += edge;
            edgeCount += 1;
            maxEdge = Math.max(maxEdge, edge);
        }
    }

    const avgEdge = edgeCount ? edgeSum / edgeCount : 0;
    const threshold = Math.max(30, avgEdge * 2.25, maxEdge * 0.22);

    // Deuxième passe : nuage de points correspondant aux bords/textures fortes.
    for (let y = 4; y < sampleHeight - 4; y += 2) {
        for (let x = 4; x < sampleWidth - 4; x += 2) {
            // On évite les bords extrêmes de la webcam, qui peuvent créer de faux contours.
            if (x < sampleWidth * 0.03 || x > sampleWidth * 0.97 || y < sampleHeight * 0.05 || y > sampleHeight * 0.95) {
                continue;
            }

            const gx = Math.abs(averageGray(data, sampleWidth, x + 2, y) - averageGray(data, sampleWidth, x - 2, y));
            const gy = Math.abs(averageGray(data, sampleWidth, x, y + 2) - averageGray(data, sampleWidth, x, y - 2));
            const edge = gx + gy;

            if (edge >= threshold) {
                edgePointsX.push(x);
                edgePointsY.push(y);
            }
        }
    }

    if (edgePointsX.length < 90) {
        return {
            found: false,
            confidence: 0,
            reason: "NO_EDGE_POINTS"
        };
    }

    edgePointsX.sort((a, b) => a - b);
    edgePointsY.sort((a, b) => a - b);

    const rawBox = {
        x1: quantile(edgePointsX, 0.02),
        x2: quantile(edgePointsX, 0.98),
        y1: quantile(edgePointsY, 0.02),
        y2: quantile(edgePointsY, 0.98)
    };

    const box = normalizeBoxToAspect(rawBox, profile.aspectRatio, sampleWidth, sampleHeight);

    const widthRatio = box.width / sampleWidth;
    const heightRatio = box.height / sampleHeight;
    const centerXRatio = box.centerX / sampleWidth;
    const centerYRatio = box.centerY / sampleHeight;
    const rawAspect = Math.max(0.1, (rawBox.x2 - rawBox.x1) / Math.max(1, rawBox.y2 - rawBox.y1));

    const aspectDiff = Math.abs(rawAspect - profile.aspectRatio) / profile.aspectRatio;
    const ratioScore = clamp(100 - aspectDiff * 130, 0, 100);

    const areaRatio = widthRatio * heightRatio;
    let sizeScore = 100;
    let tooFar = false;
    let tooClose = false;

    if (widthRatio < profile.targetMinWidthRatio) {
        tooFar = true;
        sizeScore = clamp((widthRatio / profile.targetMinWidthRatio) * 100, 0, 100);
    } else if (widthRatio > profile.targetMaxWidthRatio) {
        tooClose = true;
        sizeScore = clamp(100 - ((widthRatio - profile.targetMaxWidthRatio) / 0.18) * 100, 0, 100);
    }

    const centralityScore = clamp(
        100 - (Math.abs(centerXRatio - 0.5) * 130 + Math.abs(centerYRatio - 0.5) * 120),
        0,
        100
    );

    // Plus le nombre de points utiles est élevé, plus il y a de chance qu’il y ait réellement une pièce.
    const density = edgePointsX.length / ((box.width * box.height) / 4);
    const densityScore = clamp(density * 65, 0, 100);

    const confidence = clamp(
        ratioScore * 0.35 +
        sizeScore * 0.25 +
        centralityScore * 0.15 +
        densityScore * 0.25,
        0,
        100
    );

    return {
        found: confidence >= 35,
        confidence,
        ratioScore,
        sizeScore,
        centralityScore,
        densityScore,
        tooFar,
        tooClose,
        widthRatio,
        heightRatio,
        centerXRatio,
        centerYRatio,
        areaRatio,
        rawAspect,
        profile
    };
}

function updateAdaptiveDocumentFrame(video, profile) {
    const detection = estimateAdaptiveDocumentBox(video, profile);

    let nextFrame;

    if (detection.found) {
        const widthRatio = clamp(detection.widthRatio, profile.minWidthRatio, profile.maxWidthRatio);
        const heightRatio = widthRatio / profile.aspectRatio;

        nextFrame = {
            centerXRatio: clamp(detection.centerXRatio, 0.18, 0.82),
            centerYRatio: clamp(detection.centerYRatio, 0.22, 0.78),
            widthRatio,
            heightRatio,
            detected: detection.confidence >= 50,
            confidence: detection.confidence,
            tooClose: detection.tooClose,
            tooFar: detection.tooFar,
            ratioScore: detection.ratioScore,
            sizeScore: detection.sizeScore,
            densityScore: detection.densityScore,
            centralityScore: detection.centralityScore
        };
    } else {
        nextFrame = getDefaultAdaptiveDocumentFrame(profile);
    }

    if (!adaptiveDocumentFrame || !adaptiveFrameInitialized) {
        adaptiveDocumentFrame = nextFrame;
        adaptiveFrameInitialized = true;
    } else {
        const smoothing = detection.found ? 0.38 : 0.16;
        adaptiveDocumentFrame = {
            ...nextFrame,
            centerXRatio: adaptiveDocumentFrame.centerXRatio * (1 - smoothing) + nextFrame.centerXRatio * smoothing,
            centerYRatio: adaptiveDocumentFrame.centerYRatio * (1 - smoothing) + nextFrame.centerYRatio * smoothing,
            widthRatio: adaptiveDocumentFrame.widthRatio * (1 - smoothing) + nextFrame.widthRatio * smoothing,
            heightRatio: adaptiveDocumentFrame.heightRatio * (1 - smoothing) + nextFrame.heightRatio * smoothing
        };
    }

    applyDocumentFrameToDom(profile, adaptiveDocumentFrame);

    return {
        ...detection,
        frame: adaptiveDocumentFrame
    };
}

function getDocumentCropArea(video) {
    const profile = getDocumentCaptureProfile();

    if (!adaptiveDocumentFrame || !adaptiveFrameInitialized) {
        adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
    }

    const cropWidth = video.videoWidth * adaptiveDocumentFrame.widthRatio;
    const cropHeight = video.videoHeight * adaptiveDocumentFrame.heightRatio;
    const cropCenterX = video.videoWidth * adaptiveDocumentFrame.centerXRatio;
    const cropCenterY = video.videoHeight * adaptiveDocumentFrame.centerYRatio;

    let cropX = cropCenterX - cropWidth / 2;
    let cropY = cropCenterY - cropHeight / 2;

    cropX = clamp(cropX, 0, video.videoWidth - cropWidth);
    cropY = clamp(cropY, 0, video.videoHeight - cropHeight);

    return {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        profile,
        frame: adaptiveDocumentFrame
    };
}

function analyzeDocumentFrame(video) {
    const crop = getDocumentCropArea(video);
    const sampleWidth = 280;
    const sampleHeight = Math.max(100, Math.round(sampleWidth / crop.profile.aspectRatio));

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    ctx.drawImage(
        video,
        crop.cropX,
        crop.cropY,
        crop.cropWidth,
        crop.cropHeight,
        0,
        0,
        sampleWidth,
        sampleHeight
    );

    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    let brightnessTotal = 0;
    let edgeTotal = 0;
    let signatureTotal = 0;
    let innerEdgeTotal = 0;
    let innerEdgeCount = 0;

    for (let y = 2; y < sampleHeight - 2; y++) {
        for (let x = 2; x < sampleWidth - 2; x++) {
            const gray = averageGray(data, sampleWidth, x, y);
            brightnessTotal += gray;

            const rightGray = averageGray(data, sampleWidth, x + 1, y);
            const bottomGray = averageGray(data, sampleWidth, x, y + 1);
            const edge = Math.abs(gray - rightGray) + Math.abs(gray - bottomGray);
            edgeTotal += edge;

            if (x > sampleWidth * 0.18 && x < sampleWidth * 0.82 && y > sampleHeight * 0.18 && y < sampleHeight * 0.82) {
                innerEdgeTotal += edge;
                innerEdgeCount += 1;
            }

            if (x % 14 === 0 && y % 14 === 0) {
                signatureTotal += gray;
            }
        }
    }

    const pixels = sampleWidth * sampleHeight;
    const brightness = brightnessTotal / pixels;
    const sharpnessScore = clamp((edgeTotal / pixels) * 3.5, 0, 100);
    const brightnessScore = clamp(100 - Math.abs(brightness - 140) * 1.25, 0, 100);
    const innerTextureScore = clamp(((innerEdgeCount ? innerEdgeTotal / innerEdgeCount : 0) * 3.2), 0, 100);

    const leftBorder = scanMaxVerticalBorder(data, sampleWidth, sampleHeight, 0.01, 0.18);
    const rightBorder = scanMaxVerticalBorder(data, sampleWidth, sampleHeight, 0.82, 0.99);
    const topBorder = scanMaxHorizontalBorder(data, sampleWidth, sampleHeight, 0.01, 0.20);
    const bottomBorder = scanMaxHorizontalBorder(data, sampleWidth, sampleHeight, 0.80, 0.99);

    const leftScore = clamp(leftBorder * 5.2, 0, 100);
    const rightScore = clamp(rightBorder * 5.2, 0, 100);
    const topScore = clamp(topBorder * 5.2, 0, 100);
    const bottomScore = clamp(bottomBorder * 5.2, 0, 100);
    const rectangularScore = clamp(
        Math.min(leftScore, rightScore) * 0.38 +
        Math.min(topScore, bottomScore) * 0.38 +
        ((leftScore + rightScore + topScore + bottomScore) / 4) * 0.24,
        0,
        100
    );

    const documentPresenceScore = clamp(
        rectangularScore * 0.52 + innerTextureScore * 0.23 + (crop.frame.confidence || 0) * 0.25,
        0,
        100
    );

    return {
        documentPresenceScore,
        rectangularScore,
        sharpnessScore,
        brightnessScore,
        innerTextureScore,
        signature: Math.round(signatureTotal),
        crop
    };
}

async function openDocumentCamera() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("documentVideo");
    const errorBox = document.getElementById("cameraError");

    const profile = getDocumentCaptureProfile();
    adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
    adaptiveFrameInitialized = true;
    applyDocumentFrameToDom(profile, adaptiveDocumentFrame);

    errorBox.innerHTML = "";
    currentDocumentSide = "recto";
    documentGoodFrameCount = 0;
    documentPreviousFrameSignature = null;
    lastDocumentCheck = null;

    updateSideIndicator();
    setSmartMessage(
        "documentQualityMessage",
        `${profile.instruction} La capture démarre seulement quand la dimension détectée est correcte.`,
        ""
    );

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {ideal: "environment"},
                width: {ideal: 1920},
                height: {ideal: 1080}
            },
            audio: false
        });

        video.srcObject = cameraStream;
        modal.style.display = "block";

        video.onloadedmetadata = function () {
            startDocumentSmartCapture();
        };
    } catch (error) {
        errorBox.innerHTML = `
            Caméra indisponible ou permission refusée.
            <button type="button" onclick="openIdentityImport()">Importer une photo</button>
        `;
        modal.style.display = "block";
    }
}

function startDocumentSmartCapture() {
    stopDocumentSmartCapture();

    documentSmartInterval = setInterval(async function () {
        const video = document.getElementById("documentVideo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            return;
        }

        const profile = getDocumentCaptureProfile();
        const adaptiveDetection = updateAdaptiveDocumentFrame(video, profile);
        const metrics = analyzeDocumentFrame(video);
        const faceCheck = await detectFaceOverlapInDocumentFrame(video, metrics.crop);
        const stabilityScore = computeStabilityScore(metrics.signature, documentPreviousFrameSignature);
        documentPreviousFrameSignature = metrics.signature;

        const faceBlocksDocument = faceCheck.faceDetected && faceCheck.overlapScore >= 25;
        const tooFar = adaptiveDetection.tooFar || adaptiveDetection.widthRatio < profile.targetMinWidthRatio;
        const tooClose = adaptiveDetection.tooClose || adaptiveDetection.widthRatio > profile.targetMaxWidthRatio;
        const aspectBad = (adaptiveDetection.ratioScore || 0) < 48;

        const valid =
            adaptiveDetection.found &&
            !faceBlocksDocument &&
            !tooFar &&
            !tooClose &&
            !aspectBad &&
            adaptiveDetection.confidence >= 58 &&
            metrics.documentPresenceScore >= 60 &&
            metrics.rectangularScore >= 48 &&
            metrics.sharpnessScore >= 35 &&
            metrics.brightnessScore >= 45 &&
            stabilityScore >= 65;

        lastDocumentCheck = {
            valid,
            metrics,
            stabilityScore,
            faceCheck,
            faceBlocksDocument,
            adaptiveDetection,
            tooFar,
            tooClose,
            aspectBad
        };

        setProgress("documentPresenceBar", metrics.documentPresenceScore);
        setProgress("documentSharpnessBar", metrics.sharpnessScore);
        setProgress("documentBrightnessBar", metrics.brightnessScore);
        setProgress("documentStabilityBar", stabilityScore);

        if (valid) {
            documentGoodFrameCount += 1;
            setSmartMessage(
                "documentQualityMessage",
                `Pièce cadrée automatiquement. Capture dans ${Math.max(1, 4 - documentGoodFrameCount)}...`,
                "good"
            );
        } else {
            documentGoodFrameCount = 0;

            if (!adaptiveDetection.found || adaptiveDetection.confidence < 35) {
                setSmartMessage("documentQualityMessage", "Aucune pièce détectée. Placez uniquement la pièce devant la caméra, sur un fond contrasté.", "bad");
            } else if (faceBlocksDocument) {
                setSmartMessage("documentQualityMessage", "Visage détecté dans la zone pièce. Éloignez le visage : la caméra doit voir seulement le document.", "bad");
            } else if (tooFar) {
                setSmartMessage("documentQualityMessage", "Pièce trop éloignée : rapprochez-la. Le cadre va se rétrécir/ajuster autour d’elle.", "bad");
            } else if (tooClose) {
                setSmartMessage("documentQualityMessage", "Pièce trop proche : éloignez-la légèrement pour voir tous les bords.", "bad");
            } else if (aspectBad) {
                setSmartMessage("documentQualityMessage", `Format non conforme pour ${profile.label}. Tournez ou alignez la pièce dans le bon sens.`, "bad");
            } else if (metrics.brightnessScore < 45) {
                setSmartMessage("documentQualityMessage", "Luminosité insuffisante ou reflet. Déplacez la pièce ou améliorez l’éclairage.", "bad");
            } else if (metrics.sharpnessScore < 35) {
                setSmartMessage("documentQualityMessage", "Image trop floue. Stabilisez la caméra quelques secondes.", "bad");
            } else if (stabilityScore < 65) {
                setSmartMessage("documentQualityMessage", "Tenez la pièce et la caméra stables. Capture automatique en attente.", "bad");
            } else {
                setSmartMessage("documentQualityMessage", "Ajustement du cadre en cours. Gardez toute la pièce visible.", "");
            }
        }

        if (documentGoodFrameCount >= 4) {
            captureDocumentSide({auto: true});
            documentGoodFrameCount = 0;
        }
    }, 420);
}

function updateSideIndicator() {
    const rectoStep = document.getElementById("rectoStep");
    const versoStep = document.getElementById("versoStep");
    const instruction = document.getElementById("cameraInstruction");
    const profile = applyDocumentFrameProfile();

    if (currentDocumentSide === "recto") {
        rectoStep.classList.add("active");
        versoStep.classList.remove("active");
        instruction.innerText = `${profile.label} - Recto : ${profile.instruction}`;
    } else {
        rectoStep.classList.remove("active");
        versoStep.classList.add("active");
        instruction.innerText = `${profile.label} - Verso : retournez la pièce. Le cadre s’ajuste automatiquement à ses dimensions.`;
    }

    if (!documentNeedsBackSide()) {
        versoStep.style.display = "none";
    } else {
        versoStep.style.display = "inline-block";
    }
}

function expandQuadAroundCenter(ordered, expansion, maxWidth, maxHeight) {
    const points = [ordered.tl, ordered.tr, ordered.br, ordered.bl];
    const centerX = points.reduce((total, point) => total + point.x, 0) / 4;
    const centerY = points.reduce((total, point) => total + point.y, 0) / 4;

    const expanded = points.map(point => ({
        x: clamp(centerX + (point.x - centerX) * expansion, 0, maxWidth - 1),
        y: clamp(centerY + (point.y - centerY) * expansion, 0, maxHeight - 1)
    }));

    return {
        tl: expanded[0],
        tr: expanded[1],
        br: expanded[2],
        bl: expanded[3]
    };
}

function captureDocumentSide(options = {}) {
    const video = document.getElementById("documentVideo");
    const canvas = document.getElementById("documentCanvas");

    if (!video.videoWidth || !video.videoHeight) {
        return;
    }

    if (!lastDocumentCheck || !lastDocumentCheck.valid) {
        let message = "Capture bloquée : la pièce n’est pas correctement cadrée.";

        if (lastDocumentCheck) {
            if (lastDocumentCheck.faceBlocksDocument) {
                message = "Capture bloquée : un visage est détecté dans la zone pièce.";
            } else if (lastDocumentCheck.tooFar) {
                message = "Capture bloquée : la pièce est trop éloignée.";
            } else if (lastDocumentCheck.tooClose) {
                message = "Capture bloquée : la pièce est trop proche.";
            } else if (lastDocumentCheck.aspectBad) {
                message = "Capture bloquée : le format détecté ne correspond pas au type de pièce choisi.";
            }
        }

        setSmartMessage("documentQualityMessage", message, "bad");
        return;
    }

    const crop = getDocumentCropArea(video);

    canvas.width = Math.round(crop.cropWidth);
    canvas.height = Math.round(crop.cropHeight);

    const context = canvas.getContext("2d");
    context.drawImage(
        video,
        crop.cropX,
        crop.cropY,
        crop.cropWidth,
        crop.cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(function (blob) {
        if (!blob) {
            return;
        }

        const fileName = currentDocumentSide === "recto"
            ? "piece_recto.jpg"
            : "piece_verso.jpg";

        const file = new File([blob], fileName, {type: "image/jpeg"});

        if (currentDocumentSide === "recto") {
            identityDocumentFiles.recto = file;

            if (documentNeedsBackSide()) {
                currentDocumentSide = "verso";
                documentGoodFrameCount = 0;
                documentPreviousFrameSignature = null;
                lastDocumentCheck = null;

                const profile = getDocumentCaptureProfile();
                adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
                adaptiveFrameInitialized = true;
                applyDocumentFrameToDom(profile, adaptiveDocumentFrame);

                updateSideIndicator();
                updateIdentityCaptureStatus();
                setSmartMessage("documentQualityMessage", "Recto capturé. Retournez la pièce : le cadre va à nouveau s’adapter au verso.", "good");
                return;
            }
        } else {
            identityDocumentFiles.verso = file;
        }

        closeDocumentCamera();
        updateIdentityCaptureStatus();
    }, "image/jpeg", 0.92);
}



/* ==========================================================
   V7 - OpenCV.js + MediaPipe, cadre adaptatif stabilisé
   Détection réelle du document par contours quadrilatères,
   cadrage dynamique sur la pièce détectée, perspective crop,
   blocage si visage détecté dans la zone document.
   ========================================================== */

let openCvDocumentDetectionReady = false;
let lastOpenCvDocument = null;

async function waitForOpenCv(timeoutMs = 6000) {
    if (window.cv && cv.Mat) {
        return true;
    }

    if (window.OPENCV_READY) {
        try {
            await Promise.race([
                window.OPENCV_READY,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout OpenCV")), timeoutMs))
            ]);
        } catch (error) {
            console.error("OpenCV non chargé :", error);
            return false;
        }
    }

    openCvDocumentDetectionReady = !!(window.cv && cv.Mat);
    return openCvDocumentDetectionReady;
}

async function waitForMediaPipeFaceDetector(timeoutMs = 5000) {
    if (!window.MEDIAPIPE_FACE_READY) {
        return false;
    }

    try {
        const detector = await Promise.race([
            window.MEDIAPIPE_FACE_READY,
            new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))
        ]);
        return !!detector;
    } catch (error) {
        console.warn("MediaPipe indisponible :", error);
        return false;
    }
}

function distanceBetweenPoints(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function orderQuadPoints(points) {
    const sorted = points.map(point => ({x: point.x, y: point.y}));

    const sumSorted = [...sorted].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const diffSorted = [...sorted].sort((a, b) => (a.x - a.y) - (b.x - b.y));

    return {
        tl: sumSorted[0],
        br: sumSorted[sumSorted.length - 1],
        tr: diffSorted[diffSorted.length - 1],
        bl: diffSorted[0]
    };
}

function getVideoSnapshotCanvas(video, targetWidth = 720) {
    const sampleWidth = targetWidth;
    const sampleHeight = Math.max(240, Math.round(sampleWidth * (video.videoHeight / video.videoWidth)));

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

    return canvas;
}

function extractBoundingBoxFromPoints(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    return {
        x1: Math.min(...xs),
        y1: Math.min(...ys),
        x2: Math.max(...xs),
        y2: Math.max(...ys)
    };
}

function getOpenCvMatQuality(srcMat, rect) {
    let roi = null;
    let gray = null;
    let laplacian = null;
    let mean = null;
    let stddev = null;

    try {
        const safeRect = new cv.Rect(
            Math.max(0, Math.floor(rect.x)),
            Math.max(0, Math.floor(rect.y)),
            Math.max(2, Math.min(srcMat.cols - Math.floor(rect.x), Math.floor(rect.width))),
            Math.max(2, Math.min(srcMat.rows - Math.floor(rect.y), Math.floor(rect.height)))
        );

        roi = srcMat.roi(safeRect);
        gray = new cv.Mat();
        cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);

        const brightness = cv.mean(gray)[0];
        const brightnessScore = clamp(100 - Math.abs(brightness - 138) * 1.15, 0, 100);

        laplacian = new cv.Mat();
        cv.Laplacian(gray, laplacian, cv.CV_64F);

        mean = new cv.Mat();
        stddev = new cv.Mat();
        cv.meanStdDev(laplacian, mean, stddev);

        const variance = Math.pow(stddev.doubleAt(0, 0), 2);
        const sharpnessScore = clamp(variance / 8, 0, 100);

        return {
            brightnessScore,
            sharpnessScore,
            brightness,
            variance
        };
    } finally {
        if (roi) roi.delete();
        if (gray) gray.delete();
        if (laplacian) laplacian.delete();
        if (mean) mean.delete();
        if (stddev) stddev.delete();
    }
}

function detectDocumentWithOpenCv(video, profile) {
    if (!window.cv || !cv.Mat) {
        return {found: false, confidence: 0, reason: "OPENCV_NOT_READY"};
    }

    const canvas = getVideoSnapshotCanvas(video, 760);
    let src = null;
    let gray = null;
    let equalized = null;
    let blurred = null;
    let edges = null;
    let dilated = null;
    let binary = null;
    let adaptive = null;
    let kernel = null;
    let contours = null;
    let hierarchy = null;

    const frameArea = canvas.width * canvas.height;
    let best = null;

    function bboxPoints(rect) {
        return [
            {x: rect.x, y: rect.y},
            {x: rect.x + rect.width, y: rect.y},
            {x: rect.x + rect.width, y: rect.y + rect.height},
            {x: rect.x, y: rect.y + rect.height}
        ];
    }

    function contourTouchesCameraBorder(rect) {
        const margin = 4;
        return (
            rect.x <= margin ||
            rect.y <= margin ||
            rect.x + rect.width >= canvas.width - margin ||
            rect.y + rect.height >= canvas.height - margin
        );
    }

    function evaluateContour(contour, sourceLabel) {
        const area = cv.contourArea(contour);

        // On descend très bas pour détecter une pièce éloignée, mais on ne capture pas si elle est trop petite.
        if (area < frameArea * 0.006 || area > frameArea * 0.82) {
            return;
        }

        const rect = cv.boundingRect(contour);

        if (rect.width < canvas.width * 0.08 || rect.height < canvas.height * 0.08) {
            return;
        }

        // Rejet des grands fonds clairs qui touchent les bords de la webcam.
        if (contourTouchesCameraBorder(rect) && area > frameArea * 0.18) {
            return;
        }

        const perimeter = cv.arcLength(contour, true);
        const approx = new cv.Mat();

        try {
            cv.approxPolyDP(contour, approx, 0.030 * perimeter, true);

            const rectArea = Math.max(1, rect.width * rect.height);
            const rectangularity = clamp((area / rectArea) * 100, 0, 100);

            let points = null;
            let ordered = null;
            let quadrilateralScore = 0;

            // Cas idéal : 4 coins détectés.
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
                points = [];
                const data = approx.data32S;

                for (let p = 0; p < 4; p++) {
                    points.push({
                        x: data[p * 2],
                        y: data[p * 2 + 1]
                    });
                }

                ordered = orderQuadPoints(points);
                quadrilateralScore = 100;
            }

            // Cas réaliste : la main cache une partie de la pièce, ou le bord blanc est peu contrasté.
            // On utilise alors la boîte rectangulaire comme approximation, mais avec un score plus faible.
            if (!points && approx.rows >= 4 && approx.rows <= 14 && rectangularity >= 28) {
                points = bboxPoints(rect);
                ordered = orderQuadPoints(points);
                quadrilateralScore = clamp(rectangularity * 0.92, 25, 78);
            }

            if (!points) {
                return;
            }

            const topWidth = distanceBetweenPoints(ordered.tl, ordered.tr);
            const bottomWidth = distanceBetweenPoints(ordered.bl, ordered.br);
            const leftHeight = distanceBetweenPoints(ordered.tl, ordered.bl);
            const rightHeight = distanceBetweenPoints(ordered.tr, ordered.br);

            const detectedWidth = Math.max(topWidth, bottomWidth, rect.width);
            const detectedHeight = Math.max(leftHeight, rightHeight, rect.height);
            const detectedAspect = Math.max(detectedWidth, detectedHeight) / Math.max(1, Math.min(detectedWidth, detectedHeight));

            const aspectDiff = Math.abs(detectedAspect - profile.aspectRatio) / profile.aspectRatio;
            const ratioScore = clamp(100 - aspectDiff * 150, 0, 100);

            const widthRatio = rect.width / canvas.width;
            const heightRatio = rect.height / canvas.height;
            const centerXRatio = (rect.x + rect.width / 2) / canvas.width;
            const centerYRatio = (rect.y + rect.height / 2) / canvas.height;

            const tooFar = widthRatio < profile.targetMinWidthRatio;
            const tooClose = widthRatio > profile.targetMaxWidthRatio;

            let sizeScore = 100;
            if (tooFar) {
                sizeScore = clamp((widthRatio / profile.targetMinWidthRatio) * 100, 0, 100);
            } else if (tooClose) {
                sizeScore = clamp(100 - ((widthRatio - profile.targetMaxWidthRatio) / 0.20) * 100, 0, 100);
            }

            const centralityScore = clamp(
                100 - (Math.abs(centerXRatio - 0.5) * 145 + Math.abs(centerYRatio - 0.5) * 132),
                0,
                100
            );

            const quality = getOpenCvMatQuality(src, rect);

            const confidence = clamp(
                ratioScore * 0.24 +
                sizeScore * 0.18 +
                centralityScore * 0.16 +
                quadrilateralScore * 0.20 +
                quality.sharpnessScore * 0.10 +
                quality.brightnessScore * 0.12,
                0,
                100
            );

            const candidate = {
                found: confidence >= 34,
                confidence,
                sourceLabel,
                ratioScore,
                sizeScore,
                centralityScore,
                quadrilateralScore,
                rectangularity,
                brightnessScore: quality.brightnessScore,
                sharpnessScore: quality.sharpnessScore,
                widthRatio,
                heightRatio,
                centerXRatio,
                centerYRatio,
                tooFar,
                tooClose,
                points,
                ordered,
                sampleWidth: canvas.width,
                sampleHeight: canvas.height,
                rect,
                areaRatio: area / frameArea,
                detectedAspect
            };

            if (!best || candidate.confidence > best.confidence) {
                best = candidate;
            }
        } finally {
            approx.delete();
        }
    }

    function scanContours(processedMat, sourceLabel) {
        const localContours = new cv.MatVector();
        const localHierarchy = new cv.Mat();

        try {
            cv.findContours(processedMat, localContours, localHierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

            for (let i = 0; i < localContours.size(); i++) {
                const contour = localContours.get(i);
                try {
                    evaluateContour(contour, sourceLabel);
                } finally {
                    contour.delete();
                }
            }
        } finally {
            localContours.delete();
            localHierarchy.delete();
        }
    }

    try {
        src = cv.imread(canvas);
        gray = new cv.Mat();
        equalized = new cv.Mat();
        blurred = new cv.Mat();
        edges = new cv.Mat();
        dilated = new cv.Mat();
        binary = new cv.Mat();
        adaptive = new cv.Mat();
        kernel = cv.Mat.ones(5, 5, cv.CV_8U);

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.equalizeHist(gray, equalized);
        cv.GaussianBlur(equalized, blurred, new cv.Size(5, 5), 0);

        // 1) Détection par contours : bonne quand les bords de la pièce sont visibles.
        cv.Canny(blurred, edges, 35, 130);
        cv.morphologyEx(edges, dilated, cv.MORPH_CLOSE, kernel);
        cv.dilate(dilated, dilated, kernel);
        scanContours(dilated, "EDGE_QUAD_OR_BOX");

        // 2) Détection par zones claires : utile pour pièces blanches/faiblement contrastées.
        cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel);
        scanContours(binary, "LIGHT_DOCUMENT_REGION");

        // 3) Détection locale adaptative : utile si l’éclairage est inégal.
        cv.adaptiveThreshold(gray, adaptive, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 7);
        cv.morphologyEx(adaptive, adaptive, cv.MORPH_CLOSE, kernel);
        scanContours(adaptive, "ADAPTIVE_DOCUMENT_REGION");

        if (!best) {
            return {found: false, confidence: 0, reason: "NO_DOCUMENT_CANDIDATE"};
        }

        return best;
    } finally {
        if (src) src.delete();
        if (gray) gray.delete();
        if (equalized) equalized.delete();
        if (blurred) blurred.delete();
        if (edges) edges.delete();
        if (dilated) dilated.delete();
        if (binary) binary.delete();
        if (adaptive) adaptive.delete();
        if (kernel) kernel.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
    }
}

async function detectFacesUnified(video) {
    if (window.detectFacesWithMediaPipe) {
        try {
            const detections = await window.detectFacesWithMediaPipe(video);
            return (detections || []).map(detection => {
                const box = detection.boundingBox || {};
                const x = box.originX ?? box.x ?? box.left ?? 0;
                const y = box.originY ?? box.y ?? box.top ?? 0;
                const width = box.width ?? 0;
                const height = box.height ?? 0;
                const score = detection.categories && detection.categories[0]
                    ? detection.categories[0].score
                    : 0.8;

                return {x, y, width, height, score};
            });
        } catch (error) {
            console.warn("Détection visage MediaPipe échouée :", error);
        }
    }

    if (browserFaceDetector) {
        try {
            const faces = await browserFaceDetector.detect(video);
            return (faces || []).map(face => ({
                x: face.boundingBox.x,
                y: face.boundingBox.y,
                width: face.boundingBox.width,
                height: face.boundingBox.height,
                score: 0.75
            }));
        } catch (error) {
            return [];
        }
    }

    return [];
}

function overlapRatio(boxA, boxB) {
    const x1 = Math.max(boxA.x, boxB.x);
    const y1 = Math.max(boxA.y, boxB.y);
    const x2 = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const y2 = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    if (x2 <= x1 || y2 <= y1) {
        return 0;
    }

    const inter = (x2 - x1) * (y2 - y1);
    const areaA = boxA.width * boxA.height;
    return areaA ? (inter / areaA) * 100 : 0;
}

async function detectFaceOverlapInOpenCvDocument(video, detectedDocument) {
    const faces = await detectFacesUnified(video);

    if (!detectedDocument || !detectedDocument.rect) {
        return {faceDetected: faces.length > 0, overlapScore: 0};
    }

    const scaleX = video.videoWidth / detectedDocument.sampleWidth;
    const scaleY = video.videoHeight / detectedDocument.sampleHeight;

    const docBox = {
        x: detectedDocument.rect.x * scaleX,
        y: detectedDocument.rect.y * scaleY,
        width: detectedDocument.rect.width * scaleX,
        height: detectedDocument.rect.height * scaleY
    };

    let maxOverlap = 0;
    faces.forEach(face => {
        maxOverlap = Math.max(maxOverlap, overlapRatio(face, docBox));
    });

    return {
        faceDetected: faces.length > 0,
        overlapScore: maxOverlap,
        faces
    };
}

function getOpenCvFramePaddingFactor(detection, profile) {
    // V9 : marge volontairement plus large.
    // En conditions réelles, OpenCV détecte souvent les textes, la photo ou une zone interne,
    // pas toujours le bord extérieur exact de la pièce. On transforme donc la détection en
    // zone de cadrage bancaire avec marge de sécurité.
    let padding = profile.key === "passport" ? 1.30 : 1.58;

    if (detection) {
        const widthRatio = detection.widthRatio || 0;
        const heightRatio = detection.heightRatio || 0;

        if ((detection.quadrilateralScore || 0) < 85) {
            padding += 0.16;
        }

        if ((detection.rectangularity || 0) < 70) {
            padding += 0.12;
        }

        // Si la pièce est encore petite dans la caméra, la détection concerne souvent
        // seulement le contenu intérieur. On élargit fortement le cadre.
        if (widthRatio < 0.28 || heightRatio < 0.20) {
            padding += 0.38;
        } else if (widthRatio < 0.38 || heightRatio < 0.27) {
            padding += 0.24;
        } else if (widthRatio < 0.48 || heightRatio < 0.34) {
            padding += 0.14;
        }

        if ((detection.densityScore || 0) < 45) {
            padding += 0.10;
        }
    }

    return clamp(padding, profile.key === "passport" ? 1.22 : 1.42, profile.key === "passport" ? 1.78 : 2.25);
}

function smoothDocumentFrame(nextFrame, detectionFound) {
    if (!adaptiveDocumentFrame || !adaptiveFrameInitialized) {
        adaptiveDocumentFrame = nextFrame;
        adaptiveFrameInitialized = true;
        return adaptiveDocumentFrame;
    }

    // V9 : suivi plus naturel.
    // Le cadre se déplace assez vite vers la pièce, s’agrandit vite quand nécessaire,
    // mais rétrécit lentement pour éviter de couper les bords.
    const moveSmoothing = detectionFound ? 0.46 : 0.12;
    const expandSmoothing = detectionFound ? 0.62 : 0.12;
    const shrinkSmoothing = detectionFound ? 0.14 : 0.08;

    const widthSmoothing = nextFrame.widthRatio >= adaptiveDocumentFrame.widthRatio
        ? expandSmoothing
        : shrinkSmoothing;

    const heightSmoothing = nextFrame.heightRatio >= adaptiveDocumentFrame.heightRatio
        ? expandSmoothing
        : shrinkSmoothing;

    adaptiveDocumentFrame = {
        ...nextFrame,
        centerXRatio: adaptiveDocumentFrame.centerXRatio * (1 - moveSmoothing) + nextFrame.centerXRatio * moveSmoothing,
        centerYRatio: adaptiveDocumentFrame.centerYRatio * (1 - moveSmoothing) + nextFrame.centerYRatio * moveSmoothing,
        widthRatio: adaptiveDocumentFrame.widthRatio * (1 - widthSmoothing) + nextFrame.widthRatio * widthSmoothing,
        heightRatio: adaptiveDocumentFrame.heightRatio * (1 - heightSmoothing) + nextFrame.heightRatio * heightSmoothing
    };

    return adaptiveDocumentFrame;
}

function applyOpenCvDocumentFrame(profile, detection) {
    if (!detection || !detection.found) {
        const fallback = getDefaultAdaptiveDocumentFrame(profile);
        fallback.detected = false;
        fallback.confidence = detection ? detection.confidence || 0 : 0;
        const smoothedFallback = smoothDocumentFrame(fallback, false);
        applyDocumentFrameToDom(profile, smoothedFallback);
        return;
    }

    const padding = getOpenCvFramePaddingFactor(detection, profile);

    // V9 : le cadre doit englober toute la pièce. On part donc à la fois
    // de la largeur détectée ET de la hauteur détectée, puis on impose le ratio officiel.
    const widthFromWidth = detection.widthRatio * padding;
    const widthFromHeight = detection.heightRatio * profile.aspectRatio * padding;
    const paddedWidthRatio = Math.max(widthFromWidth, widthFromHeight);
    const paddedHeightRatio = paddedWidthRatio / profile.aspectRatio;

    const frameState = {
        centerXRatio: clamp(detection.centerXRatio, 0.10, 0.90),
        centerYRatio: clamp(detection.centerYRatio, 0.14, 0.86),
        widthRatio: clamp(paddedWidthRatio, profile.minWidthRatio, profile.maxWidthRatio),
        heightRatio: clamp(paddedHeightRatio, 0.18, 0.86),
        detected: true,
        confidence: detection.confidence,
        tooClose: detection.tooClose,
        tooFar: detection.tooFar,
        ratioScore: detection.ratioScore,
        borderScore: detection.confidence,
        padding
    };

    const smoothedFrame = smoothDocumentFrame(frameState, true);
    applyDocumentFrameToDom(profile, smoothedFrame);
}

function buildOpenCvDocumentSignature(detection) {
    if (!detection || !detection.points) {
        return 0;
    }

    return Math.round(
        detection.points.reduce((total, point) => total + point.x * 7 + point.y * 11, 0)
    );
}

async function openDocumentCamera() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("documentVideo");
    const errorBox = document.getElementById("cameraError");

    const profile = getDocumentCaptureProfile();
    adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
    adaptiveFrameInitialized = true;
    applyDocumentFrameToDom(profile, adaptiveDocumentFrame);

    errorBox.innerHTML = "";
    currentDocumentSide = "recto";
    documentGoodFrameCount = 0;
    documentPreviousFrameSignature = null;
    lastDocumentCheck = null;
    lastOpenCvDocument = null;

    updateSideIndicator();
    setSmartMessage("documentQualityMessage", "Chargement OpenCV / MediaPipe. Placez la pièce devant la caméra, sur un fond contrasté.", "");

    await waitForOpenCv();
    await waitForMediaPipeFaceDetector();

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {ideal: "environment"},
                width: {ideal: 1920},
                height: {ideal: 1080}
            },
            audio: false
        });

        video.srcObject = cameraStream;
        modal.style.display = "block";

        video.onloadedmetadata = function () {
            startDocumentSmartCapture();
        };
    } catch (error) {
        errorBox.innerHTML = `
            Caméra indisponible ou permission refusée.
            <button type="button" onclick="openIdentityImport()">Importer une photo</button>
        `;
        modal.style.display = "block";
    }
}

function startDocumentSmartCapture() {
    stopDocumentSmartCapture();

    documentSmartInterval = setInterval(async function () {
        const video = document.getElementById("documentVideo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            return;
        }

        if (!window.cv || !cv.Mat) {
            setSmartMessage("documentQualityMessage", "OpenCV charge encore. Patientez quelques secondes ou utilisez Importer.", "bad");
            return;
        }

        const profile = getDocumentCaptureProfile();
        const detection = detectDocumentWithOpenCv(video, profile);
        applyOpenCvDocumentFrame(profile, detection);

        const faceCheck = await detectFaceOverlapInOpenCvDocument(video, detection);
        const signature = buildOpenCvDocumentSignature(detection);
        const stabilityScore = computeStabilityScore(signature, documentPreviousFrameSignature);
        documentPreviousFrameSignature = signature;

        const faceBlocksDocument = faceCheck.faceDetected && faceCheck.overlapScore >= 12;
        const tooFar = detection.tooFar || detection.widthRatio < profile.targetMinWidthRatio;
        const tooClose = detection.tooClose || detection.widthRatio > profile.targetMaxWidthRatio;
        const aspectBad = (detection.ratioScore || 0) < 62;

        const valid =
            detection.found &&
            detection.confidence >= 68 &&
            !faceBlocksDocument &&
            !tooFar &&
            !tooClose &&
            !aspectBad &&
            detection.sharpnessScore >= 38 &&
            detection.brightnessScore >= 48 &&
            stabilityScore >= 68;

        lastOpenCvDocument = detection;
        lastDocumentCheck = {
            valid,
            openCvDocument: detection,
            adaptiveDetection: detection,
            faceCheck,
            faceBlocksDocument,
            tooFar,
            tooClose,
            aspectBad,
            stabilityScore,
            metrics: {
                documentPresenceScore: detection.confidence || 0,
                rectangularScore: detection.ratioScore || 0,
                sharpnessScore: detection.sharpnessScore || 0,
                brightnessScore: detection.brightnessScore || 0
            }
        };

        setProgress("documentPresenceBar", detection.confidence || 0);
        setProgress("documentSharpnessBar", detection.sharpnessScore || 0);
        setProgress("documentBrightnessBar", detection.brightnessScore || 0);
        setProgress("documentStabilityBar", stabilityScore);

        if (valid) {
            documentGoodFrameCount += 1;
            setSmartMessage("documentQualityMessage", `OpenCV : pièce détectée, cadre stabilisé avec marge. Capture automatique dans ${Math.max(1, 4 - documentGoodFrameCount)}...`, "good");
        } else {
            documentGoodFrameCount = 0;

            if (!detection.found || detection.confidence < 45) {
                setSmartMessage("documentQualityMessage", "OpenCV : pièce non détectée. Placez la pièce plus près, seule dans l’image, avec un fond contrasté.", "bad");
            } else if (faceBlocksDocument) {
                setSmartMessage("documentQualityMessage", "MediaPipe : visage détecté dans la zone pièce. En mode pièce, éloignez le visage et présentez uniquement le document.", "bad");
            } else if (tooFar) {
                setSmartMessage("documentQualityMessage", "Pièce trop éloignée : rapprochez-la. Le cadre va s’agrandir autour du document détecté.", "bad");
            } else if (tooClose) {
                setSmartMessage("documentQualityMessage", "Pièce trop proche : éloignez-la légèrement pour que les 4 coins soient visibles.", "bad");
            } else if (aspectBad) {
                setSmartMessage("documentQualityMessage", `Format détecté non conforme au type choisi (${profile.label}). Tournez ou alignez la pièce.`, "bad");
            } else if ((detection.brightnessScore || 0) < 48) {
                setSmartMessage("documentQualityMessage", "Luminosité/reflet insuffisant : ajustez l’éclairage.", "bad");
            } else if ((detection.sharpnessScore || 0) < 38) {
                setSmartMessage("documentQualityMessage", "Image floue : stabilisez la caméra.", "bad");
            } else if (stabilityScore < 68) {
                setSmartMessage("documentQualityMessage", "Restez stable : OpenCV attend une image fixe avant de capturer.", "bad");
            } else {
                setSmartMessage("documentQualityMessage", "Ajustement OpenCV en cours. Gardez la pièce entière dans le cadre.", "");
            }
        }

        if (documentGoodFrameCount >= 4) {
            captureDocumentSide({auto: true});
            documentGoodFrameCount = 0;
        }
    }, 360);
}

function expandQuadAroundCenter(ordered, expansion, maxWidth, maxHeight) {
    const points = [ordered.tl, ordered.tr, ordered.br, ordered.bl];
    const centerX = points.reduce((total, point) => total + point.x, 0) / 4;
    const centerY = points.reduce((total, point) => total + point.y, 0) / 4;

    const expanded = points.map(point => ({
        x: clamp(centerX + (point.x - centerX) * expansion, 0, maxWidth - 1),
        y: clamp(centerY + (point.y - centerY) * expansion, 0, maxHeight - 1)
    }));

    return {
        tl: expanded[0],
        tr: expanded[1],
        br: expanded[2],
        bl: expanded[3]
    };
}

function captureDocumentSide(options = {}) {
    const video = document.getElementById("documentVideo");
    const canvas = document.getElementById("documentCanvas");
    const profile = getDocumentCaptureProfile();

    if (!video.videoWidth || !video.videoHeight) {
        return;
    }

    if (!lastDocumentCheck || !lastDocumentCheck.valid || !lastDocumentCheck.openCvDocument || !lastDocumentCheck.openCvDocument.points) {
        let message = "Capture bloquée : OpenCV n’a pas encore détecté correctement la pièce.";

        if (lastDocumentCheck) {
            if (lastDocumentCheck.faceBlocksDocument) {
                message = "Capture bloquée : MediaPipe détecte un visage dans la zone pièce.";
            } else if (lastDocumentCheck.tooFar) {
                message = "Capture bloquée : la pièce est trop éloignée.";
            } else if (lastDocumentCheck.tooClose) {
                message = "Capture bloquée : la pièce est trop proche.";
            } else if (lastDocumentCheck.aspectBad) {
                message = "Capture bloquée : le format détecté ne correspond pas au type de pièce choisi.";
            }
        }

        setSmartMessage("documentQualityMessage", message, "bad");
        return;
    }

    if (!window.cv || !cv.Mat) {
        setSmartMessage("documentQualityMessage", "Capture bloquée : OpenCV n’est pas prêt.", "bad");
        return;
    }

    const detection = lastDocumentCheck.openCvDocument;
    const ordered = orderQuadPoints(detection.points);
    const expansion = getOpenCvFramePaddingFactor(detection, profile);
    const expandedOrdered = expandQuadAroundCenter(
        ordered,
        expansion,
        detection.sampleWidth,
        detection.sampleHeight
    );
    const scaleX = video.videoWidth / detection.sampleWidth;
    const scaleY = video.videoHeight / detection.sampleHeight;

    const srcPoints = [expandedOrdered.tl, expandedOrdered.tr, expandedOrdered.br, expandedOrdered.bl].map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY
    }));

    const outputWidth = profile.key === "passport" ? 1250 : 1050;
    const outputHeight = Math.round(outputWidth / profile.aspectRatio);

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = video.videoWidth;
    sourceCanvas.height = video.videoHeight;
    sourceCanvas.getContext("2d").drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);

    let src = null;
    let dst = null;
    let srcTri = null;
    let dstTri = null;
    let transform = null;

    try {
        src = cv.imread(sourceCanvas);
        dst = new cv.Mat();
        srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            srcPoints[0].x, srcPoints[0].y,
            srcPoints[1].x, srcPoints[1].y,
            srcPoints[2].x, srcPoints[2].y,
            srcPoints[3].x, srcPoints[3].y
        ]);
        dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            outputWidth - 1, 0,
            outputWidth - 1, outputHeight - 1,
            0, outputHeight - 1
        ]);

        transform = cv.getPerspectiveTransform(srcTri, dstTri);
        cv.warpPerspective(
            src,
            dst,
            transform,
            new cv.Size(outputWidth, outputHeight),
            cv.INTER_LINEAR,
            cv.BORDER_CONSTANT,
            new cv.Scalar()
        );

        canvas.width = outputWidth;
        canvas.height = outputHeight;
        cv.imshow(canvas, dst);
    } finally {
        if (src) src.delete();
        if (dst) dst.delete();
        if (srcTri) srcTri.delete();
        if (dstTri) dstTri.delete();
        if (transform) transform.delete();
    }

    canvas.toBlob(function (blob) {
        if (!blob) {
            return;
        }

        const fileName = currentDocumentSide === "recto" ? "piece_recto.jpg" : "piece_verso.jpg";
        const file = new File([blob], fileName, {type: "image/jpeg"});

        if (currentDocumentSide === "recto") {
            identityDocumentFiles.recto = file;

            if (documentNeedsBackSide()) {
                currentDocumentSide = "verso";
                documentGoodFrameCount = 0;
                documentPreviousFrameSignature = null;
                lastDocumentCheck = null;
                lastOpenCvDocument = null;

                adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
                adaptiveFrameInitialized = true;
                applyDocumentFrameToDom(profile, adaptiveDocumentFrame);

                updateSideIndicator();
                updateIdentityCaptureStatus();
                setSmartMessage("documentQualityMessage", "Recto capturé par OpenCV. Retournez la pièce : OpenCV va détecter le verso.", "good");
                return;
            }
        } else {
            identityDocumentFiles.verso = file;
        }

        closeDocumentCamera();
        updateIdentityCaptureStatus();
    }, "image/jpeg", 0.94);
}

function getSelfieFaceScoreFromBox(video, box) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const expectedX = video.videoWidth / 2;
    const expectedY = video.videoHeight / 2;

    const distanceX = Math.abs(centerX - expectedX) / expectedX;
    const distanceY = Math.abs(centerY - expectedY) / expectedY;
    const sizeRatio = box.height / video.videoHeight;

    const centerScore = 100 - ((distanceX + distanceY) * 85);
    const sizeScore = 100 - Math.abs(sizeRatio - 0.48) * 170;

    return clamp((centerScore + sizeScore) / 2, 0, 100);
}

function startSelfieSmartCapture() {
    stopSelfieSmartCapture();

    selfieSmartInterval = setInterval(async function () {
        const video = document.getElementById("selfieVideo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            return;
        }

        const metrics = getVideoFrameMetrics(video, 180, 180);
        const stabilityScore = computeStabilityScore(metrics.signature, selfiePreviousFrameSignature);
        selfiePreviousFrameSignature = metrics.signature;

        const faces = await detectFacesUnified(video);
        let faceScore = 0;

        if (faces.length > 0) {
            const bestFace = faces.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
            faceScore = getSelfieFaceScoreFromBox(video, bestFace);
        }

        setProgress("selfieFaceBar", faceScore);
        setProgress("selfieSharpnessBar", metrics.sharpnessScore);
        setProgress("selfieBrightnessBar", metrics.brightnessScore);
        setProgress("selfieStabilityBar", stabilityScore);

        const isGood =
            faceScore >= 65 &&
            metrics.sharpnessScore >= 35 &&
            metrics.brightnessScore >= 55 &&
            stabilityScore >= 70;

        if (isGood) {
            selfieGoodFrameCount += 1;
            setSmartMessage("selfieQualityMessage", `MediaPipe : visage bien cadré. Capture automatique dans ${Math.max(1, 4 - selfieGoodFrameCount)}...`, "good");
        } else {
            selfieGoodFrameCount = 0;

            if (faces.length === 0) {
                setSmartMessage("selfieQualityMessage", "MediaPipe : aucun visage détecté. Placez votre visage dans le cadre ovale.", "bad");
            } else if (faceScore < 65) {
                setSmartMessage("selfieQualityMessage", "MediaPipe : visage mal cadré. Centrez le visage et ajustez la distance.", "bad");
            } else if (metrics.brightnessScore < 55) {
                setSmartMessage("selfieQualityMessage", "Visage trop sombre ou trop éclairé.", "bad");
            } else if (metrics.sharpnessScore < 35) {
                setSmartMessage("selfieQualityMessage", "Selfie flou. Stabilisez la caméra.", "bad");
            } else if (stabilityScore < 70) {
                setSmartMessage("selfieQualityMessage", "Restez stable quelques secondes.", "bad");
            }
        }

        if (selfieGoodFrameCount >= 4) {
            captureSelfiePhoto();
            selfieGoodFrameCount = 0;
        }
    }, 420);
}


/* ==========================================================
   V9 - Détection documentaire renforcée pour déploiement démo
   - OpenCV contour réel + fallback par zone claire
   - marge de sécurité pour éviter un cadre plus petit que la pièce
   - stabilisation temporelle pour éviter les tremblements
   - capture automatique uniquement après détection stable
   ========================================================== */
window.__documentFrameHistoryV9 = window.__documentFrameHistoryV9 || [];
window.__lastStableDocumentFrameV9 = window.__lastStableDocumentFrameV9 || null;
window.__lastDocumentDetectionV9 = window.__lastDocumentDetectionV9 || null;

function getDocumentCaptureProfile() {
    const type = getSelectedDocumentType();

    if (type === "Passeport") {
        return {
            key: "passport",
            label: "Passeport",
            frameClass: "passport-frame",
            aspectRatio: 1.42,
            defaultWidthRatio: 0.76,
            minWidthRatio: 0.42,
            maxWidthRatio: 0.92,
            targetMinWidthRatio: 0.40,
            targetMaxWidthRatio: 0.88,
            safetyExpansion: 1.24,
            minAcceptedRawWidth: 0.24,
            maxAcceptedRawWidth: 0.88,
            instruction: "Ouvrez le passeport sur la page d’identité. Gardez les 4 bords visibles ; le cadre suivra la page détectée."
        };
    }

    if (type === "Titre de séjour") {
        return {
            key: "residence",
            label: "Titre de séjour",
            frameClass: "residence-frame",
            aspectRatio: 1.586,
            defaultWidthRatio: 0.72,
            minWidthRatio: 0.36,
            maxWidthRatio: 0.88,
            targetMinWidthRatio: 0.36,
            targetMaxWidthRatio: 0.84,
            safetyExpansion: 1.34,
            minAcceptedRawWidth: 0.20,
            maxAcceptedRawWidth: 0.86,
            instruction: "Présentez le titre de séjour seul, sur fond contrasté. Le cadre s’ajustera aux bords extérieurs détectés."
        };
    }

    return {
        key: "card",
        label: type || "Carte d’identité",
        frameClass: "card-frame",
        aspectRatio: 1.586,
        defaultWidthRatio: 0.70,
        minWidthRatio: 0.34,
        maxWidthRatio: 0.88,
        targetMinWidthRatio: 0.34,
        targetMaxWidthRatio: 0.84,
        safetyExpansion: 1.38,
        minAcceptedRawWidth: 0.18,
        maxAcceptedRawWidth: 0.86,
        instruction: "Présentez la carte entière. Le cadre doit rester légèrement plus grand que la pièce pour ne pas couper les coins."
    };
}

function getDefaultAdaptiveDocumentFrame(profile) {
    const widthRatio = profile.defaultWidthRatio;
    const heightRatio = widthRatio / profile.aspectRatio;

    return {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        widthRatio,
        heightRatio,
        detected: false,
        confidence: 0,
        tooClose: false,
        tooFar: false,
        ratioScore: 0,
        borderScore: 0,
        source: "default"
    };
}

function normalizeBoxToAspect(box, expectedAspect, sampleWidth, sampleHeight, expansion = 1.30) {
    let centerX = (box.x1 + box.x2) / 2;
    let centerY = (box.y1 + box.y2) / 2;
    let width = Math.max(1, box.x2 - box.x1);
    let height = Math.max(1, box.y2 - box.y1);

    width *= expansion;
    height *= expansion;

    const currentAspect = width / Math.max(1, height);

    if (currentAspect < expectedAspect) {
        width = height * expectedAspect;
    } else {
        height = width / expectedAspect;
    }

    const maxWidth = sampleWidth * 0.94;
    const maxHeight = sampleHeight * 0.90;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / expectedAspect;
    }

    if (height > maxHeight) {
        height = maxHeight;
        width = height * expectedAspect;
    }

    centerX = clamp(centerX, width / 2, sampleWidth - width / 2);
    centerY = clamp(centerY, height / 2, sampleHeight - height / 2);

    return {
        x1: centerX - width / 2,
        y1: centerY - height / 2,
        x2: centerX + width / 2,
        y2: centerY + height / 2,
        width,
        height,
        centerX,
        centerY,
        aspect: width / Math.max(1, height)
    };
}

function rectToDetectionCandidate(rect, profile, sampleWidth, sampleHeight, source, extraScore = 0) {
    const rawWidthRatio = rect.width / sampleWidth;
    const rawHeightRatio = rect.height / sampleHeight;
    const rawAspect = rect.width / Math.max(1, rect.height);

    const aspectDiff = Math.abs(rawAspect - profile.aspectRatio) / profile.aspectRatio;
    const ratioScore = clamp(100 - aspectDiff * 145, 0, 100);

    const areaRatio = (rect.width * rect.height) / (sampleWidth * sampleHeight);
    const sizeScore = clamp(100 - Math.abs(rawWidthRatio - 0.54) * 115, 0, 100);

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const centralityScore = clamp(
        100 -
        Math.abs(centerX / sampleWidth - 0.5) * 95 -
        Math.abs(centerY / sampleHeight - 0.5) * 95,
        0,
        100
    );

    const confidence = clamp(
        ratioScore * 0.34 +
        sizeScore * 0.24 +
        centralityScore * 0.20 +
        clamp(areaRatio * 360, 0, 100) * 0.14 +
        extraScore * 0.08,
        0,
        100
    );

    const expanded = normalizeBoxToAspect(
        {x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height},
        profile.aspectRatio,
        sampleWidth,
        sampleHeight,
        profile.safetyExpansion
    );

    // Le cadre DOM ne doit jamais être plus petit que le seuil minimum attendu,
    // sinon il finit par cadrer uniquement la photo/le texte imprimé sur la pièce.
    let widthRatio = Math.max(expanded.width / sampleWidth, profile.targetMinWidthRatio);
    widthRatio = clamp(widthRatio, profile.minWidthRatio, profile.maxWidthRatio);
    let heightRatio = widthRatio / profile.aspectRatio;

    if (heightRatio > 0.88) {
        heightRatio = 0.88;
        widthRatio = heightRatio * profile.aspectRatio;
    }

    return {
        found: true,
        source,
        confidence,
        ratioScore,
        sizeScore,
        centralityScore,
        rawWidthRatio,
        rawHeightRatio,
        rawAspect,
        areaRatio,
        widthRatio,
        heightRatio,
        centerXRatio: expanded.centerX / sampleWidth,
        centerYRatio: expanded.centerY / sampleHeight,
        tooFar: rawWidthRatio < profile.minAcceptedRawWidth,
        tooClose: rawWidthRatio > profile.maxAcceptedRawWidth,
        sampleWidth,
        sampleHeight
    };
}

function chooseBestDocumentCandidate(candidates) {
    if (!candidates || candidates.length === 0) {
        return null;
    }

    return candidates.sort((a, b) => b.confidence - a.confidence)[0];
}

function estimateDocumentBoxWithOpenCvV9(canvas, profile) {
    if (!window.cv || !cv.Mat || !cv.findContours) {
        return null;
    }

    const sampleWidth = canvas.width;
    const sampleHeight = canvas.height;
    let src = null;
    let gray = null;
    let blurred = null;
    let edges = null;
    let kernel = null;
    let contours = null;
    let hierarchy = null;
    let thresh = null;

    const candidates = [];

    try {
        src = cv.imread(canvas);
        gray = new cv.Mat();
        blurred = new cv.Mat();
        edges = new cv.Mat();
        kernel = cv.Mat.ones(5, 5, cv.CV_8U);
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        cv.Canny(blurred, edges, 45, 140, 3, false);
        cv.dilate(edges, edges, kernel, new cv.Point(-1, -1), 2);
        cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour, false);
            const frameArea = sampleWidth * sampleHeight;

            if (area < frameArea * 0.010 || area > frameArea * 0.78) {
                contour.delete();
                continue;
            }

            const rect = cv.boundingRect(contour);
            const rectArea = rect.width * rect.height;
            const rectangularity = area / Math.max(1, rectArea);

            if (rect.width < sampleWidth * 0.12 || rect.height < sampleHeight * 0.10) {
                contour.delete();
                continue;
            }

            const extraScore = clamp(rectangularity * 100, 0, 100);
            const candidate = rectToDetectionCandidate(rect, profile, sampleWidth, sampleHeight, "opencv-edge", extraScore);

            // On ne garde pas les longs traits ou les contours parasites.
            if (candidate.ratioScore >= 36 && rectangularity >= 0.18) {
                candidates.push(candidate);
            }

            contour.delete();
        }

        // Fallback Otsu : utile quand la pièce est claire sur fond sombre ou irrégulier.
        thresh = new cv.Mat();
        cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        contours.delete();
        hierarchy.delete();
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour, false);
            const frameArea = sampleWidth * sampleHeight;

            if (area < frameArea * 0.012 || area > frameArea * 0.72) {
                contour.delete();
                continue;
            }

            const rect = cv.boundingRect(contour);
            const candidate = rectToDetectionCandidate(rect, profile, sampleWidth, sampleHeight, "opencv-otsu", 45);

            if (candidate.ratioScore >= 34) {
                candidates.push(candidate);
            }

            contour.delete();
        }

        return chooseBestDocumentCandidate(candidates);
    } catch (error) {
        console.warn("OpenCV V9 document detection error:", error);
        return null;
    } finally {
        [src, gray, blurred, edges, kernel, contours, hierarchy, thresh].forEach(item => {
            try {
                if (item && item.delete) {
                    item.delete();
                }
            } catch (e) {}
        });
    }
}

function estimateDocumentBoxByPixelCloudV9(canvas, profile) {
    const sampleWidth = canvas.width;
    const sampleHeight = canvas.height;
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    const xs = [];
    const ys = [];
    let totalEdge = 0;
    let count = 0;

    for (let y = 5; y < sampleHeight - 5; y += 3) {
        for (let x = 5; x < sampleWidth - 5; x += 3) {
            const gray = averageGray(data, sampleWidth, x, y);
            const gx = Math.abs(averageGray(data, sampleWidth, x + 3, y) - averageGray(data, sampleWidth, x - 3, y));
            const gy = Math.abs(averageGray(data, sampleWidth, x, y + 3) - averageGray(data, sampleWidth, x, y - 3));
            const edge = gx + gy;
            totalEdge += edge;
            count += 1;

            // On cherche des bords/textures de document, mais on évite le bruit sur les bords de la webcam.
            if (
                x > sampleWidth * 0.04 && x < sampleWidth * 0.96 &&
                y > sampleHeight * 0.06 && y < sampleHeight * 0.94 &&
                (edge > 46 || gray > 160)
            ) {
                xs.push(x);
                ys.push(y);
            }
        }
    }

    if (xs.length < 80) {
        return null;
    }

    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);

    const rawBox = {
        x: quantile(xs, 0.025),
        y: quantile(ys, 0.025),
        width: quantile(xs, 0.975) - quantile(xs, 0.025),
        height: quantile(ys, 0.975) - quantile(ys, 0.025)
    };

    if (rawBox.width <= 0 || rawBox.height <= 0) {
        return null;
    }

    const avgEdge = count ? totalEdge / count : 0;
    const candidate = rectToDetectionCandidate(rawBox, profile, sampleWidth, sampleHeight, "pixel-cloud", clamp(avgEdge * 2, 0, 100));

    if (candidate.ratioScore < 28 || candidate.confidence < 34) {
        return null;
    }

    return candidate;
}

function estimateAdaptiveDocumentBox(video, profile) {
    const sampleWidth = 480;
    const sampleHeight = Math.max(220, Math.round(sampleWidth * (video.videoHeight / video.videoWidth)));

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

    const openCvCandidate = estimateDocumentBoxWithOpenCvV9(canvas, profile);
    const fallbackCandidate = estimateDocumentBoxByPixelCloudV9(canvas, profile);
    const best = chooseBestDocumentCandidate([openCvCandidate, fallbackCandidate].filter(Boolean));

    if (!best) {
        return {
            found: false,
            confidence: 0,
            reason: "NO_DOCUMENT_BOX_V9",
            sampleWidth,
            sampleHeight
        };
    }

    return best;
}

function stableDocumentDetectionV9(detection) {
    const history = window.__documentFrameHistoryV9;

    if (!detection || !detection.found) {
        history.length = 0;
        return {
            stable: false,
            score: 0
        };
    }

    history.push({
        centerXRatio: detection.centerXRatio,
        centerYRatio: detection.centerYRatio,
        widthRatio: detection.widthRatio,
        heightRatio: detection.heightRatio,
        confidence: detection.confidence
    });

    while (history.length > 6) {
        history.shift();
    }

    if (history.length < 4) {
        return {
            stable: false,
            score: 30
        };
    }

    const avg = history.reduce((acc, item) => {
        acc.centerXRatio += item.centerXRatio;
        acc.centerYRatio += item.centerYRatio;
        acc.widthRatio += item.widthRatio;
        acc.heightRatio += item.heightRatio;
        acc.confidence += item.confidence;
        return acc;
    }, {centerXRatio: 0, centerYRatio: 0, widthRatio: 0, heightRatio: 0, confidence: 0});

    Object.keys(avg).forEach(key => avg[key] = avg[key] / history.length);

    let movement = 0;
    history.forEach(item => {
        movement += Math.abs(item.centerXRatio - avg.centerXRatio);
        movement += Math.abs(item.centerYRatio - avg.centerYRatio);
        movement += Math.abs(item.widthRatio - avg.widthRatio) * 0.7;
        movement += Math.abs(item.heightRatio - avg.heightRatio) * 0.7;
    });

    movement = movement / history.length;
    const score = clamp(100 - movement * 950, 0, 100);

    return {
        stable: score >= 76,
        score,
        avg
    };
}

function updateAdaptiveDocumentFrame(video, profile) {
    const detection = estimateAdaptiveDocumentBox(video, profile);
    window.__lastDocumentDetectionV9 = detection;

    const defaultFrame = getDefaultAdaptiveDocumentFrame(profile);

    let nextFrame;

    if (detection.found) {
        nextFrame = {
            centerXRatio: clamp(detection.centerXRatio, 0.16, 0.84),
            centerYRatio: clamp(detection.centerYRatio, 0.20, 0.80),
            widthRatio: clamp(detection.widthRatio, profile.minWidthRatio, profile.maxWidthRatio),
            heightRatio: clamp(detection.heightRatio, 0.18, 0.90),
            detected: detection.confidence >= 58,
            confidence: detection.confidence,
            tooClose: detection.tooClose,
            tooFar: detection.tooFar,
            ratioScore: detection.ratioScore,
            borderScore: detection.confidence,
            source: detection.source
        };
    } else {
        nextFrame = {
            ...defaultFrame,
            detected: false,
            confidence: 0,
            source: "searching"
        };
    }

    if (!adaptiveDocumentFrame || !adaptiveFrameInitialized) {
        adaptiveDocumentFrame = nextFrame;
        adaptiveFrameInitialized = true;
    } else {
        const stableInfo = stableDocumentDetectionV9(detection);
        const smoothing = detection.found
            ? (stableInfo.stable ? 0.30 : 0.18)
            : 0.08;

        adaptiveDocumentFrame = {
            ...nextFrame,
            centerXRatio: adaptiveDocumentFrame.centerXRatio * (1 - smoothing) + nextFrame.centerXRatio * smoothing,
            centerYRatio: adaptiveDocumentFrame.centerYRatio * (1 - smoothing) + nextFrame.centerYRatio * smoothing,
            widthRatio: adaptiveDocumentFrame.widthRatio * (1 - smoothing) + nextFrame.widthRatio * smoothing,
            heightRatio: adaptiveDocumentFrame.heightRatio * (1 - smoothing) + nextFrame.heightRatio * smoothing,
            confidence: detection.found ? detection.confidence : adaptiveDocumentFrame.confidence * 0.88,
            detected: detection.found && detection.confidence >= 58
        };
    }

    applyDocumentFrameToDom(profile, adaptiveDocumentFrame);

    return {
        ...detection,
        frame: adaptiveDocumentFrame,
        stabilityInfo: stableDocumentDetectionV9(detection)
    };
}

function isManualDocumentCaptureAllowedV9() {
    if (!lastDocumentCheck || !lastDocumentCheck.valid) {
        const message = lastDocumentCheck && lastDocumentCheck.adaptiveDetection
            ? `Capture refusée : ${lastDocumentCheck.adaptiveDetection.reason || "document pas encore correctement cadré"}.`
            : "Capture refusée : attendez que la pièce soit détectée dans le cadre.";

        setSmartMessage("documentQualityMessage", message, "bad");
        return false;
    }

    return true;
}

function startDocumentSmartCapture() {
    stopDocumentSmartCapture();

    documentSmartInterval = setInterval(async function () {
        const video = document.getElementById("documentVideo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            return;
        }

        const profile = getDocumentCaptureProfile();
        const adaptiveDetection = updateAdaptiveDocumentFrame(video, profile);
        const metrics = analyzeDocumentFrame(video);
        const faceCheck = await detectFaceOverlapInDocumentFrame(video, metrics.crop);
        const stabilityScore = computeStabilityScore(metrics.signature, documentPreviousFrameSignature);
        documentPreviousFrameSignature = metrics.signature;

        const detectionStable = adaptiveDetection.stabilityInfo ? adaptiveDetection.stabilityInfo.score : 0;
        const faceBlocksDocument = faceCheck.faceDetected && faceCheck.overlapScore >= 18;
        const tooFar = adaptiveDetection.tooFar || adaptiveDetection.rawWidthRatio < profile.minAcceptedRawWidth;
        const tooClose = adaptiveDetection.tooClose || adaptiveDetection.rawWidthRatio > profile.maxAcceptedRawWidth;
        const aspectBad = (adaptiveDetection.ratioScore || 0) < 44;

        const valid =
            adaptiveDetection.found &&
            !faceBlocksDocument &&
            !tooFar &&
            !tooClose &&
            !aspectBad &&
            adaptiveDetection.confidence >= 62 &&
            detectionStable >= 70 &&
            metrics.documentPresenceScore >= 56 &&
            metrics.sharpnessScore >= 32 &&
            metrics.brightnessScore >= 42 &&
            stabilityScore >= 58;

        lastDocumentCheck = {
            valid,
            metrics,
            stabilityScore,
            faceCheck,
            faceBlocksDocument,
            adaptiveDetection,
            tooFar,
            tooClose,
            aspectBad
        };

        setProgress("documentPresenceBar", Math.max(metrics.documentPresenceScore, adaptiveDetection.confidence || 0));
        setProgress("documentSharpnessBar", metrics.sharpnessScore);
        setProgress("documentBrightnessBar", metrics.brightnessScore);
        setProgress("documentStabilityBar", Math.min(stabilityScore, detectionStable));

        if (valid) {
            documentGoodFrameCount += 1;
            setSmartMessage(
                "documentQualityMessage",
                `${profile.label} détecté (${adaptiveDetection.source}). Cadre stabilisé. Capture automatique dans ${Math.max(1, 4 - documentGoodFrameCount)}...`,
                "good"
            );
        } else {
            documentGoodFrameCount = 0;

            if (!adaptiveDetection.found || adaptiveDetection.confidence < 34) {
                setSmartMessage("documentQualityMessage", "Aucune pièce exploitable détectée. Posez la pièce sur un fond contrasté et montrez ses 4 bords.", "bad");
            } else if (tooFar) {
                setSmartMessage("documentQualityMessage", "Pièce trop éloignée : rapprochez-la jusqu’à ce que le cadre suive toute la carte.", "bad");
            } else if (tooClose) {
                setSmartMessage("documentQualityMessage", "Pièce trop proche : reculez légèrement pour faire apparaître tous les bords.", "bad");
            } else if (aspectBad) {
                setSmartMessage("documentQualityMessage", `Format détecté incohérent avec ${profile.label}. Alignez la pièce horizontalement et gardez les coins visibles.`, "bad");
            } else if (faceBlocksDocument) {
                setSmartMessage("documentQualityMessage", "Visage dans la zone document. Décalez la pièce ou éloignez votre visage du cadre de la pièce.", "bad");
            } else if (detectionStable < 70) {
                setSmartMessage("documentQualityMessage", "Le cadre suit la pièce. Gardez-la stable quelques secondes pour valider la capture.", "bad");
            } else if (metrics.brightnessScore < 42) {
                setSmartMessage("documentQualityMessage", "Luminosité insuffisante ou reflet. Inclinez légèrement la pièce ou améliorez l’éclairage.", "bad");
            } else if (metrics.sharpnessScore < 32) {
                setSmartMessage("documentQualityMessage", "Image floue. Stabilisez la main ou rapprochez légèrement la pièce.", "bad");
            } else {
                setSmartMessage("documentQualityMessage", "Cadre en ajustement : la capture sera automatique quand toute la pièce sera stable dans le cadre.", "");
            }
        }

        if (documentGoodFrameCount >= 4) {
            captureDocumentSide({auto: true, force: true});
            documentGoodFrameCount = 0;
        }
    }, 360);
}

function captureDocumentSide(options = {}) {
    const video = document.getElementById("documentVideo");
    const canvas = document.getElementById("documentCanvas");

    if (!video.videoWidth || !video.videoHeight) {
        return;
    }

    if (!options.force && !isManualDocumentCaptureAllowedV9()) {
        return;
    }

    const crop = getDocumentCropArea(video);

    canvas.width = crop.width;
    canvas.height = crop.height;

    const context = canvas.getContext("2d");
    context.drawImage(
        video,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(function (blob) {
        if (!blob) {
            return;
        }

        const fileName = currentDocumentSide === "recto"
            ? "piece_recto.jpg"
            : "piece_verso.jpg";

        const file = new File([blob], fileName, {
            type: "image/jpeg"
        });

        if (currentDocumentSide === "recto") {
            identityDocumentFiles.recto = file;

            if (documentNeedsBackSide()) {
                currentDocumentSide = "verso";
                documentGoodFrameCount = 0;
                documentPreviousFrameSignature = null;
                window.__documentFrameHistoryV9.length = 0;

                const profile = getDocumentCaptureProfile();
                adaptiveDocumentFrame = getDefaultAdaptiveDocumentFrame(profile);
                adaptiveFrameInitialized = true;
                applyDocumentFrameToDom(profile, adaptiveDocumentFrame);
                updateSideIndicator();
                updateIdentityCaptureStatus();
                setSmartMessage("documentQualityMessage", "Recto capturé. Retournez la pièce : le cadre va à nouveau s’ajuster au verso.", "good");
                return;
            }
        } else {
            identityDocumentFiles.verso = file;
        }

        closeDocumentCamera();
        updateIdentityCaptureStatus();
    }, "image/jpeg", 0.92);
}




/* ==========================================================================
   V10 STABLE - Capture KYC inspirée de la machine à états du document MD
   - Pièce : cadre fixe adapté + détection dans le cadre + auto-capture stable
   - Selfie : FaceLandmarker si disponible + machine à états + auto-capture
   ========================================================================== */

const V10_DETECT_INTERVAL_MS = 90;
const V10_READY_FRAMES = 6;

// Selfie thresholds inspirés du document MD
const V10_FACE_FILL_MIN = 0.42;
const V10_FACE_FILL_MAX = 0.95;
const V10_FACE_CENTER_TOL = 0.18;
const V10_FACE_YAW_MAX = 0.24;
const V10_FACE_ROLL_MAX = 0.22;
const V10_FACE_BLUR_MIN = 18;
const V10_FACE_MOVE_MAX = 0.03;

// Document thresholds
const V10_DOCUMENT_BLUR_MIN = 55;
const V10_DOCUMENT_MOVE_MAX = 0.035;
const V10_DOCUMENT_MIN_AREA = 0.48;
const V10_DOCUMENT_MAX_AREA = 0.94;
const V10_DOCUMENT_MIN_PRESENCE = 62;
const V10_DOCUMENT_MIN_ASPECT_SCORE = 58;

let v10DocumentTimer = null;
let v10DocumentReadyFrames = 0;
let v10DocumentPreviousCenter = null;
let v10DocumentReadyForCapture = false;
let v10DocumentLastAnalysis = null;
let v10DocumentModeActive = false;

let v10SelfieTimer = null;
let v10SelfieReadyFrames = 0;
let v10SelfiePreviousCenter = null;
let v10SelfieReadyForCapture = false;
let v10SelfieModeActive = false;

function v10Clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function v10SetProgress(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = Math.round(v10Clamp(value || 0, 0, 100));
    }
}

function v10SetSmartMessage(id, message, state = "") {
    if (typeof setSmartMessage === "function") {
        setSmartMessage(id, message, state);
        return;
    }

    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.className = `smart-message ${state}`.trim();
    element.innerText = message;
}

function syncAllPhoneFields() {
    if (typeof syncPhoneFields === "function") {
        syncPhoneFields();
        return;
    }

    composePhoneNumber("phone_country", "phone_local", "phone");
    composePhoneNumber("contact1_country", "contact1_local", "contact_person_1_phone");
    composePhoneNumber("contact2_country", "contact2_local", "contact_person_2_phone");
}

function v10GetDocumentProfile() {
    const type = getSelectedDocumentType();

    if (type === "Passeport") {
        return {
            type,
            label: "Passeport",
            expectedAspect: 1.42,
            frameWidth: "76%",
            instruction: "Placez la page d’identité du passeport entière dans le cadre rouge."
        };
    }

    return {
        type,
        label: type || "Pièce",
        expectedAspect: 1.586,
        frameWidth: "84%",
        instruction: "Placez la pièce entière dans le cadre rouge. Les 4 bords doivent rester visibles."
    };
}

function v10ApplyDocumentFrameProfile() {
    const frame = document.querySelector("#cameraModal .document-frame");
    const profile = v10GetDocumentProfile();

    if (!frame) {
        return profile;
    }

    frame.classList.remove("passport-frame", "card-frame", "residence-frame", "detected", "too-close", "too-far");
    frame.classList.add(profile.type === "Passeport" ? "passport-frame" : "card-frame");
    frame.classList.add("searching");

    frame.style.setProperty("--document-frame-left", "50%");
    frame.style.setProperty("--document-frame-top", "50%");
    frame.style.setProperty("--document-frame-width", profile.frameWidth);
    frame.style.setProperty("--document-frame-height", "auto");
    frame.style.setProperty("--document-aspect-ratio", String(profile.expectedAspect));

    const instruction = document.getElementById("cameraInstruction");
    if (instruction) {
        instruction.innerText = profile.instruction;
    }

    return profile;
}

function v10SetDocumentFrameState(state) {
    const frame = document.querySelector("#cameraModal .document-frame");
    if (!frame) {
        return;
    }

    frame.classList.remove("searching", "detected", "too-close", "too-far");

    if (state === "ready") {
        frame.classList.add("detected");
    } else if (state === "too_close") {
        frame.classList.add("too-close");
    } else if (state === "too_small") {
        frame.classList.add("too-far");
    } else {
        frame.classList.add("searching");
    }
}

function v10ComputeVideoObjectFit(video) {
    const rect = video.getBoundingClientRect();
    const naturalW = video.videoWidth || 1;
    const naturalH = video.videoHeight || 1;

    const scale = Math.max(rect.width / naturalW, rect.height / naturalH);
    const renderedW = naturalW * scale;
    const renderedH = naturalH * scale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;

    return { rect, naturalW, naturalH, scale, renderedW, renderedH, offsetX, offsetY };
}

function v10GetFrameVideoCrop(video, frameElement) {
    const fit = v10ComputeVideoObjectFit(video);
    const frameRect = frameElement.getBoundingClientRect();

    const cssX = frameRect.left - fit.rect.left;
    const cssY = frameRect.top - fit.rect.top;

    let cropX = (cssX - fit.offsetX) / fit.scale;
    let cropY = (cssY - fit.offsetY) / fit.scale;
    let cropWidth = frameRect.width / fit.scale;
    let cropHeight = frameRect.height / fit.scale;

    cropX = v10Clamp(cropX, 0, fit.naturalW - 1);
    cropY = v10Clamp(cropY, 0, fit.naturalH - 1);
    cropWidth = v10Clamp(cropWidth, 1, fit.naturalW - cropX);
    cropHeight = v10Clamp(cropHeight, 1, fit.naturalH - cropY);

    return { cropX, cropY, cropWidth, cropHeight };
}

function v10DrawVideoCropToCanvas(video, crop, maxWidth = 640) {
    const canvas = document.createElement("canvas");
    const ratio = crop.cropWidth / crop.cropHeight;
    canvas.width = Math.min(maxWidth, Math.round(crop.cropWidth));
    canvas.height = Math.round(canvas.width / ratio);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(
        video,
        crop.cropX,
        crop.cropY,
        crop.cropWidth,
        crop.cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return canvas;
}

function v10ImageStats(canvas, blurMin = 50) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    let brightnessTotal = 0;
    let glarePixels = 0;
    let edgeTotal = 0;
    let lapTotal = 0;
    let lapSqTotal = 0;
    let count = 0;
    let signatureTotal = 0;

    function grayAt(x, y) {
        const idx = (y * w + x) * 4;
        return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const gray = grayAt(x, y);
            brightnessTotal += gray;

            if (gray >= 248) {
                glarePixels += 1;
            }

            const gx = Math.abs(gray - grayAt(x + 1, y));
            const gy = Math.abs(gray - grayAt(x, y + 1));
            edgeTotal += gx + gy;

            const lap =
                -4 * gray +
                grayAt(x - 1, y) +
                grayAt(x + 1, y) +
                grayAt(x, y - 1) +
                grayAt(x, y + 1);

            lapTotal += lap;
            lapSqTotal += lap * lap;
            count += 1;

            if (x % 16 === 0 && y % 16 === 0) {
                signatureTotal += gray;
            }
        }
    }

    const brightness = brightnessTotal / count;
    const glareFraction = glarePixels / count;
    const lapMean = lapTotal / count;
    const lapVariance = Math.max(0, (lapSqTotal / count) - lapMean * lapMean);

    const brightnessScore = v10Clamp(100 - Math.abs(brightness - 135) * 1.25, 0, 100);
    const sharpnessScore = v10Clamp((lapVariance / Math.max(1, blurMin)) * 100, 0, 100);
    const edgeScore = v10Clamp((edgeTotal / count) * 2.8, 0, 100);

    let clarityIssue = null;

    if (brightness < 55) {
        clarityIssue = "dark";
    } else if (glareFraction > 0.10) {
        clarityIssue = "glare";
    } else if (lapVariance < blurMin) {
        clarityIssue = "blurry";
    }

    return {
        brightness,
        brightnessScore,
        glareFraction,
        lapVariance,
        sharpnessScore,
        edgeScore,
        clarityIssue,
        signature: Math.round(signatureTotal)
    };
}

function v10Distance(a, b) {
    if (!a || !b) {
        return 1;
    }

    return Math.hypot(a.cx - b.cx, a.cy - b.cy);
}

function v10DocumentOpenCvDetection(canvas, expectedAspect) {
    if (!window.cv || !cv.Mat || !cv.imread) {
        return null;
    }

    let src = null;
    let gray = null;
    let blur = null;
    let edges = null;
    let closed = null;
    let kernel = null;
    let contours = null;
    let hierarchy = null;

    try {
        src = cv.imread(canvas);
        gray = new cv.Mat();
        blur = new cv.Mat();
        edges = new cv.Mat();
        closed = new cv.Mat();
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
        cv.Canny(blur, edges, 50, 150);

        kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(11, 11));
        cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
        cv.dilate(closed, closed, kernel);

        cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const W = canvas.width;
        const H = canvas.height;
        const frameArea = W * H;
        let best = null;

        for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const rect = cv.boundingRect(cnt);

            if (!rect || rect.width < 40 || rect.height < 30) {
                cnt.delete();
                continue;
            }

            const areaRatio = (rect.width * rect.height) / frameArea;
            const aspect = rect.width / rect.height;
            const aspectError = Math.abs(aspect - expectedAspect) / expectedAspect;
            const aspectScore = v10Clamp(100 - aspectError * 180, 0, 100);

            const centerX = (rect.x + rect.width / 2) / W;
            const centerY = (rect.y + rect.height / 2) / H;
            const centerScore = v10Clamp(100 - (Math.abs(centerX - 0.5) + Math.abs(centerY - 0.5)) * 130, 0, 100);

            const areaScore = areaRatio < V10_DOCUMENT_MIN_AREA
                ? v10Clamp((areaRatio / V10_DOCUMENT_MIN_AREA) * 100, 0, 100)
                : areaRatio > V10_DOCUMENT_MAX_AREA
                    ? v10Clamp(((1 - areaRatio) / (1 - V10_DOCUMENT_MAX_AREA)) * 100, 0, 100)
                    : 100;

            const score = (aspectScore * 0.38) + (areaScore * 0.42) + (centerScore * 0.20);

            if (!best || score > best.score) {
                best = {
                    score,
                    rect,
                    areaRatio,
                    aspect,
                    aspectScore,
                    centerScore,
                    areaScore,
                    cx: centerX,
                    cy: centerY
                };
            }

            cnt.delete();
        }

        return best;

    } catch (error) {
        console.warn("Détection document OpenCV indisponible :", error);
        return null;
    } finally {
        [src, gray, blur, edges, closed, kernel, contours, hierarchy].forEach(mat => {
            if (mat && typeof mat.delete === "function") {
                mat.delete();
            }
        });
    }
}

function v10DocumentFallbackDetection(canvas, expectedAspect, stats) {
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    function gray(x, y) {
        const idx = (y * W + x) * 4;
        return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }

    let borderEnergy = 0;
    let samples = 0;

    for (let x = 4; x < W - 4; x += 4) {
        borderEnergy += Math.abs(gray(x, Math.round(H * 0.07)) - gray(x, Math.round(H * 0.18)));
        borderEnergy += Math.abs(gray(x, Math.round(H * 0.93)) - gray(x, Math.round(H * 0.82)));
        samples += 2;
    }

    for (let y = 4; y < H - 4; y += 4) {
        borderEnergy += Math.abs(gray(Math.round(W * 0.07), y) - gray(Math.round(W * 0.18), y));
        borderEnergy += Math.abs(gray(Math.round(W * 0.93), y) - gray(Math.round(W * 0.82), y));
        samples += 2;
    }

    const borderScore = v10Clamp((borderEnergy / samples) * 5.5, 0, 100);
    const presenceScore = v10Clamp(borderScore * 0.7 + stats.edgeScore * 0.3, 0, 100);

    return {
        score: presenceScore,
        rect: { x: 0, y: 0, width: W, height: H },
        areaRatio: 0.70,
        aspect: expectedAspect,
        aspectScore: 70,
        centerScore: 70,
        areaScore: 70,
        cx: 0.5,
        cy: 0.5
    };
}

async function v10AnalyzeDocumentFrame() {
    const video = document.getElementById("documentVideo");
    const frame = document.querySelector("#cameraModal .document-frame");
    const profile = v10GetDocumentProfile();

    if (!video || !frame || !video.videoWidth || !video.videoHeight) {
        return null;
    }

    const crop = v10GetFrameVideoCrop(video, frame);
    const canvas = v10DrawVideoCropToCanvas(video, crop, 640);
    const stats = v10ImageStats(canvas, V10_DOCUMENT_BLUR_MIN);

    let detection = v10DocumentOpenCvDetection(canvas, profile.expectedAspect);

    if (!detection) {
        detection = v10DocumentFallbackDetection(canvas, profile.expectedAspect, stats);
    }

    const center = {
        cx: detection ? detection.cx : 0.5,
        cy: detection ? detection.cy : 0.5
    };

    const move = v10Distance(center, v10DocumentPreviousCenter);
    v10DocumentPreviousCenter = center;

    const stabilityScore = v10DocumentPreviousCenter ? v10Clamp(100 - (move / V10_DOCUMENT_MOVE_MAX) * 100, 0, 100) : 0;

    let faceBlocked = false;

    if (typeof window.detectFacesWithMediaPipe === "function") {
        try {
            const faces = await window.detectFacesWithMediaPipe(video);

            if (faces && faces.length > 0) {
                // Si un visage est détecté pendant la capture document, on évite les fausses captures webcam.
                faceBlocked = true;
            }
        } catch (error) {
            faceBlocked = false;
        }
    }

    const presenceScore = detection ? v10Clamp(detection.score, 0, 100) : 0;

    return {
        crop,
        canvas,
        stats,
        detection,
        presenceScore,
        areaRatio: detection ? detection.areaRatio : 0,
        aspectScore: detection ? detection.aspectScore : 0,
        stabilityScore,
        faceBlocked
    };
}

function v10DocumentStateMessage(analysis) {
    if (!analysis) {
        return { state: "none", ready: false, message: "Caméra en cours d’initialisation...", className: "" };
    }

    if (analysis.faceBlocked) {
        return { state: "face", ready: false, message: "Éloignez votre visage du cadre document. Présentez uniquement la pièce.", className: "bad" };
    }

    if (analysis.presenceScore < V10_DOCUMENT_MIN_PRESENCE) {
        return { state: "none", ready: false, message: "Aucune pièce exploitable détectée dans le cadre. Les 4 bords doivent être visibles.", className: "bad" };
    }

    if (analysis.areaRatio < V10_DOCUMENT_MIN_AREA) {
        return { state: "too_small", ready: false, message: "Pièce trop éloignée. Rapprochez-la pour remplir le cadre rouge.", className: "bad" };
    }

    if (analysis.areaRatio > V10_DOCUMENT_MAX_AREA) {
        return { state: "too_close", ready: false, message: "Pièce trop proche. Reculez légèrement pour garder les bords visibles.", className: "bad" };
    }

    if (analysis.aspectScore < V10_DOCUMENT_MIN_ASPECT_SCORE) {
        return { state: "bad_ratio", ready: false, message: "Format incohérent avec le type de pièce choisi. Vérifiez CNI / passeport / titre de séjour.", className: "bad" };
    }

    if (analysis.stats.clarityIssue === "dark") {
        return { state: "dark", ready: false, message: "Image trop sombre. Ajoutez de la lumière ou changez l’orientation.", className: "bad" };
    }

    if (analysis.stats.clarityIssue === "glare") {
        return { state: "glare", ready: false, message: "Reflet détecté. Inclinez légèrement la pièce.", className: "bad" };
    }

    if (analysis.stats.clarityIssue === "blurry") {
        return { state: "blurry", ready: false, message: "Image floue. Stabilisez la caméra et la pièce.", className: "bad" };
    }

    if (analysis.stabilityScore < 65) {
        return { state: "hold_still", ready: false, message: "Presque bon. Ne bougez plus quelques secondes.", className: "" };
    }

    return { state: "ready", ready: true, message: "Pièce bien cadrée. Capture automatique en cours...", className: "good" };
}

async function startDocumentSmartCapture() {
    stopDocumentSmartCapture();

    v10DocumentModeActive = true;
    v10DocumentReadyFrames = 0;
    v10DocumentReadyForCapture = false;
    v10DocumentPreviousCenter = null;
    v10DocumentLastAnalysis = null;

    v10DocumentTimer = setInterval(async function () {
        if (!v10DocumentModeActive) {
            return;
        }

        const analysis = await v10AnalyzeDocumentFrame();
        v10DocumentLastAnalysis = analysis;

        const verdict = v10DocumentStateMessage(analysis);

        v10SetProgress("documentPresenceBar", analysis ? analysis.presenceScore : 0);
        v10SetProgress("documentSharpnessBar", analysis ? analysis.stats.sharpnessScore : 0);
        v10SetProgress("documentBrightnessBar", analysis ? analysis.stats.brightnessScore : 0);
        v10SetProgress("documentStabilityBar", analysis ? analysis.stabilityScore : 0);

        v10SetDocumentFrameState(verdict.state === "ready" ? "ready" : verdict.state);
        v10SetSmartMessage("documentQualityMessage", verdict.message, verdict.className);

        if (verdict.ready) {
            v10DocumentReadyFrames += 1;
            v10DocumentReadyForCapture = true;
            v10SetSmartMessage(
                "documentQualityMessage",
                `Pièce bien cadrée. Capture automatique dans ${Math.max(1, V10_READY_FRAMES - v10DocumentReadyFrames + 1)}...`,
                "good"
            );
        } else {
            v10DocumentReadyFrames = 0;
            v10DocumentReadyForCapture = false;
        }

        if (v10DocumentReadyFrames >= V10_READY_FRAMES) {
            captureDocumentSide(false);
            v10DocumentReadyFrames = 0;
        }
    }, V10_DETECT_INTERVAL_MS);
}

function stopDocumentSmartCapture() {
    v10DocumentModeActive = false;

    if (v10DocumentTimer) {
        clearInterval(v10DocumentTimer);
        v10DocumentTimer = null;
    }

    v10DocumentReadyFrames = 0;
}

async function openDocumentCamera() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("documentVideo");
    const errorBox = document.getElementById("cameraError");

    if (!getSelectedDocumentType()) {
        alert("Veuillez d’abord sélectionner le type de pièce dans la section Pièce et activité.");
        return;
    }

    if (errorBox) {
        errorBox.innerHTML = "";
    }

    currentDocumentSide = "recto";
    v10ApplyDocumentFrameProfile();
    updateSideIndicator();

    v10SetSmartMessage(
        "documentQualityMessage",
        "Placez la pièce dans le cadre rouge. La capture se déclenche automatiquement lorsque les bords, la netteté et la stabilité sont corrects."
    );

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        video.srcObject = cameraStream;
        modal.style.display = "block";

        video.onloadedmetadata = function () {
            v10ApplyDocumentFrameProfile();
            startDocumentSmartCapture();
        };

    } catch (error) {
        if (errorBox) {
            errorBox.innerHTML = `
                Caméra indisponible ou permission refusée.
                <button type="button" onclick="openIdentityImport()">Importer une photo</button>
            `;
        }

        modal.style.display = "block";
    }
}

function closeDocumentCamera() {
    stopDocumentSmartCapture();

    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("documentVideo");

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    if (video) {
        video.srcObject = null;
    }

    if (modal) {
        modal.style.display = "none";
    }
}

function captureDocumentSide(manual = true) {
    const video = document.getElementById("documentVideo");
    const canvas = document.getElementById("documentCanvas");
    const frame = document.querySelector("#cameraModal .document-frame");

    if (!video || !canvas || !frame || !video.videoWidth || !video.videoHeight) {
        return;
    }

    if (manual && !v10DocumentReadyForCapture) {
        v10SetSmartMessage(
            "documentQualityMessage",
            "Capture bloquée : placez correctement la pièce dans le cadre et attendez que l’état soit vert.",
            "bad"
        );
        return;
    }

    const crop = v10DocumentLastAnalysis && v10DocumentLastAnalysis.crop
        ? v10DocumentLastAnalysis.crop
        : v10GetFrameVideoCrop(video, frame);

    canvas.width = Math.round(crop.cropWidth);
    canvas.height = Math.round(crop.cropHeight);

    const context = canvas.getContext("2d");
    context.drawImage(
        video,
        crop.cropX,
        crop.cropY,
        crop.cropWidth,
        crop.cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(function (blob) {
        if (!blob) {
            return;
        }

        const fileName = currentDocumentSide === "recto"
            ? "piece_recto.jpg"
            : "piece_verso.jpg";

        const file = new File([blob], fileName, { type: "image/jpeg" });

        if (currentDocumentSide === "recto") {
            identityDocumentFiles.recto = file;

            if (documentNeedsBackSide()) {
                currentDocumentSide = "verso";
                v10DocumentReadyFrames = 0;
                v10DocumentReadyForCapture = false;
                v10DocumentPreviousCenter = null;
                updateSideIndicator();
                updateIdentityCaptureStatus();
                v10SetSmartMessage(
                    "documentQualityMessage",
                    "Recto capturé. Retournez la pièce et replacez le verso dans le cadre rouge.",
                    "good"
                );
                return;
            }
        } else {
            identityDocumentFiles.verso = file;
        }

        closeDocumentCamera();
        updateIdentityCaptureStatus();
    }, "image/jpeg", 0.92);
}

async function v10DetectSelfieFace(video) {
    if (typeof window.detectFaceLandmarksWithMediaPipe === "function") {
        try {
            const faces = await window.detectFaceLandmarksWithMediaPipe(video);

            if (faces && faces.length > 0) {
                const landmarks = faces[0];

                // Repères canoniques MediaPipe (indices stables)
                const leftEye  = landmarks[33];   // EYE_L
                const rightEye = landmarks[263];  // EYE_R
                const nose     = landmarks[1];    // NOSE

                let roll = 0, yaw = 0, frontal = false;
                let cx = 0.5, cy = 0.5, fill = 0;

                if (leftEye && rightEye && nose) {
                    const dx = rightEye.x - leftEye.x;
                    const dy = rightEye.y - leftEye.y;
                    const interocular = Math.hypot(dx, dy) || 1;
                    const midEyeX = (leftEye.x + rightEye.x) / 2;

                    // Pose (conforme au .md)
                    roll = Math.atan2(dy, dx);                         // tête droite ≈ 0
                    yaw  = (nose.x - midEyeX) / interocular;          // face caméra ≈ 0
                    frontal = true;

                    // Centre du visage (milieu des yeux + nez)
                    cx = (leftEye.x + rightEye.x + nose.x) / 3;
                    cy = (leftEye.y + rightEye.y + nose.y) / 3;
                }

                // fill = hauteur de la boîte englobante de tous les landmarks / hauteur image
                // Les coordonnées FaceLandmarker sont normalisées (0..1) → fill ∈ (0,1)
                const ys  = landmarks.map(p => p.y);
                const xs  = landmarks.map(p => p.x);
                fill = Math.max(...ys) - Math.min(...ys);  // hauteur tête / image

                // ── Cover-crop correction ──────────────────────────────────────────
                // La vidéo est affichée en object-fit:cover dans un cercle carré.
                // Le rapport vidéo vW/vH ≠ 1 → le centre et le fill doivent être
                // recalculés dans l'espace du cercle visible pour que le verdict
                // corresponde à ce que l'utilisateur voit (cf. .md §2).
                const vW = video.videoWidth  || 1;
                const vH = video.videoHeight || 1;
                const aspect = vW / vH;

                if (aspect > 1) {
                    // Vidéo plus large que haute : les bords gauche/droit sont coupés.
                    // Les coordonnées x normalisées (0..1) sont dans l'espace vidéo.
                    // On les ramène dans l'espace du crop centré.
                    const cropStart = (1 - 1 / aspect) / 2; // % coupé de chaque côté
                    const cropScale = aspect;
                    cx = (cx - cropStart) * cropScale;
                    fill = fill * cropScale;   // fill horizontal aussi étiré
                } else if (aspect < 1) {
                    // Vidéo plus haute que large : les bords haut/bas sont coupés.
                    const cropStart = (1 - aspect) / 2;
                    const cropScale = 1 / aspect;
                    cy = (cy - cropStart) * cropScale;
                    fill = fill / aspect;
                }
                // ── Fin cover-crop ──────────────────────────────────────────────────

                return {
                    count: faces.length,
                    face: { cx, cy, fill, roll, yaw, frontal },
                    source: "FaceLandmarker"
                };
            }

            return { count: 0, face: null, source: "FaceLandmarker" };

        } catch (error) {
            console.warn("FaceLandmarker indisponible au tick :", error);
        }
    }

    if (typeof window.detectFacesWithMediaPipe === "function") {
        try {
            const detections = await window.detectFacesWithMediaPipe(video);

            if (!detections || detections.length === 0) {
                return { count: 0, face: null, source: "FaceDetector" };
            }

            const box = detections[0].boundingBox;
            const originX = box.originX ?? box.x ?? 0;
            const originY = box.originY ?? box.y ?? 0;
            const width = box.width ?? 0;
            const height = box.height ?? 0;

            return {
                count: detections.length,
                face: {
                    cx: (originX + width / 2) / video.videoWidth,
                    cy: (originY + height / 2) / video.videoHeight,
                    fill: height / video.videoHeight,
                    roll: 0,
                    yaw: 0,
                    frontal: true
                },
                source: "FaceDetector"
            };
        } catch (error) {
            return { count: 0, face: null, source: "none" };
        }
    }

    return { count: -1, face: null, source: "manual" };
}

function v10SelfieState(faceResult, stats) {
    if (!faceResult || faceResult.count === -1) {
        return {
            state: "idle",
            ready: false,
            manualAllowed: true,
            message: "Détection visage indisponible. Cadrez votre visage puis cliquez sur Capturer la photo.",
            className: ""
        };
    }

    if (faceResult.count === 0 || !faceResult.face || !faceResult.face.frontal) {
        return { state: "none", ready: false, message: "Aucun visage frontal détecté. Placez-vous face caméra.", className: "bad" };
    }

    if (faceResult.count > 1) {
        return { state: "multiple", ready: false, message: "Plusieurs visages détectés. Restez seul dans le cadre.", className: "bad" };
    }

    const face = faceResult.face;

    if (face.fill < V10_FACE_FILL_MIN) {
        return { state: "too_small", ready: false, message: "Rapprochez-vous : le visage est trop petit dans le cadre.", className: "bad" };
    }

    if (face.fill > V10_FACE_FILL_MAX) {
        return { state: "too_close", ready: false, message: "Reculez légèrement : le visage est trop proche.", className: "bad" };
    }

    if (Math.abs(face.cx - 0.5) > V10_FACE_CENTER_TOL || Math.abs(face.cy - 0.5) > V10_FACE_CENTER_TOL) {
        return { state: "offcenter", ready: false, message: "Centrez votre visage dans le cadre ovale.", className: "bad" };
    }

    if (Math.abs(face.yaw) > V10_FACE_YAW_MAX) {
        return { state: "look_straight", ready: false, message: "Regardez droit vers la caméra.", className: "bad" };
    }

    if (Math.abs(face.roll) > V10_FACE_ROLL_MAX) {
        return { state: "tilt", ready: false, message: "Gardez la tête droite.", className: "bad" };
    }

    // Tests qualité image (ordre exact du .md : dark → glare → blurry)
    if (stats.clarityIssue === "dark") {
        return { state: "dark",   ready: false, message: "Trop sombre — ajoutez de la lumière.", className: "bad" };
    }
    if (stats.clarityIssue === "glare") {
        return { state: "glare",  ready: false, message: "Reflet/surexposition — réduisez l'éclairage direct.", className: "bad" };
    }
    if (stats.clarityIssue === "blurry") {
        return { state: "blurry", ready: false, message: "Image floue — stabilisez votre appareil.", className: "bad" };
    }

    const movement = v10Distance(face, v10SelfiePreviousCenter);
    v10SelfiePreviousCenter = { cx: face.cx, cy: face.cy };

    if (movement > V10_FACE_MOVE_MAX) {
        return { state: "hold_still", ready: false, message: "Presque bon. Ne bougez plus.", className: "" };
    }

    return { state: "ready", ready: true, message: "Visage bien cadré. Capture automatique en cours...", className: "good" };
}

function startSelfieSmartCapture() {
    stopSelfieSmartCapture();

    v10SelfieModeActive = true;
    v10SelfieReadyFrames = 0;
    v10SelfieReadyForCapture = false;
    v10SelfiePreviousCenter = null;

    v10SelfieTimer = setInterval(async function () {
        if (!v10SelfieModeActive) {
            return;
        }

        const video = document.getElementById("selfieVideo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const stats = v10ImageStats(canvas, V10_FACE_BLUR_MIN);
        const faceResult = await v10DetectSelfieFace(video);
        const verdict = v10SelfieState(faceResult, stats);

        const faceScore = faceResult && faceResult.face
            ? v10Clamp(faceResult.face.fill / V10_FACE_FILL_MIN * 100, 0, 100)
            : 0;

        v10SetProgress("selfieFaceBar", verdict.state === "ready" ? 100 : faceScore);
        v10SetProgress("selfieSharpnessBar", stats.sharpnessScore);
        v10SetProgress("selfieBrightnessBar", stats.brightnessScore);
        v10SetProgress("selfieStabilityBar", verdict.state === "ready" ? 100 : 50);

        v10SetSmartMessage("selfieQualityMessage", verdict.message, verdict.className);

        if (verdict.manualAllowed) {
            v10SelfieReadyForCapture = true;
        const selfieBtn = document.getElementById("selfiePhotoButton");
        if (selfieBtn) selfieBtn.disabled = false;
            return;
        }

        if (verdict.ready) {
            v10SelfieReadyFrames += 1;
            v10SelfieReadyForCapture = true;
            v10SetSmartMessage(
                "selfieQualityMessage",
                `Visage bien cadré. Capture automatique dans ${Math.max(1, V10_READY_FRAMES - v10SelfieReadyFrames + 1)}...`,
                "good"
            );
        } else {
            v10SelfieReadyFrames = 0;
            v10SelfieReadyForCapture = false;
        }

        if (v10SelfieReadyFrames >= V10_READY_FRAMES) {
            captureSelfiePhoto(false);
            v10SelfieReadyFrames = 0;
        }
    }, V10_DETECT_INTERVAL_MS);
}

function stopSelfieSmartCapture() {
    v10SelfieModeActive = false;

    if (v10SelfieTimer) {
        clearInterval(v10SelfieTimer);
        v10SelfieTimer = null;
    }

    v10SelfieReadyFrames = 0;
}

async function openSelfieCamera() {
    const modal = document.getElementById("selfieModal");
    const video = document.getElementById("selfieVideo");
    const errorBox = document.getElementById("selfieCameraError");

    if (errorBox) {
        errorBox.innerHTML = "";
    }

    v10SelfieReadyForCapture = false;
    v10SelfieReadyFrames = 0;
    v10SelfiePreviousCenter = null;

    document.getElementById("selfiePhotoButton").style.display = selfieMode === "photo" ? "inline-block" : "none";
    document.getElementById("startSelfieVideoButton").style.display = selfieMode === "video" ? "inline-block" : "none";
    document.getElementById("stopSelfieVideoButton").style.display = "none";

    document.getElementById("selfieModalTitle").innerText =
        selfieMode === "photo" ? "Capture photo selfie" : "Enregistrement vidéo selfie";

    document.getElementById("selfieInstruction").innerText =
        selfieMode === "photo"
            ? "Placez votre visage dans le cadre ovale. La capture se déclenche automatiquement si le cadrage est bon."
            : "Placez votre visage dans le cadre et enregistrez une courte vidéo de 5 à 10 secondes.";

    v10SetSmartMessage(
        "selfieQualityMessage",
        selfieMode === "photo"
            ? "Analyse du visage en cours..."
            : "Pour la vidéo, regardez la caméra et restez stable."
    );

    try {
        selfieStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "user" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: selfieMode === "video"
        });

        video.srcObject = selfieStream;
        modal.style.display = "block";

        video.onloadedmetadata = function () {
            if (selfieMode === "photo") {
                startSelfieSmartCapture();
            }
        };

    } catch (error) {
        if (errorBox) {
            errorBox.innerHTML = `
                Caméra indisponible ou permission refusée.
                <button type="button" onclick="openSelfieImport()">Importer une photo</button>
            `;
        }

        modal.style.display = "block";
    }
}

function closeSelfieCamera() {
    stopSelfieSmartCapture();

    const modal = document.getElementById("selfieModal");
    const video = document.getElementById("selfieVideo");

    if (selfieRecorder && selfieRecorder.state !== "inactive") {
        selfieRecorder.stop();
    }

    if (selfieStream) {
        selfieStream.getTracks().forEach(track => track.stop());
        selfieStream = null;
    }

    if (video) {
        video.srcObject = null;
    }

    if (modal) {
        modal.style.display = "none";
    }
}

function captureSelfiePhoto(manual = true) {
    const video = document.getElementById("selfieVideo");
    const canvas = document.getElementById("selfieCanvas");

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
        return;
    }

    if (manual && !v10SelfieReadyForCapture) {
        v10SetSmartMessage(
            "selfieQualityMessage",
            "Capture bloquée : centrez le visage et attendez que l’état soit prêt.",
            "bad"
        );
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(function (blob) {
        if (!blob) {
            return;
        }

        const file = new File([blob], "selfie_photo.jpg", { type: "image/jpeg" });

        selfieFiles = {
            photo: file,
            video: null,
            imported: null
        };

        closeSelfieCamera();
        updateSelfieCaptureStatus();
    }, "image/jpeg", 0.9);
}



/* ========================================================================
   V11 - Selfie / preuve de vie robuste pour déploiement
   Objectif : ne plus bloquer la capture si MediaPipe/CDN/FaceDetector échoue.
   - Détection visage prioritaire : FaceLandmarker -> FaceDetector -> native FaceDetector.
   - Seuils plus tolérants pour webcam PC.
   - Auto-capture si visage OK plusieurs frames.
   - Capture manuelle toujours possible pour ne pas bloquer le parcours client.
   ======================================================================== */

const V11_SELFIE_READY_FRAMES = 3;
const V11_SELFIE_INTERVAL_MS = 260;
const V11_FACE_FILL_MIN = 0.20;
const V11_FACE_FILL_MAX = 0.88;
const V11_FACE_CENTER_TOL = 0.30;
const V11_FACE_YAW_MAX = 0.60;
const V11_FACE_ROLL_MAX = 0.45;
const V11_FACE_BLUR_MIN = 10;
const V11_FACE_MOVE_MAX = 0.085;

let v11SelfieTimer = null;
let v11SelfieReadyFrames = 0;
let v11SelfiePreviousCenter = null;
let v11SelfieReadyForAutoCapture = false;
let v11SelfieTickCount = 0;
let v11SelfieLastDetectorSource = "initialisation";
let v11SelfieDetectorUnavailable = false;

function v11TimeoutPromise(promise, timeoutMs, fallbackValue) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(fallbackValue), timeoutMs))
    ]);
}

function v11SafeSetButtonState() {
    const button = document.getElementById("selfiePhotoButton");
    if (!button) {
        return;
    }
    button.disabled = false;
    button.innerText = "📸 Capturer la photo";
    button.title = "Capture manuelle disponible si l'auto-capture ne se déclenche pas.";
}

function v11LandmarksToFace(landmarks) {
    const xs = landmarks.map(p => p.x).filter(Number.isFinite);
    const ys = landmarks.map(p => p.y).filter(Number.isFinite);

    if (!xs.length || !ys.length) {
        return null;
    }

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];

    let roll = 0;
    let yaw = 0;
    let frontal = Boolean(leftEye && rightEye && nose);

    if (frontal) {
        const dx = rightEye.x - leftEye.x;
        const dy = rightEye.y - leftEye.y;
        const interocular = Math.hypot(dx, dy) || 1;
        const midEyeX = (leftEye.x + rightEye.x) / 2;
        roll = Math.atan2(dy, dx);
        yaw = (nose.x - midEyeX) / interocular;
    }

    return {
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        fill: (maxY - minY),
        roll,
        yaw,
        frontal
    };
}

async function v11DetectSelfieFace(video) {
    v11SelfieLastDetectorSource = "aucun";

    try {
        if (window.MEDIAPIPE_FACE_LANDMARKER_READY) {
            const landmarker = await v11TimeoutPromise(window.MEDIAPIPE_FACE_LANDMARKER_READY, 450, "PENDING");

            if (landmarker && landmarker !== "PENDING") {
                const result = landmarker.detectForVideo(video, performance.now());
                const faces = result && result.faceLandmarks ? result.faceLandmarks : [];
                v11SelfieLastDetectorSource = "MediaPipe FaceLandmarker";

                if (faces.length > 0) {
                    const face = v11LandmarksToFace(faces[0]);
                    return {
                        count: faces.length,
                        face,
                        source: v11SelfieLastDetectorSource,
                        detectorAvailable: true,
                        pending: false
                    };
                }

                return {
                    count: 0,
                    face: null,
                    source: v11SelfieLastDetectorSource,
                    detectorAvailable: true,
                    pending: false
                };
            }

            if (landmarker === "PENDING") {
                return {
                    count: -2,
                    face: null,
                    source: "MediaPipe FaceLandmarker en chargement",
                    detectorAvailable: false,
                    pending: true
                };
            }
        }
    } catch (error) {
        console.warn("V11 FaceLandmarker indisponible :", error);
    }

    try {
        if (window.MEDIAPIPE_FACE_READY) {
            const detector = await v11TimeoutPromise(window.MEDIAPIPE_FACE_READY, 450, "PENDING");

            if (detector && detector !== "PENDING") {
                const result = detector.detectForVideo(video, performance.now());
                const detections = result && result.detections ? result.detections : [];
                v11SelfieLastDetectorSource = "MediaPipe FaceDetector";

                if (detections.length > 0) {
                    const box = detections[0].boundingBox || {};
                    const originX = box.originX ?? box.x ?? box.left ?? 0;
                    const originY = box.originY ?? box.y ?? box.top ?? 0;
                    const width = box.width ?? 0;
                    const height = box.height ?? 0;

                    return {
                        count: detections.length,
                        face: {
                            cx: (originX + width / 2) / video.videoWidth,
                            cy: (originY + height / 2) / video.videoHeight,
                            fill: height / video.videoHeight,
                            roll: 0,
                            yaw: 0,
                            frontal: true
                        },
                        source: v11SelfieLastDetectorSource,
                        detectorAvailable: true,
                        pending: false
                    };
                }

                return {
                    count: 0,
                    face: null,
                    source: v11SelfieLastDetectorSource,
                    detectorAvailable: true,
                    pending: false
                };
            }

            if (detector === "PENDING") {
                return {
                    count: -2,
                    face: null,
                    source: "MediaPipe FaceDetector en chargement",
                    detectorAvailable: false,
                    pending: true
                };
            }
        }
    } catch (error) {
        console.warn("V11 FaceDetector MediaPipe indisponible :", error);
    }

    try {
        if (browserFaceDetector) {
            const faces = await browserFaceDetector.detect(video);
            v11SelfieLastDetectorSource = "Browser FaceDetector";

            if (faces && faces.length > 0) {
                const box = faces[0].boundingBox;
                return {
                    count: faces.length,
                    face: {
                        cx: (box.x + box.width / 2) / video.videoWidth,
                        cy: (box.y + box.height / 2) / video.videoHeight,
                        fill: box.height / video.videoHeight,
                        roll: 0,
                        yaw: 0,
                        frontal: true
                    },
                    source: v11SelfieLastDetectorSource,
                    detectorAvailable: true,
                    pending: false
                };
            }

            return {
                count: 0,
                face: null,
                source: v11SelfieLastDetectorSource,
                detectorAvailable: true,
                pending: false
            };
        }
    } catch (error) {
        console.warn("V11 Browser FaceDetector indisponible :", error);
    }

    v11SelfieDetectorUnavailable = true;
    return {
        count: -1,
        face: null,
        source: "manuel",
        detectorAvailable: false,
        pending: false
    };
}

function v11SelfieState(faceResult, stats) {
    if (!faceResult || faceResult.count === -1) {
        return {
            state: "manual",
            ready: false,
            manualAllowed: true,
            message: "Détection automatique indisponible. Cadrez votre visage dans l'ovale puis cliquez sur Capturer la photo.",
            className: ""
        };
    }

    if (faceResult.count === -2 || faceResult.pending) {
        return {
            state: "loading",
            ready: false,
            manualAllowed: v11SelfieTickCount >= 8,
            message: v11SelfieTickCount >= 8
                ? "Le moteur visage charge lentement. Vous pouvez capturer manuellement si le visage est bien cadré."
                : "Chargement de la détection visage. Gardez votre visage dans le cadre...",
            className: ""
        };
    }

    if (faceResult.count === 0 || !faceResult.face) {
        return {
            state: "none",
            ready: false,
            manualAllowed: v11SelfieTickCount >= 10,
            message: v11SelfieTickCount >= 10
                ? "Aucun visage détecté automatiquement. Si votre visage est bien visible, cliquez sur Capturer la photo."
                : "Aucun visage détecté. Placez votre visage au centre de l'ovale.",
            className: "bad"
        };
    }

    if (faceResult.count > 1) {
        return {
            state: "multiple",
            ready: false,
            manualAllowed: false,
            message: "Plusieurs visages détectés. Restez seul devant la caméra.",
            className: "bad"
        };
    }

    const face = faceResult.face;

    if (!face.frontal) {
        return {
            state: "none",
            ready: false,
            manualAllowed: true,
            message: "Regardez la caméra. Capture manuelle possible si le visage est clairement visible.",
            className: "bad"
        };
    }

    if (face.fill < V11_FACE_FILL_MIN) {
        return {
            state: "too_small",
            ready: false,
            manualAllowed: true,
            message: "Rapprochez-vous légèrement. Vous pouvez capturer manuellement si le visage est lisible.",
            className: "bad"
        };
    }

    if (face.fill > V11_FACE_FILL_MAX) {
        return {
            state: "too_close",
            ready: false,
            manualAllowed: true,
            message: "Reculez légèrement. Le visage est trop proche.",
            className: "bad"
        };
    }

    if (Math.abs(face.cx - 0.5) > V11_FACE_CENTER_TOL || Math.abs(face.cy - 0.5) > V11_FACE_CENTER_TOL) {
        return {
            state: "offcenter",
            ready: false,
            manualAllowed: true,
            message: "Centrez le visage dans l'ovale. Capture manuelle possible si le visage est bien visible.",
            className: "bad"
        };
    }

    if (Math.abs(face.yaw) > V11_FACE_YAW_MAX) {
        return {
            state: "look_straight",
            ready: false,
            manualAllowed: true,
            message: "Regardez droit vers la caméra.",
            className: "bad"
        };
    }

    if (Math.abs(face.roll) > V11_FACE_ROLL_MAX) {
        return {
            state: "tilt",
            ready: false,
            manualAllowed: true,
            message: "Gardez la tête droite.",
            className: "bad"
        };
    }

    if (stats.clarityIssue === "dark") {
        return {
            state: "dark",
            ready: false,
            manualAllowed: true,
            message: "Image sombre. Ajoutez de la lumière puis capturez.",
            className: "bad"
        };
    }

    if (stats.clarityIssue === "glare") {
        return {
            state: "glare",
            ready: false,
            manualAllowed: true,
            message: "Lumière trop forte. Réduisez le reflet puis capturez.",
            className: "bad"
        };
    }

    const movement = v10Distance(face, v11SelfiePreviousCenter);
    v11SelfiePreviousCenter = { cx: face.cx, cy: face.cy };

    if (movement > V11_FACE_MOVE_MAX) {
        return {
            state: "hold_still",
            ready: false,
            manualAllowed: true,
            message: "Presque bon. Ne bougez plus quelques secondes.",
            className: ""
        };
    }

    return {
        state: "ready",
        ready: true,
        manualAllowed: true,
        message: "Visage bien cadré. Capture automatique en cours...",
        className: "good"
    };
}

function startSelfieSmartCapture() {
    stopSelfieSmartCapture();

    v10SelfieModeActive = true;
    v10SelfieReadyForCapture = true; // V11 : la capture manuelle ne bloque plus le parcours.
    v11SelfieReadyForAutoCapture = false;
    v11SelfieReadyFrames = 0;
    v11SelfiePreviousCenter = null;
    v11SelfieTickCount = 0;
    v11SelfieDetectorUnavailable = false;
    v11SafeSetButtonState();

    v11SelfieTimer = setInterval(async function () {
        const video = document.getElementById("selfieVideo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            return;
        }

        v11SelfieTickCount += 1;

        const fullCrop = {
            cropX: 0,
            cropY: 0,
            cropWidth: video.videoWidth,
            cropHeight: video.videoHeight
        };
        const canvas = v10DrawVideoCropToCanvas(video, fullCrop, 320);
        const stats = v10ImageStats(canvas, V11_FACE_BLUR_MIN);
        const faceResult = await v11DetectSelfieFace(video);
        const verdict = v11SelfieState(faceResult, stats);

        let faceScore = 35;
        if (faceResult && faceResult.face) {
            const centerPenalty = (Math.abs(faceResult.face.cx - 0.5) + Math.abs(faceResult.face.cy - 0.5)) * 130;
            const fillScore = v10Clamp((faceResult.face.fill / V11_FACE_FILL_MIN) * 100, 0, 100);
            faceScore = v10Clamp((fillScore * 0.65) + ((100 - centerPenalty) * 0.35), 0, 100);
        } else if (verdict.manualAllowed) {
            faceScore = 55;
        }

        v10SetProgress("selfieFaceBar", verdict.ready ? 100 : faceScore);
        v10SetProgress("selfieSharpnessBar", stats.sharpnessScore);
        v10SetProgress("selfieBrightnessBar", stats.brightnessScore);
        v10SetProgress("selfieStabilityBar", verdict.ready ? 100 : (verdict.manualAllowed ? 65 : 35));

        v10SelfieReadyForCapture = true;

        if (verdict.ready) {
            v11SelfieReadyFrames += 1;
            v11SelfieReadyForAutoCapture = true;
            v10SetSmartMessage(
                "selfieQualityMessage",
                `Visage bien cadré (${faceResult.source}). Capture automatique dans ${Math.max(1, V11_SELFIE_READY_FRAMES - v11SelfieReadyFrames + 1)}...`,
                "good"
            );
        } else {
            v11SelfieReadyFrames = 0;
            v11SelfieReadyForAutoCapture = false;
            v10SetSmartMessage("selfieQualityMessage", verdict.message, verdict.className);
        }

        if (v11SelfieReadyFrames >= V11_SELFIE_READY_FRAMES) {
            captureSelfiePhoto(false);
            v11SelfieReadyFrames = 0;
        }
    }, V11_SELFIE_INTERVAL_MS);
}

function stopSelfieSmartCapture() {
    v10SelfieModeActive = false;

    if (v10SelfieTimer) {
        clearInterval(v10SelfieTimer);
        v10SelfieTimer = null;
    }

    if (v11SelfieTimer) {
        clearInterval(v11SelfieTimer);
        v11SelfieTimer = null;
    }

    v10SelfieReadyFrames = 0;
    v11SelfieReadyFrames = 0;
}

async function openSelfieCamera() {
    const modal = document.getElementById("selfieModal");
    const video = document.getElementById("selfieVideo");
    const errorBox = document.getElementById("selfieCameraError");

    if (errorBox) {
        errorBox.innerHTML = "";
    }

    v10SelfieReadyForCapture = true;
    v11SelfieReadyForAutoCapture = false;
    v11SelfieReadyFrames = 0;
    v11SelfiePreviousCenter = null;
    v11SelfieTickCount = 0;
    v11SafeSetButtonState();

    document.getElementById("selfiePhotoButton").style.display = selfieMode === "photo" ? "inline-block" : "none";
    document.getElementById("startSelfieVideoButton").style.display = selfieMode === "video" ? "inline-block" : "none";
    document.getElementById("stopSelfieVideoButton").style.display = "none";

    document.getElementById("selfieModalTitle").innerText =
        selfieMode === "photo" ? "Capture photo selfie" : "Preuve de vie vidéo";

    document.getElementById("selfieInstruction").innerText =
        selfieMode === "photo"
            ? "Cadrez votre visage dans l'ovale. L'auto-capture est tentée, mais le bouton manuel reste disponible."
            : "Regardez la caméra, puis enregistrez une courte vidéo de 5 à 10 secondes.";

    v10SetSmartMessage(
        "selfieQualityMessage",
        selfieMode === "photo"
            ? "Ouverture caméra. Cadrez le visage ; cliquez sur Capturer si l'auto-capture ne part pas."
            : "Pour la vidéo, dites votre nom ou clignez des yeux, puis arrêtez l'enregistrement."
    );

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia indisponible. Utilisez HTTPS ou localhost.");
        }

        selfieStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "user" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: selfieMode === "video"
        });

        video.srcObject = selfieStream;
        modal.style.display = "block";

        video.onloadedmetadata = function () {
            video.play().catch(() => {});
            if (selfieMode === "photo") {
                startSelfieSmartCapture();
            }
        };

        setTimeout(function () {
            if (selfieMode === "photo" && video.videoWidth && !v11SelfieTimer) {
                startSelfieSmartCapture();
            }
        }, 800);

    } catch (error) {
        if (errorBox) {
            errorBox.innerHTML = `
                Caméra indisponible ou permission refusée : ${error.message || error}.<br>
                <button type="button" onclick="openSelfieImport()">Importer une photo</button>
            `;
        }

        modal.style.display = "block";
    }
}

function captureSelfiePhoto(manual = true) {
    const video = document.getElementById("selfieVideo");
    const canvas = document.getElementById("selfieCanvas");

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
        v10SetSmartMessage(
            "selfieQualityMessage",
            "La caméra n'est pas encore prête. Attendez une seconde ou importez une photo.",
            "bad"
        );
        return;
    }

    // V11 : ne bloque plus la capture manuelle. Le contrôle documentaire reste fait côté back-office.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    canvas.toBlob(function (blob) {
        if (!blob) {
            v10SetSmartMessage("selfieQualityMessage", "Impossible de générer le fichier selfie.", "bad");
            return;
        }

        const file = new File([blob], "selfie_photo.jpg", { type: "image/jpeg" });

        selfieFiles = {
            photo: file,
            video: null,
            imported: null
        };

        closeSelfieCamera();
        updateSelfieCaptureStatus();
    }, "image/jpeg", 0.92);
}



/* V12 - Override final Selfie : ne plus afficher "caméra indisponible" quand la vidéo fonctionne. */
function v12ClearSelfieCameraError() {
    const errorBox = document.getElementById("selfieCameraError");
    if (errorBox) {
        errorBox.innerHTML = "";
        errorBox.style.display = "none";
    }
}

function v12ShowSelfieCameraError(message) {
    const errorBox = document.getElementById("selfieCameraError");
    if (errorBox) {
        errorBox.style.display = "block";
        errorBox.innerHTML = `
            ${message}<br>
            <button type="button" onclick="openSelfieImport()">Importer une photo</button>
        `;
    }
}

function v12SetSelfieFrameReady(isReady) {
    const frame = document.querySelector(".selfie-stage .selfie-frame");
    if (!frame) {
        return;
    }
    if (isReady) {
        frame.classList.add("ready");
    } else {
        frame.classList.remove("ready");
    }
}

// On remplace uniquement l'ouverture caméra selfie. Les indicatifs pays et le reste du formulaire ne sont pas touchés.
async function openSelfieCamera() {
    const modal = document.getElementById("selfieModal");
    const video = document.getElementById("selfieVideo");

    v12ClearSelfieCameraError();
    v12SetSelfieFrameReady(false);

    v10SelfieReadyForCapture = true;
    v11SelfieReadyForAutoCapture = false;
    v11SelfieReadyFrames = 0;
    v11SelfiePreviousCenter = null;
    v11SelfieTickCount = 0;

    const photoButton = document.getElementById("selfiePhotoButton");
    const startVideoButton = document.getElementById("startSelfieVideoButton");
    const stopVideoButton = document.getElementById("stopSelfieVideoButton");
    const title = document.getElementById("selfieModalTitle");
    const instruction = document.getElementById("selfieInstruction");

    if (photoButton) {
        photoButton.style.display = selfieMode === "photo" ? "inline-block" : "none";
        photoButton.disabled = false;
    }
    if (startVideoButton) {
        startVideoButton.style.display = selfieMode === "video" ? "inline-block" : "none";
    }
    if (stopVideoButton) {
        stopVideoButton.style.display = "none";
    }

    if (title) {
        title.innerText = selfieMode === "photo" ? "Capture photo selfie" : "Preuve de vie vidéo";
    }

    if (instruction) {
        instruction.innerText = selfieMode === "photo"
            ? "Placez votre visage au centre de l’ovale. Si l’auto-capture ne part pas, cliquez sur Capturer la photo."
            : "Regardez la caméra, puis enregistrez une courte vidéo de 5 à 10 secondes.";
    }

    v10SetSmartMessage(
        "selfieQualityMessage",
        selfieMode === "photo"
            ? "Caméra ouverte. Le bouton manuel reste disponible pour ne pas bloquer le parcours."
            : "Caméra ouverte. Démarrez la vidéo lorsque votre visage est visible.",
        ""
    );

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia indisponible. Utilisez localhost ou HTTPS.");
        }

        selfieStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "user" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: selfieMode === "video"
        });

        video.srcObject = selfieStream;
        modal.style.display = "block";
        v12ClearSelfieCameraError();

        video.onloadedmetadata = function () {
            video.play().then(function () {
                v12ClearSelfieCameraError();
                if (selfieMode === "photo") {
                    startSelfieSmartCapture();
                }
            }).catch(function () {
                // La vidéo est déjà attachée : ne pas afficher "caméra indisponible".
                v12ClearSelfieCameraError();
                if (selfieMode === "photo") {
                    startSelfieSmartCapture();
                }
            });
        };

        setTimeout(function () {
            if (video.videoWidth && video.videoHeight) {
                v12ClearSelfieCameraError();
            }
            if (selfieMode === "photo" && video.videoWidth && !v11SelfieTimer) {
                startSelfieSmartCapture();
            }
        }, 800);

    } catch (error) {
        modal.style.display = "block";
        v12ShowSelfieCameraError(`Caméra indisponible ou permission refusée : ${error.message || error}.`);
        v10SetSmartMessage(
            "selfieQualityMessage",
            "La caméra n’a pas pu être ouverte. Importez une photo selfie pour continuer le test.",
            "bad"
        );
    }
}

// On rend le message de fallback visage moins alarmant : la caméra peut marcher même si la détection automatique est indisponible.
const v12OriginalV11SelfieState = typeof v11SelfieState === "function" ? v11SelfieState : null;
if (v12OriginalV11SelfieState) {
    v11SelfieState = function(faceResult, stats) {
        const verdict = v12OriginalV11SelfieState(faceResult, stats);
        v12SetSelfieFrameReady(Boolean(verdict && verdict.ready));
        if (faceResult && faceResult.count === -1) {
            return {
                state: "manual",
                ready: false,
                manualAllowed: true,
                message: "Analyse automatique du visage indisponible. Ce n’est pas bloquant : centrez le visage et cliquez sur Capturer la photo.",
                className: ""
            };
        }
        return verdict;
    };
}

;/* ==== bloc script 5/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    function hideResidencyStatusField() {
        const fields = document.querySelectorAll(
            '[name="residency_status"], #residency_status, [id*="residency_status"], [name*="residency_status"]'
        );

        fields.forEach(function (field) {
            field.required = false;
            field.disabled = true;

            const wrapper =
                field.closest(".form-group") ||
                field.closest(".field") ||
                field.closest(".input-group") ||
                field.closest(".col") ||
                field.closest("div");

            if (wrapper) {
                wrapper.style.display = "none";
            }
        });

        // Valeur envoyée au backend, même si le champ visible est retiré
        if (!document.querySelector('input[name="residency_status"][type="hidden"]')) {
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = "residency_status";
            hidden.value = "NON_RESIDENT";
            const form = document.querySelector("form");
            if (form) {
                form.appendChild(hidden);
            }
        }

        // Correction du label visible si le texte est encore présent
        document.querySelectorAll("label, span, h3, h4, p").forEach(function (el) {
            if ((el.textContent || "").trim() === "Résidence*" || (el.textContent || "").trim() === "Résidence *") {
                el.textContent = "Pays de résidence*";
            }

            if ((el.textContent || "").includes("Statut de résidence")) {
                const wrapper =
                    el.closest(".form-group") ||
                    el.closest(".field") ||
                    el.closest(".input-group") ||
                    el.closest(".col") ||
                    el.closest("div");

                if (wrapper) {
                    wrapper.style.display = "none";
                }
            }
        });
    }

    hideResidencyStatusField();
});

;/* ==== bloc script 6/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    const RULES = {
        "237": {country:"Cameroun", digits:9, placeholder:"6 00 00 00 00", groups:[1,2,2,2,2], hint:"Format Cameroun : 9 chiffres après +237"},
        "241": {country:"Gabon", digits:8, placeholder:"06 00 00 00", groups:[2,2,2,2], hint:"Format Gabon : 8 chiffres après +241"},
        "242": {country:"Congo", digits:9, placeholder:"06 000 0000", groups:[2,3,4], hint:"Format Congo : 9 chiffres après +242"},
        "243": {country:"RDC", digits:9, placeholder:"810 000 000", groups:[3,3,3], hint:"Format RDC : 9 chiffres après +243"},
        "225": {country:"Côte d’Ivoire", digits:10, placeholder:"07 00 00 00 00", groups:[2,2,2,2,2], hint:"Format Côte d’Ivoire : 10 chiffres après +225"},
        "221": {country:"Sénégal", digits:9, placeholder:"77 000 00 00", groups:[2,3,2,2], hint:"Format Sénégal : 9 chiffres après +221"},
        "33":  {country:"France", digits:9, placeholder:"6 00 00 00 00", groups:[1,2,2,2,2], hint:"Format France : 9 chiffres après +33"},
        "32":  {country:"Belgique", digits:9, placeholder:"470 00 00 00", groups:[3,2,2,2], hint:"Format Belgique : 9 chiffres après +32"},
        "41":  {country:"Suisse", digits:9, placeholder:"79 000 00 00", groups:[2,3,2,2], hint:"Format Suisse : 9 chiffres après +41"},
        "44":  {country:"Royaume-Uni", digits:10, placeholder:"7123 000000", groups:[4,6], hint:"Format Royaume-Uni : 10 chiffres après +44"},
        "1":   {country:"USA / Canada", digits:10, placeholder:"202 000 0000", groups:[3,3,4], hint:"Format USA/Canada : 10 chiffres après +1"},
        "49":  {country:"Allemagne", digits:11, placeholder:"1512 0000000", groups:[4,7], hint:"Format Allemagne : 11 chiffres après +49"},
        "39":  {country:"Italie", digits:10, placeholder:"312 000 0000", groups:[3,3,4], hint:"Format Italie : 10 chiffres après +39"},
        "34":  {country:"Espagne", digits:9, placeholder:"612 00 00 00", groups:[3,2,2,2], hint:"Format Espagne : 9 chiffres après +34"},
        "234": {country:"Nigeria", digits:10, placeholder:"801 000 0000", groups:[3,3,4], hint:"Format Nigeria : 10 chiffres après +234"},
        "235": {country:"Tchad", digits:8, placeholder:"63 00 00 00", groups:[2,2,2,2], hint:"Format Tchad : 8 chiffres après +235"},
        "236": {country:"RCA", digits:8, placeholder:"70 00 00 00", groups:[2,2,2,2], hint:"Format RCA : 8 chiffres après +236"}
    };

    function onlyDigits(v) {
        return String(v || "").replace(/\D/g, "");
    }

    function getCode(select) {
        const option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
        const raw = [
            select.value || "",
            option ? option.textContent || "" : ""
        ].join(" ");

        const match = raw.match(/\+?\s*(\d{1,4})/);
        return match ? match[1] : "";
    }

    function isIndicatifSelect(select) {
        const text = [
            select.textContent || "",
            select.name || "",
            select.id || ""
        ].join(" ");

        return /\+\s*(237|241|242|243|225|221|33|32|41|44|1|49|39|34|234|235|236)/.test(text);
    }

    function isVisibleInput(input) {
        if (!input) return false;
        if (input.disabled) return false;

        const type = (input.type || "text").toLowerCase();

        if (["hidden", "file", "checkbox", "radio", "date", "email", "password"].includes(type)) {
            return false;
        }

        return true;
    }

    function findPhoneInputAfterSelect(select) {
        const controls = Array.from(document.querySelectorAll("select, input"));
        const start = controls.indexOf(select);

        if (start === -1) return null;

        for (let i = start + 1; i < controls.length; i++) {
            const el = controls[i];

            if (el.tagName === "SELECT" && isIndicatifSelect(el)) {
                return null;
            }

            if (el.tagName === "INPUT" && isVisibleInput(el)) {
                return el;
            }
        }

        return null;
    }

    function cleanHints(input) {
        const parent = input.parentElement;
        if (!parent) return;

        parent.querySelectorAll(
            ".phone-format-hint, .phone-format-hint-parent, .phone-format-hint-clean, .phone-format-error, .phone-format-error-clean, .phone-format-hint-final, .phone-format-error-final"
        ).forEach(function(el){
            el.remove();
        });
    }

    function addHint(input, rule, errorText) {
        cleanHints(input);

        const hint = document.createElement("small");
        hint.className = errorText ? "phone-format-error-final" : "phone-format-hint-final";
        hint.textContent = errorText || rule.hint;

        input.insertAdjacentElement("afterend", hint);
    }

    function formatByGroups(raw, groups) {
        raw = onlyDigits(raw);
        let out = [];
        let pos = 0;

        groups.forEach(function(size){
            if (pos < raw.length) {
                out.push(raw.slice(pos, pos + size));
                pos += size;
            }
        });

        return out.join(" ");
    }

    function forceApply(select, clearValue) {
        if (!select || !isIndicatifSelect(select)) return;

        const input = findPhoneInputAfterSelect(select);
        if (!input) return;

        const code = getCode(select);
        const rule = RULES[code];

        if (!rule) return;

        input.dataset.phoneFinalCode = code;
        input.dataset.phoneFinalDigits = String(rule.digits);
        input.dataset.phoneFinalGroups = JSON.stringify(rule.groups);

        input.setAttribute("inputmode", "numeric");
        input.placeholder = rule.placeholder;
        input.maxLength = rule.placeholder.length;

        if (clearValue) {
            input.value = "";
            input.defaultValue = "";
            input.setAttribute("value", "");
        } else {
            const raw = onlyDigits(input.value);

            if (!raw || raw.length !== rule.digits) {
                input.value = "";
                input.defaultValue = "";
                input.setAttribute("value", "");
            } else {
                input.value = formatByGroups(raw, rule.groups);
            }
        }

        addHint(input, rule);

        console.log("PHONE_FINAL_V10", code, rule.placeholder, "champ vidé =", clearValue);
    }

    function bindSelect(select) {
        if (select.dataset.phoneFinalBound === "1") return;

        select.dataset.phoneFinalBound = "1";

        forceApply(select, false);

        select.addEventListener("change", function () {
            forceApply(select, true);
            setTimeout(function(){ forceApply(select, true); }, 50);
            setTimeout(function(){ forceApply(select, true); }, 200);
        });
    }

    function bindInput(input) {
        if (input.dataset.phoneFinalInputBound === "1") return;

        input.dataset.phoneFinalInputBound = "1";

        input.addEventListener("input", function () {
            const code = input.dataset.phoneFinalCode;
            const rule = RULES[code];
            if (!rule) return;

            const raw = onlyDigits(input.value).slice(0, rule.digits);
            input.value = formatByGroups(raw, rule.groups);
        });

        input.addEventListener("blur", function () {
            const code = input.dataset.phoneFinalCode;
            const rule = RULES[code];
            if (!rule) return;

            const raw = onlyDigits(input.value);

            if (!raw) {
                addHint(input, rule);
                return;
            }

            if (raw.length !== rule.digits) {
                addHint(input, rule, "Numéro invalide : " + rule.digits + " chiffres attendus pour " + rule.country + ".");
            } else {
                addHint(input, rule);
            }
        });
    }

    function initPhoneFinalV10() {
        const selects = Array.from(document.querySelectorAll("select")).filter(isIndicatifSelect);

        selects.forEach(function(select){
            bindSelect(select);

            const input = findPhoneInputAfterSelect(select);
            if (input) {
                bindInput(input);
            }
        });

        console.log("MANAGER_FORM_PHONE_FINAL_V10 actif :", selects.length, "sélecteurs indicatif détectés.");
    }

    initPhoneFinalV10();
    setTimeout(initPhoneFinalV10, 500);
    setTimeout(initPhoneFinalV10, 1500);
});

;/* ==== bloc script 7/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function isCountryCodeSelect(select) {
        const text = [
            select.textContent || "",
            select.name || "",
            select.id || ""
        ].join(" ");

        return /\+\s*(237|241|242|243|225|221|33|32|41|44|1|49|39|34|234|235|236)/.test(text);
    }

    function optionMatches(option, query) {
        if (!query) return true;

        const raw = [
            option.textContent || "",
            option.value || ""
        ].join(" ");

        const normalized = normalizeText(raw);
        const q = normalizeText(query);

        return normalized.includes(q);
    }

    function rebuildOptions(select, originalOptions, query) {
        const oldValue = select.value;

        const matches = originalOptions.filter(function (option) {
            return optionMatches(option, query);
        });

        select.innerHTML = "";

        const listToUse = matches.length > 0 ? matches : originalOptions;

        listToUse.forEach(function (originalOption) {
            select.appendChild(originalOption.cloneNode(true));
        });

        if (query && matches.length > 0) {
            select.selectedIndex = 0;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            const restored = Array.from(select.options).find(function (option) {
                return option.value === oldValue;
            });

            if (restored) {
                select.value = oldValue;
            }
        }

        return matches.length;
    }

    function addSearchToSelect(select, index) {
        if (select.dataset.countrySearchBound === "1") return;

        // AFB_PHONE_COUNTRY_SINGLE_SEARCH_V1 : les listes d'indicatif téléphone
        // ont déjà leur propre combo cherchable (searchable-country). Empiler ce
        // second filtre au-dessus dupliquait la recherche de pays et disloquait
        // la grille « N° de téléphone » des personnes à contacter.
        if (
            select.classList.contains("phone-country-select") ||
            select.dataset.searchableEnhanced === "1" ||
            select.closest(".searchable-country")
        ) {
            return;
        }

        select.dataset.countrySearchBound = "1";

        const originalOptions = Array.from(select.options).map(function (option) {
            return option.cloneNode(true);
        });

        const wrapper = document.createElement("div");
        wrapper.className = "country-code-search-box";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "country-code-search-input";
        input.placeholder = "Rechercher un pays ou un indicatif, ex : Gabon, France, +237";
        input.autocomplete = "off";
        input.id = "country_code_search_" + index;

        const help = document.createElement("small");
        help.className = "country-code-search-help";
        help.textContent = "Tapez le nom du pays ou l’indicatif pour filtrer la liste.";

        wrapper.appendChild(input);
        wrapper.appendChild(help);

        select.parentNode.insertBefore(wrapper, select);

        input.addEventListener("input", function () {
            const count = rebuildOptions(select, originalOptions, input.value);

            if (input.value.trim()) {
                if (count > 0) {
                    help.textContent = count + " résultat(s) trouvé(s).";
                } else {
                    help.textContent = "Aucun résultat exact. Liste complète réaffichée.";
                }
            } else {
                help.textContent = "Tapez le nom du pays ou l’indicatif pour filtrer la liste.";
            }
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                select.focus();
            }
        });
    }

    function initCountryCodeSearch() {
        const selects = Array.from(document.querySelectorAll("select")).filter(isCountryCodeSelect);

        selects.forEach(function (select, index) {
            addSearchToSelect(select, index);
        });

        console.log("MANAGER_FORM_SEARCH_COUNTRY_CODE_V11 actif :", selects.length, "listes indicatif détectées.");
    }

    initCountryCodeSearch();
    setTimeout(initCountryCodeSearch, 500);
    setTimeout(initCountryCodeSearch, 1200);
});

;/* ==== bloc script 8/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerRealCameraDocsInstalled === true) return;
    window.managerRealCameraDocsInstalled = true;

    window.managerExtraDocumentFiles = window.managerExtraDocumentFiles || {
        INCOME_PROOF: null,
        RIB_DOCUMENT: null
    };

    let managerExtraDocStream = null;
    let managerExtraDocCurrentType = null;

    function insertManagerDocsBlock() {
        if (document.getElementById("managerExtraDocsBlock")) return;

        const addressInput = document.getElementById("address_photo");
        const identityStatus = document.getElementById("identityCaptureStatus");

        let anchor = null;

        if (addressInput) {
            anchor =
                addressInput.closest(".full") ||
                addressInput.closest(".form-group") ||
                addressInput.closest(".field") ||
                addressInput.closest("div");
        }

        if (!anchor && identityStatus) {
            anchor =
                identityStatus.closest(".full") ||
                identityStatus.closest(".form-group") ||
                identityStatus.closest(".field") ||
                identityStatus.closest("div");
        }

        if (!anchor) {
            console.log("MODIF4 REAL CAMERA : point d’insertion introuvable.");
            return;
        }

        const block = document.createElement("div");
        block.id = "managerExtraDocsBlock";
        block.className = "manager-camera-docs full";
        block.innerHTML = `
            <div class="sub-title">Documents complémentaires obligatoires</div>
            <p class="doc-help">
                Photographiez les pièces permettant de justifier votre activité ou vos revenus, ainsi que votre relevé d’identification bancaire.
            </p>

            <div class="camera-doc-grid">
                <div class="camera-doc-card">
                    <label>
                        Preuve de justification de vos revenus ou de votre activité
                        <span class="required-doc">*</span>
                    </label>
                    <p class="doc-help">
                        Bulletin de salaire, attestation employeur, contrat de travail,
                        registre de commerce, justificatif fiscal ou attestation d’activité.
                    </p>

                    <button type="button" class="doc-action-btn" onclick="openManagerExtraDocumentCamera('INCOME_PROOF')">
                        📷 Photographier la preuve de revenu / activité
                    </button>

                    <div id="incomeProofCaptureStatus" class="capture-status">
                        Aucune photo capturée.
                    </div>

                    <div id="incomeProofPreview" class="manager-doc-preview"></div>
                </div>

                <div class="camera-doc-card">
                    <label>
                        Relevé d’identification bancaire - RIB
                        <span class="required-doc">*</span>
                    </label>
                    <p class="doc-help">
                        Photographiez votre relevé d’identification bancaire ou une preuve de votre RIB.
                    </p>

                    <button type="button" class="doc-action-btn" onclick="openManagerExtraDocumentCamera('RIB_DOCUMENT')">
                        📷 Photographier le RIB
                    </button>

                    <div id="ribDocumentCaptureStatus" class="capture-status">
                        Aucune photo capturée.
                    </div>

                    <div id="ribDocumentPreview" class="manager-doc-preview"></div>
                </div>
            </div>
        `;

        anchor.insertAdjacentElement("afterend", block);
    }

    function insertManagerCameraModal() {
        if (document.getElementById("managerRealCameraModal")) return;

        const modal = document.createElement("div");
        modal.id = "managerRealCameraModal";
        modal.className = "manager-real-camera-modal";
        modal.innerHTML = `
            <div class="manager-real-camera-box">
                <div class="manager-real-camera-header">
                    <span id="managerRealCameraTitle">Photographier le document</span>
                    <button type="button" onclick="closeManagerExtraDocumentCamera()">Fermer</button>
                </div>

                <div class="manager-real-camera-stage">
                    <video id="managerRealCameraVideo" autoplay playsinline muted></video>
                    <div class="manager-real-camera-frame"></div>
                </div>

                <p id="managerRealCameraInstruction" class="manager-real-camera-instruction">
                    Placez le document dans le cadre puis cliquez sur capturer.
                </p>

                <div class="manager-real-camera-actions">
                    <button type="button" class="doc-action-btn" onclick="captureManagerExtraDocumentPhoto()">
                        📸 Capturer la photo
                    </button>

                    <button type="button" class="doc-action-btn secondary" onclick="closeManagerExtraDocumentCamera()">
                        Annuler
                    </button>
                </div>

                <div id="managerRealCameraError" class="manager-real-camera-error"></div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    function getDocLabel(documentType) {
        if (documentType === "INCOME_PROOF") return "Preuve de revenu / activité";
        if (documentType === "RIB_DOCUMENT") return "Relevé d’identification bancaire - RIB";
        return "Document";
    }

    function getStatusId(documentType) {
        return documentType === "INCOME_PROOF" ? "incomeProofCaptureStatus" : "ribDocumentCaptureStatus";
    }

    function getPreviewId(documentType) {
        return documentType === "INCOME_PROOF" ? "incomeProofPreview" : "ribDocumentPreview";
    }

    window.openManagerExtraDocumentCamera = async function(documentType) {
        insertManagerCameraModal();

        managerExtraDocCurrentType = documentType;

        const modal = document.getElementById("managerRealCameraModal");
        const video = document.getElementById("managerRealCameraVideo");
        const errorBox = document.getElementById("managerRealCameraError");
        const title = document.getElementById("managerRealCameraTitle");
        const instruction = document.getElementById("managerRealCameraInstruction");

        errorBox.innerText = "";
        title.innerText = "Photographier : " + getDocLabel(documentType);
        instruction.innerText = "Placez le document entièrement dans le cadre, sans reflet, puis cliquez sur capturer.";

        try {
            managerExtraDocStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            video.srcObject = managerExtraDocStream;
            modal.style.display = "flex";
        } catch (error) {
            errorBox.innerText = "Impossible d’ouvrir la caméra. Vérifiez l’autorisation caméra du navigateur.";
            modal.style.display = "flex";
        }
    };

    window.closeManagerExtraDocumentCamera = function() {
        const modal = document.getElementById("managerRealCameraModal");
        const video = document.getElementById("managerRealCameraVideo");

        if (managerExtraDocStream) {
            managerExtraDocStream.getTracks().forEach(track => track.stop());
            managerExtraDocStream = null;
        }

        if (video) {
            video.srcObject = null;
        }

        if (modal) {
            modal.style.display = "none";
        }
    };

    window.captureManagerExtraDocumentPhoto = function() {
        const video = document.getElementById("managerRealCameraVideo");
        const errorBox = document.getElementById("managerRealCameraError");

        if (!video || !video.videoWidth || !video.videoHeight) {
            errorBox.innerText = "Caméra non prête. Attendez une seconde puis réessayez.";
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function(blob) {
            if (!blob) {
                errorBox.innerText = "Impossible de capturer la photo.";
                return;
            }

            const safeType = managerExtraDocCurrentType || "DOCUMENT";
            const fileName = safeType.toLowerCase() + "_" + Date.now() + ".jpg";

            const file = new File([blob], fileName, { type: "image/jpeg" });

            window.managerExtraDocumentFiles[safeType] = file;

            const status = document.getElementById(getStatusId(safeType));
            const preview = document.getElementById(getPreviewId(safeType));

            if (status) {
                status.className = "capture-status success";
                status.innerText = "📷 " + getDocLabel(safeType) + " photographié ✓";
            }

            if (preview) {
                const url = URL.createObjectURL(file);
                preview.style.display = "block";
                preview.innerHTML = `<img src="${url}" alt="${getDocLabel(safeType)} capturé">`;
            }

            closeManagerExtraDocumentCamera();
        }, "image/jpeg", 0.92);
    };

    window.uploadManagerExtraDocuments = async function(applicationId) {
        if (!window.managerExtraDocumentFiles.INCOME_PROOF) {
            throw new Error("Veuillez photographier la preuve de justification de vos revenus ou votre activité.");
        }

        if (!window.managerExtraDocumentFiles.RIB_DOCUMENT) {
            throw new Error("Veuillez photographier le relevé d’identification bancaire - RIB.");
        }

        await uploadFileObject(applicationId, "INCOME_PROOF", window.managerExtraDocumentFiles.INCOME_PROOF);
        await uploadFileObject(applicationId, "RIB_DOCUMENT", window.managerExtraDocumentFiles.RIB_DOCUMENT);
    };

    insertManagerDocsBlock();
    insertManagerCameraModal();

    console.log("MANAGER_FORM_MODIF4_REAL_CAMERA_INCOME_RIB actif.");
});

;/* ==== bloc script 9/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerModif6IdentityAddressInstalled === true) return;
    window.managerModif6IdentityAddressInstalled = true;

    let addressCameraStream = null;

    function hideIdentityImport() {
        const identityStatus = document.getElementById("identityCaptureStatus");

        if (!identityStatus) return;

        const statusTop = identityStatus.getBoundingClientRect().top;

        document.querySelectorAll('input[type="file"]').forEach(function(input){
            const rect = input.getBoundingClientRect();

            // Le champ import de la pièce d'identité est avant identityCaptureStatus.
            // Le justificatif domicile vient après, donc on ne le touche pas.
            if (rect.top < statusTop && (statusTop - rect.top) < 260) {
                input.required = false;
                input.disabled = true;
                input.style.display = "none";

                const wrapper =
                    input.closest(".upload-box") ||
                    input.closest(".file-upload") ||
                    input.closest(".form-group") ||
                    input.closest(".field") ||
                    input.closest("div");

                if (wrapper && wrapper !== document.body) {
                    wrapper.style.display = "none";
                }
            }
        });

        // Sécurité : empêcher l'ancienne logique d'import d'être utilisée.
        if (typeof identityDocumentFiles !== "undefined") {
            identityDocumentFiles.imported = null;
        }
    }

    function overrideIdentityUploadPhotoOnly() {
        try {
            uploadIdentityDocuments = async function(applicationId) {
                if (typeof identityDocumentFiles === "undefined") {
                    throw new Error("Module de capture pièce indisponible.");
                }

                identityDocumentFiles.imported = null;

                if (!identityDocumentFiles.recto) {
                    throw new Error("Veuillez photographier la pièce d’identité.");
                }

                await uploadFileObject(applicationId, "IDENTITY_DOCUMENT_RECTO", identityDocumentFiles.recto);

                if (typeof documentNeedsBackSide === "function" && documentNeedsBackSide()) {
                    if (!identityDocumentFiles.verso) {
                        throw new Error("Veuillez photographier le verso de la pièce d’identité.");
                    }

                    await uploadFileObject(applicationId, "IDENTITY_DOCUMENT_VERSO", identityDocumentFiles.verso);
                }
            };

            console.log("MODIF6 : upload identité forcé en photo uniquement.");
        } catch(e) {
            console.log("MODIF6 : impossible de remplacer uploadIdentityDocuments", e);
        }
    }

    function insertAddressButtons() {
        const addressInput = document.getElementById("address_photo");

        if (!addressInput || document.getElementById("managerAddressActions")) return;

        addressInput.required = false;
        addressInput.style.display = "none";
        addressInput.setAttribute("accept", "image/*,.pdf");

        const wrapper =
            addressInput.closest(".full") ||
            addressInput.closest(".form-group") ||
            addressInput.closest(".field") ||
            addressInput.closest("div") ||
            addressInput.parentElement;

        if (!wrapper) return;

        const actions = document.createElement("div");
        actions.id = "managerAddressActions";
        actions.className = "manager-address-actions";
        actions.innerHTML = `
            <button type="button" class="doc-action-btn" onclick="openManagerAddressCamera()">
                📷 Photographier le justificatif de domicile
            </button>

            <button type="button" class="doc-action-btn secondary" onclick="importManagerAddressDocument()">
                📁 Importer le justificatif de domicile
            </button>
        `;

        const status = document.createElement("div");
        status.id = "managerAddressStatus";
        status.className = "capture-status manager-address-status";
        status.innerText = "Aucun justificatif de domicile ajouté.";

        const preview = document.createElement("div");
        preview.id = "managerAddressPreview";
        preview.className = "manager-address-preview";

        addressInput.insertAdjacentElement("beforebegin", actions);
        addressInput.insertAdjacentElement("afterend", status);
        status.insertAdjacentElement("afterend", preview);

        addressInput.addEventListener("change", function(){
            updateAddressStatusFromInput("importé");
        });
    }

    function insertAddressCameraModal() {
        if (document.getElementById("managerAddressCameraModal")) return;

        const modal = document.createElement("div");
        modal.id = "managerAddressCameraModal";
        modal.className = "manager-address-camera-modal";
        modal.innerHTML = `
            <div class="manager-address-camera-box">
                <div class="manager-address-camera-header">
                    <span>Photographier le justificatif de domicile</span>
                    <button type="button" onclick="closeManagerAddressCamera()">Fermer</button>
                </div>

                <div class="manager-address-camera-stage">
                    <video id="managerAddressCameraVideo" autoplay playsinline muted></video>
                    <div class="manager-address-camera-frame"></div>
                </div>

                <p class="manager-address-camera-instruction">
                    Placez le justificatif de domicile entièrement dans le cadre puis cliquez sur capturer.
                </p>

                <div class="manager-address-camera-actions">
                    <button type="button" class="doc-action-btn" onclick="captureManagerAddressPhoto()">
                        📸 Capturer la photo
                    </button>

                    <button type="button" class="doc-action-btn secondary" onclick="closeManagerAddressCamera()">
                        Annuler
                    </button>
                </div>

                <div id="managerAddressCameraError" class="manager-address-camera-error"></div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    function updateAddressStatusFromInput(mode) {
        const input = document.getElementById("address_photo");
        const status = document.getElementById("managerAddressStatus");
        const preview = document.getElementById("managerAddressPreview");

        if (!input || !status) return;

        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            status.className = "capture-status success manager-address-status";
            status.innerText = "✅ Justificatif de domicile " + mode + " : " + file.name;

            if (preview && file.type && file.type.startsWith("image/")) {
                const url = URL.createObjectURL(file);
                preview.style.display = "block";
                preview.innerHTML = `<img src="${url}" alt="Justificatif de domicile">`;
            } else if (preview) {
                preview.style.display = "none";
                preview.innerHTML = "";
            }
        } else {
            status.className = "capture-status manager-address-status";
            status.innerText = "Aucun justificatif de domicile ajouté.";
        }
    }

    window.importManagerAddressDocument = function() {
        const input = document.getElementById("address_photo");
        if (input) input.click();
    };

    window.openManagerAddressCamera = async function() {
        insertAddressCameraModal();

        const modal = document.getElementById("managerAddressCameraModal");
        const video = document.getElementById("managerAddressCameraVideo");
        const errorBox = document.getElementById("managerAddressCameraError");

        errorBox.innerText = "";

        try {
            addressCameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            video.srcObject = addressCameraStream;
            modal.style.display = "flex";
        } catch (error) {
            errorBox.innerText = "Impossible d’ouvrir la caméra. Vérifiez l’autorisation caméra du navigateur.";
            modal.style.display = "flex";
        }
    };

    window.closeManagerAddressCamera = function() {
        const modal = document.getElementById("managerAddressCameraModal");
        const video = document.getElementById("managerAddressCameraVideo");

        if (addressCameraStream) {
            addressCameraStream.getTracks().forEach(track => track.stop());
            addressCameraStream = null;
        }

        if (video) {
            video.srcObject = null;
        }

        if (modal) {
            modal.style.display = "none";
        }
    };

    window.captureManagerAddressPhoto = function() {
        const video = document.getElementById("managerAddressCameraVideo");
        const errorBox = document.getElementById("managerAddressCameraError");
        const input = document.getElementById("address_photo");

        if (!video || !video.videoWidth || !video.videoHeight) {
            errorBox.innerText = "Caméra non prête. Attendez une seconde puis réessayez.";
            return;
        }

        if (!input) {
            errorBox.innerText = "Champ justificatif de domicile introuvable.";
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function(blob) {
            if (!blob) {
                errorBox.innerText = "Impossible de capturer la photo.";
                return;
            }

            const file = new File([blob], "justificatif_domicile_" + Date.now() + ".jpg", {
                type: "image/jpeg"
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;

            updateAddressStatusFromInput("photographié");
            closeManagerAddressCamera();
        }, "image/jpeg", 0.92);
    };

    hideIdentityImport();
    overrideIdentityUploadPhotoOnly();
    insertAddressButtons();
    insertAddressCameraModal();

    setTimeout(hideIdentityImport, 500);
    setTimeout(hideIdentityImport, 1500);

    console.log("MANAGER_FORM_MODIF6_IDENTITY_ADDRESS actif.");
});

;/* ==== bloc script 10/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerSelfieSafeInstalled === true) return;
    window.managerSelfieSafeInstalled = true;

    const MAX_VIDEO_SECONDS = 5;

    function ensureSelfieSectionVisible() {
        const selfieStatus = document.getElementById("selfieCaptureStatus");
        const selfieModal = document.getElementById("selfieModal");

        if (selfieStatus) {
            let el = selfieStatus;
            for (let i = 0; i < 5 && el; i++) {
                if (el.style && el.style.display === "none") {
                    el.style.display = "";
                }
                el = el.parentElement;
            }
        }

        if (selfieModal) {
            selfieModal.style.display = "none";
        }
    }

    function addSelfieRequiredNote() {
        const selfieStatus = document.getElementById("selfieCaptureStatus");

        if (!selfieStatus || document.getElementById("managerSelfieRequiredNote")) return;

        const note = document.createElement("div");
        note.id = "managerSelfieRequiredNote";
        note.className = "manager-selfie-required-note";
        note.innerText = "Selfie obligatoire : vous devez capturer un selfie réel. L’import simple du selfie n’est pas accepté.";

        selfieStatus.insertAdjacentElement("beforebegin", note);
    }

    function hideOnlySelfieImportControls() {
        // On ne cache plus les grands blocs parents.
        // On cache uniquement les contrôles dont le texte parle explicitement d'import selfie.
        document.querySelectorAll("button, a, label").forEach(function(el){
            const txt = (el.textContent || "").toLowerCase();

            if (
                txt.includes("selfie") &&
                (txt.includes("import") || txt.includes("importer"))
            ) {
                el.classList.add("manager-hide-selfie-import-only");
            }
        });

        document.querySelectorAll('input[type="file"]').forEach(function(input){
            const id = (input.id || "").toLowerCase();
            const name = (input.name || "").toLowerCase();

            if (
                id.includes("selfie") ||
                name.includes("selfie")
            ) {
                input.required = false;
                input.disabled = true;
                input.classList.add("manager-hide-selfie-import-only");
            }
        });

        try {
            if (typeof selfieFiles !== "undefined") {
                selfieFiles.imported = null;
            }
        } catch(e) {}
    }

    function forceSelfiePhotoMandatoryUpload() {
        try {
            uploadSelfieDocument = async function(applicationId) {
                if (typeof selfieFiles === "undefined") {
                    throw new Error("Module selfie indisponible.");
                }

                selfieFiles.imported = null;

                if (!selfieFiles.photo) {
                    throw new Error("Veuillez obligatoirement capturer votre selfie.");
                }

                await uploadFileObject(applicationId, "SELFIE_PHOTO", selfieFiles.photo);

                if (selfieFiles.video) {
                    await uploadFileObject(applicationId, "SELFIE_VIDEO", selfieFiles.video);
                }
            };

            console.log("SELFIE_SAFE : selfie photo obligatoire.");
        } catch(e) {
            console.log("SELFIE_SAFE : surcharge uploadSelfieDocument impossible", e);
        }
    }

    function addSubmitValidation() {
        const form = document.querySelector("form");

        if (!form || form.dataset.managerSelfieSafeValidation === "1") return;

        form.dataset.managerSelfieSafeValidation = "1";

        form.addEventListener("submit", function(event){
            try {
                if (typeof selfieFiles !== "undefined") {
                    selfieFiles.imported = null;

                    if (!selfieFiles.photo) {
                        event.preventDefault();
                        event.stopPropagation();

                        alert("Veuillez obligatoirement capturer votre selfie avant de soumettre le formulaire.");

                        const selfieStatus = document.getElementById("selfieCaptureStatus");
                        if (selfieStatus) {
                            selfieStatus.scrollIntoView({ behavior: "smooth", block: "center" });
                        }

                        return false;
                    }
                }
            } catch(e) {}
        }, true);
    }

    function installVideoAutoStop() {
        if (!window.MediaRecorder || window.MediaRecorder.prototype._managerSafeAutoStopPatched) return;

        const originalStart = window.MediaRecorder.prototype.start;

        window.MediaRecorder.prototype.start = function() {
            const recorder = this;

            originalStart.apply(recorder, arguments);

            setTimeout(function(){
                try {
                    if (recorder && recorder.state === "recording") {
                        recorder.stop();
                        console.log("SELFIE_SAFE : vidéo arrêtée automatiquement après 5 secondes.");
                    }
                } catch(e) {}
            }, MAX_VIDEO_SECONDS * 1000);
        };

        window.MediaRecorder.prototype._managerSafeAutoStopPatched = true;
    }

    function addVideoTimerInfo() {
        const selfieModal = document.getElementById("selfieModal");

        if (!selfieModal || document.getElementById("managerVideoTimerInfo")) return;

        const actions = selfieModal.querySelector(".camera-actions") || selfieModal.querySelector("button")?.parentElement;

        const info = document.createElement("div");
        info.id = "managerVideoTimerInfo";
        info.className = "manager-video-timer";
        info.innerText = "Vidéo preuve de vie : l’enregistrement se coupe automatiquement après 5 secondes.";

        if (actions) {
            actions.insertAdjacentElement("beforebegin", info);
        } else {
            selfieModal.appendChild(info);
        }
    }

    ensureSelfieSectionVisible();
    addSelfieRequiredNote();
    hideOnlySelfieImportControls();
    forceSelfiePhotoMandatoryUpload();
    addSubmitValidation();
    installVideoAutoStop();
    addVideoTimerInfo();

    setTimeout(ensureSelfieSectionVisible, 500);
    setTimeout(hideOnlySelfieImportControls, 500);
    setTimeout(ensureSelfieSectionVisible, 1500);

    console.log("MANAGER_FORM_MODIF7_SELFIE_SAFE actif.");
});

;/* ==== bloc script 11/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerResidenceAutoStatusInstalled === true) return;
    window.managerResidenceAutoStatusInstalled = true;

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function findResidenceCountryField() {
        const selectors = [
            "#residence_country",
            "#country_of_residence",
            "#country_residence",
            "#pays_residence",
            "#residency_country",
            '[name="residence_country"]',
            '[name="country_of_residence"]',
            '[name="country_residence"]',
            '[name="pays_residence"]',
            '[name="residency_country"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }

        // Recherche de secours par le label visible "Pays de résidence"
        const labels = Array.from(document.querySelectorAll("label"));
        for (const label of labels) {
            const txt = normalizeText(label.textContent);

            if (txt.includes("pays de residence") || txt.includes("residence")) {
                const forId = label.getAttribute("for");

                if (forId && document.getElementById(forId)) {
                    return document.getElementById(forId);
                }

                const box =
                    label.closest(".form-group") ||
                    label.closest(".field") ||
                    label.closest(".full") ||
                    label.parentElement;

                if (box) {
                    const field = box.querySelector("select, input");
                    if (field && field.id !== "residency_status" && field.name !== "residency_status") {
                        return field;
                    }
                }
            }
        }

        return null;
    }

    function getFieldDisplayValue(field) {
        if (!field) return "";

        if (field.tagName && field.tagName.toLowerCase() === "select") {
            const selected = field.options[field.selectedIndex];
            return selected ? (selected.textContent || selected.value || "") : field.value;
        }

        return field.value || "";
    }

    function isCameroonResidence(value) {
        const v = normalizeText(value);

        return (
            v === "cameroun" ||
            v === "cameroon" ||
            v.includes("cameroun") ||
            v.includes("cameroon")
        );
    }

    function applyResidenceStatus() {
        const countryField = findResidenceCountryField();
        const statusField = document.getElementById("residency_status") || document.querySelector('[name="residency_status"]');
        const nonResidentBox = document.getElementById("nonResidentDocuments");

        if (!countryField || !statusField) {
            console.log("MODIF8 : champ pays de résidence ou residency_status introuvable.");
            return;
        }

        const residenceCountry = getFieldDisplayValue(countryField);
        const cameroon = isCameroonResidence(residenceCountry);

        statusField.value = cameroon ? "RESIDENT" : "NON_RESIDENT";

        if (nonResidentBox) {
            nonResidentBox.style.display = cameroon ? "none" : "";
        }

        if (typeof toggleNonResidentDocuments === "function") {
            try {
                toggleNonResidentDocuments();
            } catch(e) {}
        }

        console.log("MODIF8 : pays résidence =", residenceCountry, "=>", statusField.value);
    }

    function installResidenceListeners() {
        const countryField = findResidenceCountryField();

        if (!countryField || countryField.dataset.managerResidenceAutoStatus === "1") return;

        countryField.dataset.managerResidenceAutoStatus = "1";

        countryField.addEventListener("change", applyResidenceStatus);
        countryField.addEventListener("input", applyResidenceStatus);
        countryField.addEventListener("blur", applyResidenceStatus);

        const form = countryField.closest("form") || document.querySelector("form");
        if (form && form.dataset.managerResidenceSubmitCheck !== "1") {
            form.dataset.managerResidenceSubmitCheck = "1";
            form.addEventListener("submit", applyResidenceStatus, true);
        }
    }

    installResidenceListeners();
    applyResidenceStatus();

    setTimeout(function () {
        installResidenceListeners();
        applyResidenceStatus();
    }, 500);

    setTimeout(function () {
        installResidenceListeners();
        applyResidenceStatus();
    }, 1500);

    console.log("MANAGER_FORM_MODIF8_RESIDENCE_AUTO_STATUS actif.");
});

;/* ==== bloc script 12/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerModif9NonResidentDocButtonsInstalled === true) return;
    window.managerModif9NonResidentDocButtonsInstalled = true;

    let nonResidentCameraStream = null;
    let currentNonResidentInputId = null;

    const NON_RESIDENT_DOCS = {
        birth_certificate_photo: {
            label: "Acte de naissance ou pièce avec filiation",
            photoButton: "📷 Photographier",
            importButton: "📁 Importer",
            filePrefix: "acte_naissance_filiation"
        },
        employment_school_photo: {
            label: "Fiche de paie / attestation d’emploi / scolarité",
            photoButton: "📷 Photographier",
            importButton: "📁 Importer",
            filePrefix: "emploi_scolarite"
        },
        tax_compliance_photo: {
            label: "Attestation de conformité fiscale",
            photoButton: "📷 Photographier",
            importButton: "📁 Importer",
            filePrefix: "conformite_fiscale"
        }
    };

    function setupNonResidentDocumentInput(inputId, config) {
        const input = document.getElementById(inputId);

        if (!input || input.dataset.managerNonResidentEnhanced === "1") return;

        input.dataset.managerNonResidentEnhanced = "1";
        input.style.display = "none";
        input.setAttribute("accept", "image/*,.pdf");

        const actions = document.createElement("div");
        actions.id = inputId + "_actions";
        actions.className = "manager-nonresident-actions";
        actions.innerHTML = `
            <button type="button" class="doc-action-btn" onclick="openManagerNonResidentCamera('${inputId}')">
                ${config.photoButton}
            </button>

            <button type="button" class="doc-action-btn secondary" onclick="importManagerNonResidentDocument('${inputId}')">
                ${config.importButton}
            </button>
        `;

        const status = document.createElement("div");
        status.id = inputId + "_status";
        status.className = "capture-status manager-nonresident-status";
        status.innerText = "Aucun document ajouté.";

        const preview = document.createElement("div");
        preview.id = inputId + "_preview";
        preview.className = "manager-nonresident-preview";

        input.insertAdjacentElement("beforebegin", actions);
        input.insertAdjacentElement("afterend", status);
        status.insertAdjacentElement("afterend", preview);

        input.addEventListener("change", function () {
            updateNonResidentDocumentStatus(inputId, "importé");
        });
    }

    function updateNonResidentDocumentStatus(inputId, mode) {
        const input = document.getElementById(inputId);
        const status = document.getElementById(inputId + "_status");
        const preview = document.getElementById(inputId + "_preview");
        const config = NON_RESIDENT_DOCS[inputId];

        if (!input || !status || !config) return;

        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            status.className = "capture-status success manager-nonresident-status";
            status.innerText = "✅ " + config.label + " " + mode + " : " + file.name;

            if (preview && file.type && file.type.startsWith("image/")) {
                const url = URL.createObjectURL(file);
                preview.style.display = "block";
                preview.innerHTML = `<img src="${url}" alt="${config.label}">`;
            } else if (preview) {
                preview.style.display = "none";
                preview.innerHTML = "";
            }
        } else {
            status.className = "capture-status manager-nonresident-status";
            status.innerText = "Aucun document ajouté.";
        }
    }

    function insertNonResidentCameraModal() {
        if (document.getElementById("managerNonResidentCameraModal")) return;

        const modal = document.createElement("div");
        modal.id = "managerNonResidentCameraModal";
        modal.className = "manager-nonresident-camera-modal";
        modal.innerHTML = `
            <div class="manager-nonresident-camera-box">
                <div class="manager-nonresident-camera-header">
                    <span id="managerNonResidentCameraTitle">Photographier le document</span>
                    <button type="button" onclick="closeManagerNonResidentCamera()">Fermer</button>
                </div>

                <div class="manager-nonresident-camera-stage">
                    <video id="managerNonResidentCameraVideo" autoplay playsinline muted></video>
                    <div class="manager-nonresident-camera-frame"></div>
                </div>

                <p id="managerNonResidentCameraInstruction" class="manager-nonresident-camera-instruction">
                    Placez le document entièrement dans le cadre puis cliquez sur capturer.
                </p>

                <div class="manager-nonresident-camera-actions">
                    <button type="button" class="doc-action-btn" onclick="captureManagerNonResidentDocument()">
                        📸 Capturer la photo
                    </button>

                    <button type="button" class="doc-action-btn secondary" onclick="closeManagerNonResidentCamera()">
                        Annuler
                    </button>
                </div>

                <div id="managerNonResidentCameraError" class="manager-nonresident-camera-error"></div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    window.importManagerNonResidentDocument = function(inputId) {
        const input = document.getElementById(inputId);
        if (input) input.click();
    };

    window.openManagerNonResidentCamera = async function(inputId) {
        insertNonResidentCameraModal();

        const config = NON_RESIDENT_DOCS[inputId];

        currentNonResidentInputId = inputId;

        const modal = document.getElementById("managerNonResidentCameraModal");
        const video = document.getElementById("managerNonResidentCameraVideo");
        const errorBox = document.getElementById("managerNonResidentCameraError");
        const title = document.getElementById("managerNonResidentCameraTitle");
        const instruction = document.getElementById("managerNonResidentCameraInstruction");

        if (title && config) title.innerText = "Photographier : " + config.label;
        if (instruction) instruction.innerText = "Placez le document entièrement dans le cadre, sans reflet, puis cliquez sur capturer.";
        if (errorBox) errorBox.innerText = "";

        try {
            nonResidentCameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            video.srcObject = nonResidentCameraStream;
            modal.style.display = "flex";
        } catch (error) {
            if (errorBox) {
                errorBox.innerText = "Impossible d’ouvrir la caméra. Vérifiez l’autorisation caméra du navigateur.";
            }
            modal.style.display = "flex";
        }
    };

    window.closeManagerNonResidentCamera = function() {
        const modal = document.getElementById("managerNonResidentCameraModal");
        const video = document.getElementById("managerNonResidentCameraVideo");

        if (nonResidentCameraStream) {
            nonResidentCameraStream.getTracks().forEach(track => track.stop());
            nonResidentCameraStream = null;
        }

        if (video) video.srcObject = null;
        if (modal) modal.style.display = "none";
    };

    window.captureManagerNonResidentDocument = function() {
        const video = document.getElementById("managerNonResidentCameraVideo");
        const errorBox = document.getElementById("managerNonResidentCameraError");
        const input = document.getElementById(currentNonResidentInputId);
        const config = NON_RESIDENT_DOCS[currentNonResidentInputId];

        if (!video || !video.videoWidth || !video.videoHeight) {
            if (errorBox) errorBox.innerText = "Caméra non prête. Attendez une seconde puis réessayez.";
            return;
        }

        if (!input || !config) {
            if (errorBox) errorBox.innerText = "Champ document introuvable.";
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function(blob) {
            if (!blob) {
                if (errorBox) errorBox.innerText = "Impossible de capturer la photo.";
                return;
            }

            const file = new File([blob], config.filePrefix + "_" + Date.now() + ".jpg", {
                type: "image/jpeg"
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;

            updateNonResidentDocumentStatus(currentNonResidentInputId, "photographié");
            closeManagerNonResidentCamera();
        }, "image/jpeg", 0.92);
    };

    Object.keys(NON_RESIDENT_DOCS).forEach(function(inputId) {
        setupNonResidentDocumentInput(inputId, NON_RESIDENT_DOCS[inputId]);
    });

    insertNonResidentCameraModal();

    console.log("MANAGER_FORM_MODIF9_NONRESIDENT_DOC_BUTTONS actif.");
});

;/* ==== bloc script 13/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerIncomeCurrencyInstalled === true) return;
    window.managerIncomeCurrencyInstalled = true;

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function isValidIncomeField(field) {
        if (!field) return false;

        const type = normalizeText(field.type);
        const id = normalizeText(field.id);
        const name = normalizeText(field.name);

        if (type === "file" || type === "hidden" || type === "button" || type === "submit") {
            return false;
        }

        if (id.includes("income_proof") || name.includes("income_proof")) {
            return false;
        }

        if (id.includes("income_source_type") || name.includes("income_source_type")) {
            return false;
        }

        if (id.includes("currency") || name.includes("currency")) {
            return false;
        }

        return true;
    }

    function findIncomeRangeField() {
        const directSelectors = [
            "#income_range_ui",
            '[name="income_range_ui"]',
            "#income_range",
            "#monthly_income_range",
            "#revenue_range",
            "#salary_range",
            "#income_bracket",
            '[name="income_range"]',
            '[name="monthly_income_range"]',
            '[name="revenue_range"]',
            '[name="salary_range"]',
            '[name="income_bracket"]'
        ];

        for (const selector of directSelectors) {
            const field = document.querySelector(selector);
            if (isValidIncomeField(field)) return field;
        }

        // Recherche par label visible : "Tranche de revenu", "Revenu", etc.
        const labels = Array.from(document.querySelectorAll("label"));

        for (const label of labels) {
            const txt = normalizeText(label.textContent);

            if (
                txt.includes("tranche de revenus") ||
                txt.includes("tranche de revenu") ||
                txt.includes("tranche revenus") ||
                txt.includes("tranche revenu") ||
                txt.includes("revenu mensuel")
            ) {
                const forId = label.getAttribute("for");

                if (forId && isValidIncomeField(document.getElementById(forId))) {
                    return document.getElementById(forId);
                }

                const box =
                    label.closest(".form-group") ||
                    label.closest(".field") ||
                    label.closest(".full") ||
                    label.parentElement;

                if (box) {
                    const field = Array.from(box.querySelectorAll("select, input"))
                        .find(isValidIncomeField);

                    if (field) return field;
                }
            }
        }

        return null;
    }

    function insertIncomeCurrency() {
        if (document.getElementById("income_currency")) return;

        const incomeField = findIncomeRangeField();

        if (!incomeField) {
            console.log("MODIF10 : champ tranche de revenu introuvable.");
            return;
        }

        const wrapper =
            incomeField.closest(".form-group") ||
            incomeField.closest(".field") ||
            incomeField.closest(".full") ||
            incomeField.closest("div") ||
            incomeField.parentElement;

        if (!wrapper) {
            console.log("MODIF10 : conteneur tranche de revenu introuvable.");
            return;
        }

        const box = document.createElement("div");
        box.id = "managerIncomeCurrencyBox";
        box.className = "manager-income-currency-box";
        box.innerHTML = `
            <label for="income_currency">
                Devise de la tranche de revenu <span class="required-doc">*</span>
            </label>

            <select id="income_currency" name="income_currency" required>
                <option value="XAF" selected>FCFA - XAF</option>
                <option value="EUR">Euro - EUR</option>
                <option value="USD">Dollar US - USD</option>
            </select>

            <div class="manager-income-currency-help">
                Sélectionnez la devise correspondant à votre tranche de revenu déclarée.
            </div>
        `;

        wrapper.insertAdjacentElement("afterend", box);

        console.log("MANAGER_FORM_MODIF10_INCOME_CURRENCY actif.");
    }

    function ensureCurrencyBeforeSubmit() {
        const form = document.querySelector("form");

        if (!form || form.dataset.managerIncomeCurrencySubmit === "1") return;

        form.dataset.managerIncomeCurrencySubmit = "1";

        form.addEventListener("submit", function () {
            const currency = document.getElementById("income_currency");

            if (currency && !currency.value) {
                currency.value = "XAF";
            }
        }, true);
    }

    insertIncomeCurrency();
    ensureCurrencyBeforeSubmit();

    setTimeout(insertIncomeCurrency, 500);
    setTimeout(insertIncomeCurrency, 1500);
});

;/* ==== bloc script 14/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerIncomeLabelSyncInstalled === true) return;
    window.managerIncomeLabelSyncInstalled = true;

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function cleanIncomeLabels() {
        document.querySelectorAll("label").forEach(function(label) {
            const txt = normalizeText(label.textContent);

            if (txt.includes("tranche") && txt.includes("revenu") && txt.includes("fcfa")) {
                label.textContent = label.textContent
                    .replace(/\s*\(?FCFA\)?/gi, "")
                    .replace(/\s+$/g, "");
            }
        });
    }

    function addIncomeHelpText() {
        if (document.getElementById("managerIncomeRangeCurrencyHelp")) return;

        const labels = Array.from(document.querySelectorAll("label"));
        let incomeLabel = null;

        for (const label of labels) {
            const txt = normalizeText(label.textContent);
            if (txt.includes("tranche") && txt.includes("revenu")) {
                incomeLabel = label;
                break;
            }
        }

        if (!incomeLabel) return;

        const box =
            incomeLabel.closest(".form-group") ||
            incomeLabel.closest(".field") ||
            incomeLabel.closest(".full") ||
            incomeLabel.parentElement;

        if (!box) return;

        const help = document.createElement("div");
        help.id = "managerIncomeRangeCurrencyHelp";
        help.style.marginTop = "6px";
        help.style.color = "#6b7280";
        help.style.fontSize = "13px";
        help.innerText = "La devise de cette tranche est sélectionnée dans le champ Devise de la tranche de revenu.";

        box.appendChild(help);
    }

    cleanIncomeLabels();
    addIncomeHelpText();

    setTimeout(cleanIncomeLabels, 500);
    setTimeout(addIncomeHelpText, 500);
    setTimeout(cleanIncomeLabels, 1500);

    console.log("MANAGER_FORM_MODIF10B_INCOME_LABEL_SYNC actif.");
});

;/* ==== bloc script 15/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerIncomeRangeConversionInstalled === true) return;
    window.managerIncomeRangeConversionInstalled = true;

    const INCOME_CURRENCY_RATES = {
        XAF: {
            label: "FCFA",
            rate: 1,
            roundTo: 1
        },
        EUR: {
            label: "EUR",
            rate: 655.957,
            roundTo: 10
        },
        USD: {
            label: "USD",
            rate: 600,
            roundTo: 10
        }
    };

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function formatNumber(value) {
        const rounded = Math.round(value);
        return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    function roundAmount(value, roundTo) {
        if (!roundTo || roundTo <= 1) return Math.round(value);
        return Math.round(value / roundTo) * roundTo;
    }

    function parseAmount(raw) {
        const cleaned = String(raw || "").replace(/[^\d]/g, "");
        if (!cleaned) return null;
        return parseInt(cleaned, 10);
    }

    function convertIncomeLabel(baseLabel, currency) {
        const rule = INCOME_CURRENCY_RATES[currency] || INCOME_CURRENCY_RATES.XAF;

        let converted = String(baseLabel || "")
            .replace(/\s*(FCFA|XAF|EUR|USD|\$|€)\s*/gi, "")
            .trim();

        if (currency === "XAF") {
            return converted + " FCFA";
        }

        converted = converted.replace(/\d[\d\s.,]*/g, function(match) {
            const amountXaf = parseAmount(match);

            if (amountXaf === null) return match;

            const amountConverted = roundAmount(amountXaf / rule.rate, rule.roundTo);
            return formatNumber(amountConverted);
        });

        return converted + " " + rule.label;
    }

    function findIncomeRangeField() {
        const directSelectors = [
            "#income_range_ui",
            '[name="income_range_ui"]',
            "#income_range",
            "#monthly_income_range",
            "#revenue_range",
            "#salary_range",
            "#income_bracket",
            '[name="income_range"]',
            '[name="monthly_income_range"]',
            '[name="revenue_range"]',
            '[name="salary_range"]',
            '[name="income_bracket"]'
        ];

        for (const selector of directSelectors) {
            const field = document.querySelector(selector);
            if (field && field.tagName && field.tagName.toLowerCase() === "select") {
                return field;
            }
        }

        const labels = Array.from(document.querySelectorAll("label"));

        for (const label of labels) {
            const txt = normalizeText(label.textContent);

            if (txt.includes("tranche") && txt.includes("revenu")) {
                const forId = label.getAttribute("for");

                if (forId) {
                    const field = document.getElementById(forId);
                    if (field && field.tagName && field.tagName.toLowerCase() === "select") {
                        return field;
                    }
                }

                const box =
                    label.closest(".form-group") ||
                    label.closest(".field") ||
                    label.closest(".full") ||
                    label.parentElement;

                if (box) {
                    const field = Array.from(box.querySelectorAll("select"))
                        .find(function(select) {
                            const id = normalizeText(select.id);
                            const name = normalizeText(select.name);

                            return !id.includes("currency") && !name.includes("currency");
                        });

                    if (field) return field;
                }
            }
        }

        return null;
    }

    function ensureHiddenBaseField(incomeSelect) {
        let hidden = document.getElementById("income_range_base_xaf");

        if (!hidden) {
            hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.id = "income_range_base_xaf";
            hidden.name = "income_range_base_xaf";
            incomeSelect.insertAdjacentElement("afterend", hidden);
        }

        return hidden;
    }

    function saveBaseOptions(incomeSelect) {
        Array.from(incomeSelect.options).forEach(function(option) {
            if (!option.dataset.baseXafText) {
                const cleanBase = String(option.textContent || option.value || "")
                    .replace(/\s*(FCFA|XAF|EUR|USD|\$|€)\s*/gi, "")
                    .trim();

                option.dataset.baseXafText = cleanBase;
                option.dataset.baseXafValue = cleanBase;
            }
        });
    }

    function updateIncomeRangeByCurrency() {
        const incomeSelect = findIncomeRangeField();
        const currencySelect = document.getElementById("income_currency");

        if (!incomeSelect || !currencySelect) {
            console.log("MODIF10C : champ tranche ou devise introuvable.");
            return;
        }

        saveBaseOptions(incomeSelect);

        const selectedIndex = incomeSelect.selectedIndex;
        const currency = currencySelect.value || "XAF";
        const hiddenBase = ensureHiddenBaseField(incomeSelect);

        Array.from(incomeSelect.options).forEach(function(option) {
            const baseText = option.dataset.baseXafText || option.textContent || option.value || "";
            const convertedLabel = convertIncomeLabel(baseText, currency);

            option.textContent = convertedLabel;
            option.value = convertedLabel;
        });

        if (selectedIndex >= 0 && incomeSelect.options[selectedIndex]) {
            incomeSelect.selectedIndex = selectedIndex;
            hiddenBase.value = incomeSelect.options[selectedIndex].dataset.baseXafText || "";
        }

        const oldHelp = document.getElementById("managerIncomeConversionHelp");
        if (oldHelp) oldHelp.remove();

        const help = document.createElement("div");
        help.id = "managerIncomeConversionHelp";
        help.style.marginTop = "6px";
        help.style.color = "#6b7280";
        help.style.fontSize = "13px";

        if (currency === "XAF") {
            help.innerText = "Les tranches sont affichées en FCFA.";
        } else if (currency === "EUR") {
            help.innerText = "Les tranches sont converties depuis les montants FCFA avec le taux indicatif 1 EUR = 655.957 FCFA.";
        } else if (currency === "USD") {
            help.innerText = "Les tranches sont converties depuis les montants FCFA avec un taux indicatif de démonstration 1 USD = 600 FCFA.";
        }

        incomeSelect.insertAdjacentElement("afterend", help);

        console.log("MODIF10C : tranches de revenu adaptées en", currency);
    }

    function installListeners() {
        const incomeSelect = findIncomeRangeField();
        const currencySelect = document.getElementById("income_currency");

        if (!incomeSelect || !currencySelect) return;

        saveBaseOptions(incomeSelect);

        if (currencySelect.dataset.managerIncomeConversionListener !== "1") {
            currencySelect.dataset.managerIncomeConversionListener = "1";
            currencySelect.addEventListener("change", updateIncomeRangeByCurrency);
        }

        if (incomeSelect.dataset.managerIncomeBaseListener !== "1") {
            incomeSelect.dataset.managerIncomeBaseListener = "1";
            incomeSelect.addEventListener("change", function() {
                const hiddenBase = ensureHiddenBaseField(incomeSelect);
                const selected = incomeSelect.options[incomeSelect.selectedIndex];

                if (selected) {
                    hiddenBase.value = selected.dataset.baseXafText || "";
                }
            });
        }

        updateIncomeRangeByCurrency();
    }

    installListeners();

    setTimeout(installListeners, 500);
    setTimeout(installListeners, 1500);

    console.log("MANAGER_FORM_MODIF10C_INCOME_RANGE_CONVERSION actif.");
});

;/* ==== bloc script 16/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerActivitySectorInstalled === true) return;
    window.managerActivitySectorInstalled = true;

    let managerSectors = [];

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function findProfessionField() {
        const directSelectors = [
            "#profession",
            "#occupation",
            "#job_title",
            '[name="profession"]',
            '[name="occupation"]',
            '[name="job_title"]'
        ];

        for (const selector of directSelectors) {
            const field = document.querySelector(selector);
            if (field) return field;
        }

        const labels = Array.from(document.querySelectorAll("label"));

        for (const label of labels) {
            const txt = normalizeText(label.textContent);

            if (txt.includes("profession")) {
                const forId = label.getAttribute("for");

                if (forId && document.getElementById(forId)) {
                    return document.getElementById(forId);
                }

                const box =
                    label.closest(".form-group") ||
                    label.closest(".field") ||
                    label.closest(".full") ||
                    label.parentElement;

                if (box) {
                    const field = box.querySelector("input, select, textarea");
                    if (field) return field;
                }
            }
        }

        return null;
    }

    function insertSectorField() {
        if (document.getElementById("activity_sector")) return;

        const professionField = findProfessionField();

        if (!professionField) {
            console.log("MODIF11 : champ Profession introuvable.");
            return;
        }

        const wrapper =
            professionField.closest(".form-group") ||
            professionField.closest(".field") ||
            professionField.closest(".full") ||
            professionField.closest("div") ||
            professionField.parentElement;

        if (!wrapper) {
            console.log("MODIF11 : conteneur Profession introuvable.");
            return;
        }

        const box = document.createElement("div");
        box.id = "managerActivitySectorBox";
        box.className = "manager-sector-box";
        box.innerHTML = `
            <label for="activity_sector">
                Secteur d’activité <span class="required-doc">*</span>
            </label>

            <select id="activity_sector" name="activity_sector" required>
                <option value="">Chargement des secteurs...</option>
            </select>

            <input type="hidden" id="activity_sector_code" name="activity_sector_code">
            <input type="hidden" id="sector_of_activity" name="sector_of_activity">
            <input type="hidden" id="economic_sector" name="economic_sector">

            <div class="manager-sector-help">
                La liste est chargée depuis le système de la banque.
            </div>
        `;

        wrapper.insertAdjacentElement("afterend", box);
    }

    function renderSectorOptions(filterText = "") {
        const select = document.getElementById("activity_sector");
        const hiddenCode = document.getElementById("activity_sector_code");
        const hiddenSector = document.getElementById("sector_of_activity");
        const hiddenEconomic = document.getElementById("economic_sector");

        if (!select) return;

        const previousValue = select.value;
        const filter = normalizeText(filterText);

        select.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Sélectionner le secteur d’activité";
        select.appendChild(defaultOption);

        managerSectors
            .filter(function(item) {
                const label = normalizeText((item.code || "") + " " + (item.name || ""));
                return !filter || label.includes(filter);
            })
            .forEach(function(item) {
                const option = document.createElement("option");
                option.value = item.name;
                option.dataset.code = item.code;
                option.textContent = item.name;
                select.appendChild(option);
            });

        if (previousValue) {
            const found = Array.from(select.options).find(function(option) {
                return option.value === previousValue;
            });

            if (found) {
                select.value = previousValue;
            }
        }

        function syncHiddenFields() {
            const selected = select.options[select.selectedIndex];
            const code = selected ? selected.dataset.code || "" : "";
            const name = select.value || "";

            if (hiddenCode) hiddenCode.value = code;
            if (hiddenSector) hiddenSector.value = name;
            if (hiddenEconomic) hiddenEconomic.value = name;
        }

        select.onchange = syncHiddenFields;
        syncHiddenFields();
    }

    async function loadSectors() {
        const select = document.getElementById("activity_sector");

        if (!select) return;

        try {
            const response = await fetch("/api/sectors/active");

            if (!response.ok) {
                throw new Error("Erreur API secteurs : " + response.status);
            }

            const data = await response.json();
            managerSectors = Array.isArray(data) ? data : [];

            if (managerSectors.length === 0) {
                select.innerHTML = '<option value="">Aucun secteur disponible</option>';
                return;
            }

            renderSectorOptions("");
            console.log("MODIF11 : secteurs chargés =", managerSectors.length);
        } catch (error) {
            console.log("MODIF11 : impossible de charger les secteurs", error);
            select.innerHTML = '<option value="">Erreur de chargement des secteurs</option>';
        }
    }

    function installSectorSearch() {
        const search = document.getElementById("activity_sector_search");

        if (!search || search.dataset.managerSectorSearch === "1") return;

        search.dataset.managerSectorSearch = "1";

        search.addEventListener("input", function () {
            renderSectorOptions(search.value);
        });
    }

    function addSubmitValidation() {
        const form = document.querySelector("form");

        if (!form || form.dataset.managerSectorSubmitValidation === "1") return;

        form.dataset.managerSectorSubmitValidation = "1";

        form.addEventListener("submit", function(event) {
            const sector = document.getElementById("activity_sector");

            if (sector && !sector.value) {
                event.preventDefault();
                event.stopPropagation();

                alert("Veuillez sélectionner votre secteur d’activité.");

                sector.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                return false;
            }
        }, true);
    }

    function patchApplicationPayloadWithSector() {
        if (window.managerSectorFetchPatched === true) return;
        window.managerSectorFetchPatched = true;

        const originalFetch = window.fetch;

        window.fetch = async function(resource, init) {
            try {
                const url = typeof resource === "string" ? resource : String(resource && resource.url || "");

                if (
                    init &&
                    init.method &&
                    String(init.method).toUpperCase() === "POST" &&
                    url.includes("/api/applications") &&
                    !url.includes("/documents") &&
                    init.body &&
                    typeof init.body === "string"
                ) {
                    const sector = document.getElementById("activity_sector");
                    const sectorCode = document.getElementById("activity_sector_code");

                    if (sector && sector.value) {
                        const body = JSON.parse(init.body);

                        body.activity_sector = sector.value;
                        body.activity_sector_code = sectorCode ? sectorCode.value : "";
                        body.sector_of_activity = sector.value;
                        body.economic_sector = sector.value;

                        init = Object.assign({}, init, {
                            body: JSON.stringify(body)
                        });

                        console.log("MODIF11 : secteur ajouté au dossier :", sector.value);
                    }
                }
            } catch(e) {
                console.log("MODIF11 : patch payload secteur ignoré", e);
            }

            return originalFetch(resource, init);
        };
    }

    insertSectorField();
    installSectorSearch();
    addSubmitValidation();
    patchApplicationPayloadWithSector();
    loadSectors();

    setTimeout(function () {
        insertSectorField();
        installSectorSearch();
        loadSectors();
    }, 800);

    console.log("MANAGER_FORM_MODIF11_ACTIVITY_SECTOR actif.");
});

;/* ==== bloc script 17/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerFlowAccountTypeInstalled === true) return;
    window.managerFlowAccountTypeInstalled = true;

    function getAccountTypeFromFlow() {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get("account_type");
        const fromStorage = localStorage.getItem("diaspora_account_type");

        return fromUrl || fromStorage || "PERSONAL";
    }

    function getAccountTypeLabel(type) {
        if (type === "BUSINESS") return "Compte entreprise";
        return "Compte personnel";
    }

    function insertAccountTypeBanner() {
        if (document.getElementById("managerAccountTypeBanner")) return;

        const type = getAccountTypeFromFlow();
        const label = getAccountTypeLabel(type);

        const form = document.querySelector("form");
        if (!form) return;

        const banner = document.createElement("div");
        banner.id = "managerAccountTypeBanner";
        banner.className = "manager-account-type-banner";
        // AFB_CLIENT_VIEW_CLEAN_V1 : carte masquée pour épurer la vue client ;
        // les champs cachés (type de compte) restent injectés plus bas.
        banner.style.display = "none";

        if (type === "BUSINESS") {
            banner.innerHTML = `
                <strong>Type de demande : ${label}</strong>
                <div class="hint">
                    Vous avez choisi une ouverture de compte entreprise.
                    Cette première version affiche le choix dans le formulaire.
                    Les champs spécifiques entreprise seront ajoutés dans l’étape suivante.
                </div>
            `;
        } else {
            banner.innerHTML = `
                <strong>Type de demande : ${label}</strong>
                <div class="hint">
                    Vous avez choisi une ouverture de compte personnel.
                </div>
            `;
        }

        form.insertAdjacentElement("afterbegin", banner);

        const hiddenAccountType = document.createElement("input");
        hiddenAccountType.type = "hidden";
        hiddenAccountType.id = "onboarding_account_type";
        hiddenAccountType.name = "onboarding_account_type";
        hiddenAccountType.value = type;

        const hiddenCustomerType = document.createElement("input");
        hiddenCustomerType.type = "hidden";
        hiddenCustomerType.id = "customer_type";
        hiddenCustomerType.name = "customer_type";
        hiddenCustomerType.value = type === "BUSINESS" ? "CORPORATE" : "INDIVIDUAL";

        const hiddenApplicationType = document.createElement("input");
        hiddenApplicationType.type = "hidden";
        hiddenApplicationType.id = "application_type";
        hiddenApplicationType.name = "application_type";
        hiddenApplicationType.value = type;

        form.appendChild(hiddenAccountType);
        form.appendChild(hiddenCustomerType);
        form.appendChild(hiddenApplicationType);

        console.log("FLOW ACCOUNT TYPE :", type);
    }

    function patchPayloadWithAccountType() {
        if (window.managerAccountTypePayloadPatched === true) return;
        window.managerAccountTypePayloadPatched = true;

        const originalFetch = window.fetch;

        window.fetch = async function(resource, init) {
            try {
                const url = typeof resource === "string" ? resource : String(resource && resource.url || "");

                if (
                    init &&
                    init.method &&
                    String(init.method).toUpperCase() === "POST" &&
                    url.includes("/api/applications") &&
                    !url.includes("/documents") &&
                    init.body &&
                    typeof init.body === "string"
                ) {
                    const accountType = document.getElementById("onboarding_account_type");
                    const customerType = document.getElementById("customer_type");
                    const applicationType = document.getElementById("application_type");

                    const body = JSON.parse(init.body);

                    body.onboarding_account_type = accountType ? accountType.value : "PERSONAL";
                    body.customer_type = customerType ? customerType.value : "INDIVIDUAL";
                    body.application_type = applicationType ? applicationType.value : "PERSONAL";

                    init = Object.assign({}, init, {
                        body: JSON.stringify(body)
                    });

                    console.log("Type de demande ajouté au payload :", body.onboarding_account_type);
                }
            } catch(e) {
                console.log("Patch type compte ignoré", e);
            }

            return originalFetch(resource, init);
        };
    }

    insertAccountTypeBanner();
    patchPayloadWithAccountType();

    console.log("MANAGER_FORM_FLOW_ACCOUNT_TYPE actif.");
});

;/* ==== bloc script 18/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerOcrPrefillInstalled === true) return;
    window.managerOcrPrefillInstalled = true;

    function getOcrStore() {
        try {
            return JSON.parse(localStorage.getItem("diaspora_pre_onboarding_ocr") || "{}");
        } catch (e) {
            return {};
        }
    }

    function normalizeDate(value) {
        if (!value) return "";

        const v = String(value).trim();

        // dd/mm/yyyy -> yyyy-mm-dd pour input type=date
        const m1 = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m1) {
            return `${m1[3]}-${m1[2]}-${m1[1]}`;
        }

        // yyyy-mm-dd déjà correct
        const m2 = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m2) {
            return v;
        }

        return v;
    }

    function normalizeSex(value) {
        if (!value) return "";

        const v = String(value).trim().toUpperCase();

        if (v === "M" || v === "MALE" || v === "MASCULIN") return "M";
        if (v === "F" || v === "FEMALE" || v === "FEMININ" || v === "FÉMININ") return "F";

        return v;
    }

    function findField(candidates) {
        for (const name of candidates) {
            let el =
                document.getElementById(name) ||
                document.querySelector(`[name="${name}"]`) ||
                document.querySelector(`[data-field="${name}"]`);

            if (el) return el;
        }

        return null;
    }

    function setField(candidates, value, options = {}) {
        if (value === undefined || value === null || value === "") return false;

        const el = findField(candidates);
        if (!el) return false;

        // Ne pas écraser une valeur déjà saisie ou déjà remplie
        if (!options.force && el.value && String(el.value).trim() !== "") {
            return false;
        }

        let finalValue = value;

        if (options.date === true) {
            finalValue = normalizeDate(value);
        }

        if (options.sex === true) {
            finalValue = normalizeSex(value);
        }

        el.value = finalValue;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.classList.add("ocr-prefilled-field");

        return true;
    }

    function insertPrefillBanner(count, prefill) {
        // AFB_CLIENT_VIEW_CLEAN_V1 : bannière de préremplissage désactivée pour
        // épurer la vue client (le préremplissage des champs reste actif).
        return;

        if (document.getElementById("ocrPrefillBanner")) return;

        const form = document.querySelector("form");
        if (!form) return;

        const banner = document.createElement("div");
        banner.id = "ocrPrefillBanner";
        banner.className = "ocr-prefill-banner";

        banner.innerHTML = `
            <strong>Préremplissage OCR appliqué</strong><br>
            ${count} champ(s) ont été préremplis à partir des documents analysés.
            <div class="ocr-prefill-small">
                Les informations restent modifiables avant validation finale du dossier.
            </div>
        `;

        form.insertAdjacentElement("afterbegin", banner);
    }

    function applyOcrPrefill() {
        const store = getOcrStore();
        // AFB_OCR_PREFILL_KEY_FIX_V1 : la page de pré-onboarding écrit les champs
        // fusionnés sous `extracted_fields` — `prefill` n'a jamais existé côté
        // producteur, ce qui laissait le formulaire vide.
        const prefill = store.prefill || store.extracted_fields || {};

        if (!prefill || Object.keys(prefill).length === 0) {
            console.log("Aucune donnée OCR à préremplir.");
            return;
        }

        let filled = 0;

        const lastName = prefill.last_name || prefill.surname;
        const firstName = prefill.first_name || prefill.given_names;
        const fullName = prefill.full_name;
        const identityNumber =
            prefill.identity_document_number ||
            prefill.cni_number ||
            prefill.passport_number;

        if (setField(["last_name", "surname", "nom", "customer_last_name", "lastname"], lastName)) filled++;
        if (setField(["first_name", "given_names", "prenom", "prénom", "customer_first_name", "firstname"], firstName)) filled++;

        // Si le formulaire a un champ nom complet
        if (setField(["full_name", "nom_complet", "customer_full_name", "complete_name"], fullName)) filled++;

        if (setField(["birth_date", "date_of_birth", "date_naissance"], prefill.birth_date, { date: true })) filled++;
        if (setField(["place_of_birth", "birth_place", "lieu_naissance"], prefill.place_of_birth)) filled++;
        if (setField(["nationality", "nationalite", "nationalité"], prefill.nationality)) filled++;
        if (setField(["sex", "gender", "sexe"], prefill.sex, { sex: true })) filled++;

        if (setField(["profession", "occupation", "job_title"], prefill.profession)) filled++;

        if (setField(["identity_document_number", "document_number", "id_number", "cni_number", "passport_number"], identityNumber)) filled++;
        if (setField(["identity_issue_date", "issue_date", "date_delivrance"], prefill.identity_issue_date, { date: true })) filled++;
        if (setField(["identity_expiry_date", "expiry_date", "date_expiration"], prefill.identity_expiry_date, { date: true })) filled++;

        if (setField(["email", "email_address"], prefill.email)) filled++;
        if (setField(["phone", "phone_number", "mobile_phone", "telephone", "téléphone"], prefill.phone)) filled++;

        if (setField(["niu", "tax_identification_number", "fiscal_number", "numero_fiscal", "numéro_fiscal"], prefill.niu || prefill.tax_identification_number)) filled++;

        if (setField(["rib", "iban", "bank_account_number", "iban_or_account_number"], prefill.rib || prefill.iban_or_account_number)) filled++;

        if (setField(["company_name", "business_name", "raison_sociale"], prefill.company_name)) filled++;
        if (setField(["rccm", "rccm_number", "business_registration_number"], prefill.rccm)) filled++;

        if (filled > 0) {
            insertPrefillBanner(filled, prefill);
            console.log("Préremplissage OCR appliqué :", filled, prefill);
        } else {
            console.log("Données OCR trouvées, mais aucun champ correspondant dans le formulaire :", prefill);
        }
    }

    // Petit délai pour laisser les autres scripts du formulaire créer/modifier les champs.
    setTimeout(applyOcrPrefill, 700);

    console.log("MANAGER_FORM_OCR_PREFILL_V1 actif.");
});

;/* ==== bloc script 19/40 (ordre du document preserve) ==== */

document.addEventListener("DOMContentLoaded", function () {
    if (window.managerOcrPrefillV2Installed === true) return;
    window.managerOcrPrefillV2Installed = true;

    function getOcrStoreV2() {
        try {
            return JSON.parse(localStorage.getItem("diaspora_pre_onboarding_ocr") || "{}");
        } catch (e) {
            return {};
        }
    }

    function normalizeDateV2(value) {
        if (!value) return "";

        const v = String(value).trim();

        const m1 = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

        const m2 = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m2) return v;

        return v;
    }

    function normalizeNationalityV2(value) {
        if (!value) return "";

        const v = String(value).trim().toUpperCase();

        if (
            v.includes("CAMEROON") ||
            v.includes("CAMEROUN") ||
            v.includes("CAMEROONIAN")
        ) {
            // AFB_OCR_NATIONALITY_LABEL_V2 : le référentiel des nationalités
            // attend « Camerounaise » (pas le pays « Cameroun »).
            return "Camerounaise";
        }

        return value;
    }

    function normalizeSexV2(value) {
        if (!value) return "";

        const v = String(value).trim().toUpperCase();

        if (v === "M" || v.includes("MALE") || v.includes("MASCULIN") || v.includes("HOMME")) {
            return "M";
        }

        if (v === "F" || v.includes("FEMALE") || v.includes("FEMININ") || v.includes("FÉMININ") || v.includes("FEMME")) {
            return "F";
        }

        return value;
    }

    function getFieldByNameOrIdV2(key) {
        return document.querySelector(`[name="${key}"]`) || document.getElementById(key);
    }

    function markOcrFieldV2(el) {
        if (!el) return;
        el.classList.add("ocr-prefilled-field");
        el.setAttribute("data-ocr-prefilled", "true");
    }

    function setInputV2(key, value, options = {}) {
        if (value === undefined || value === null || value === "") return false;

        const el = getFieldByNameOrIdV2(key);
        if (!el) return false;

        if (!options.force && el.value && String(el.value).trim() !== "") {
            return false;
        }

        let finalValue = value;

        if (options.date) finalValue = normalizeDateV2(value);
        if (options.nationality) finalValue = normalizeNationalityV2(value);
        if (options.sex) finalValue = normalizeSexV2(value);

        el.value = finalValue;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        markOcrFieldV2(el);

        return true;
    }

    function setSelectSmartV2(key, value, keywords = []) {
        if (value === undefined || value === null || value === "") return false;

        const el = getFieldByNameOrIdV2(key);
        if (!el || el.tagName !== "SELECT") return false;

        if (el.value && String(el.value).trim() !== "") return false;

        // AFB_OCR_SELECT_ACCENT_INSENSITIVE_V1 : l'OCR rend « ETUDIANT » sans
        // accent alors que les options portent « Étudiant » — comparaison
        // insensible aux accents des deux côtés.
        const foldV2 = s => String(s || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .trim()
            .toUpperCase();

        const wanted = foldV2(value);
        const allKeywords = [wanted].concat(keywords.map(foldV2)).filter(Boolean);

        for (const opt of Array.from(el.options)) {
            const optValue = foldV2(opt.value);
            const optText = foldV2(opt.textContent);

            if (allKeywords.includes(optValue) || allKeywords.includes(optText)) {
                el.value = opt.value;
                el.dispatchEvent(new Event("change", { bubbles: true }));
                markOcrFieldV2(el);
                return true;
            }

            if (allKeywords.some(k => k && (optText.includes(k) || optValue.includes(k)))) {
                el.value = opt.value;
                el.dispatchEvent(new Event("change", { bubbles: true }));
                markOcrFieldV2(el);
                return true;
            }
        }

        return false;
    }

    function updateNationalitySearchV2(value) {
        if (!value) return false;

        const normalized = normalizeNationalityV2(value);

        let filled = false;

        // AFB_OCR_NATIONALITY_ORDER_V2 : renseigner le champ de recherche SANS
        // simuler de saisie (l'événement input réinitialise la sélection), puis
        // poser la valeur cachée en dernier.
        const search = document.getElementById("nationalitySearch");
        if (search && (!search.value || search.value.trim() === "")) {
            search.value = normalized;
            markOcrFieldV2(search);
            filled = true;
        }

        const hidden = document.getElementById("nationality") || document.querySelector('[name="nationality"]');
        if (hidden && (!hidden.value || hidden.value.trim() === "" || hidden.value !== normalized)) {
            hidden.value = normalized;
            markOcrFieldV2(hidden);
            filled = true;
        }

        return filled;
    }

    function normalizeDocTextV2(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .trim()
            .toUpperCase();
    }

    function forceDocumentTypeV2(targetType) {
        const el = getFieldByNameOrIdV2("document_type_ui");
        if (!el || el.tagName !== "SELECT") return false;

        const target = normalizeDocTextV2(targetType);

        for (const opt of Array.from(el.options)) {
            const optValue = normalizeDocTextV2(opt.value);
            const optText = normalizeDocTextV2(opt.textContent);

            if (target === "CNI") {
                if (
                    optText.includes("CARTE NATIONALE") ||
                    optText.includes("IDENTITE") ||
                    optValue.includes("CARTE NATIONALE") ||
                    optValue.includes("IDENTITE")
                ) {
                    el.value = opt.value;
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    markOcrFieldV2(el);
                    return true;
                }
            }

            if (target === "PASSPORT") {
                if (
                    optText.includes("PASSEPORT") ||
                    optText.includes("PASSPORT") ||
                    optValue.includes("PASSEPORT") ||
                    optValue.includes("PASSPORT")
                ) {
                    el.value = opt.value;
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    markOcrFieldV2(el);
                    return true;
                }
            }

            if (target === "RESIDENCE_PERMIT") {
                if (
                    optText.includes("TITRE DE SEJOUR") ||
                    optText.includes("TITRE DE SÉJOUR") ||
                    optValue.includes("TITRE DE SEJOUR") ||
                    optValue.includes("TITRE DE SÉJOUR")
                ) {
                    el.value = opt.value;
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    markOcrFieldV2(el);
                    return true;
                }
            }

            if (target === "CONSULAR_CARD") {
                if (
                    optText.includes("CARTE CONSULAIRE") ||
                    optValue.includes("CARTE CONSULAIRE")
                ) {
                    el.value = opt.value;
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    markOcrFieldV2(el);
                    return true;
                }
            }
        }

        return false;
    }

    function setDocumentTypeV2(prefill) {
        const store = getOcrStoreV2();
        const selectedType = String(store.identity_document_type || "").toUpperCase();

        // Priorité absolue à votre choix explicite.
        if (selectedType === "CNI") return forceDocumentTypeV2("CNI");
        if (selectedType === "PASSPORT") return forceDocumentTypeV2("PASSPORT");
        if (selectedType === "RESIDENCE_PERMIT") return forceDocumentTypeV2("RESIDENCE_PERMIT");
        if (selectedType === "CONSULAR_CARD") return forceDocumentTypeV2("CONSULAR_CARD");

        // Fallback uniquement si aucun choix explicite n’existe.
        const textSource = JSON.stringify(prefill || {}).toUpperCase();

        if (
            prefill.passport_number ||
            textSource.includes("PASSPORT") ||
            textSource.includes("PASSEPORT")
        ) {
            return forceDocumentTypeV2("PASSPORT");
        }

        if (
            prefill.cni_number ||
            prefill.identity_document_number ||
            textSource.includes("CNI") ||
            textSource.includes("IDENTITY_DOCUMENT")
        ) {
            return forceDocumentTypeV2("CNI");
        }

        return false;
    }

    function applyOcrPrefillV2() {
        const store = getOcrStoreV2();
        // AFB_OCR_PREFILL_KEY_FIX_V1 : même correction que le module V1 —
        // les champs OCR sont stockés sous `extracted_fields`.
        const prefill = store.prefill || store.extracted_fields || {};

        if (!prefill || Object.keys(prefill).length === 0) {
            console.log("OCR V2 : aucune donnée disponible.");
            return;
        }

        let filled = 0;

        const lastName = prefill.last_name || prefill.surname;
        const firstName = prefill.first_name || prefill.given_names;
        const identityNumber =
            prefill.identity_document_number ||
            prefill.cni_number ||
            prefill.passport_number;

        if (setInputV2("last_name", lastName)) filled++;
        if (setInputV2("first_name", firstName)) filled++;
        if (setInputV2("birth_date", prefill.birth_date, { date: true })) filled++;
        if (setInputV2("birth_place", prefill.place_of_birth)) filled++;
        if (updateNationalitySearchV2(prefill.nationality)) filled++;
        if (setSelectSmartV2("sex", normalizeSexV2(prefill.sex), ["MASCULIN", "MALE", "HOMME"])) filled++;

        if (setInputV2("identity_document_number", identityNumber)) filled++;
        if (setInputV2("identity_document_issue_date", prefill.identity_issue_date, { date: true })) filled++;
        if (setInputV2("identity_document_issue_place", prefill.identity_issue_place || prefill.issue_place)) filled++;

        if (setDocumentTypeV2(prefill)) filled++;

        if (setInputV2("niu_ui", prefill.niu || prefill.tax_identification_number)) filled++;
        if (setInputV2("email", prefill.email)) filled++;

        // Le champ téléphone visible est phone_local, mais on ne force pas encore
        // car il faut découper indicatif + numéro local.
        if (setInputV2("rib", prefill.rib || prefill.iban_or_account_number)) filled++;

        // AFB_OCR_PROFESSION_SYNONYMS_V1 : la CNI porte souvent « ELEVE » —
        // rapproché de l'option « Étudiant » du formulaire.
        const professionKeywords = [prefill.profession || ""];
        if (/ELEVE|ECOLIER|LYCEEN|SCOLAIRE/i.test(String(prefill.profession || ""))) {
            professionKeywords.push("ETUDIANT");
        }
        if (setSelectSmartV2("profession_ui", prefill.profession, professionKeywords)) filled++;

        if (filled > 0) {
            let banner = document.getElementById("ocrPrefillBanner");

            if (banner) {
                banner.innerHTML = `
                    <strong>Préremplissage OCR appliqué</strong><br>
                    ${filled} champ(s) supplémentaires ont été vérifiés ou préremplis avec les vrais champs du formulaire.
                    <div class="ocr-prefill-small">
                        Source nom/date : ${prefill.identity_name_source || "OCR"} / ${prefill.identity_dates_source || "OCR"}.
                        Les informations restent modifiables avant validation finale.
                    </div>
                `;
            }

            console.log("OCR V2 exact fields appliqué :", filled, prefill);
        } else {
            console.log("OCR V2 : données trouvées mais aucun champ supplémentaire rempli.", prefill);
        }
    }

    setTimeout(applyOcrPrefillV2, 1400);

    console.log("MANAGER_FORM_OCR_PREFILL_V2_EXACT_FIELDS actif.");
});

;/* ==== bloc script 20/40 (ordre du document preserve) ==== */

(function () {
  const MARKER = "MANAGER_FORM_SUBSECTOR_ACTIVITY_V3_NO_RESET";
  let allSubsectors = [];
  let lastSectorSignature = null;

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’`]/g, "")
      .replace(/&/g, "et")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .toLowerCase()
      .trim();
  }

  function unique(values) {
    return Array.from(new Set(values.map(v => String(v || "").trim()).filter(Boolean)));
  }

  function getSectorCandidates() {
    const candidates = [];

    const selectors = [
      '[name="activity_sector_code"]',
      '#activity_sector_code',
      '[name="activity_sector"]',
      '#activity_sector',
      '[name="activity_sector_search"]',
      '#activity_sector_search'
    ];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (field) {
        if (field.value) candidates.push(field.value);

        if (field.tagName === "SELECT") {
          const opt = field.options[field.selectedIndex];
          if (opt) {
            if (opt.value) candidates.push(opt.value);
            if (opt.textContent) candidates.push(opt.textContent);
            if (opt.dataset.code) candidates.push(opt.dataset.code);
            if (opt.dataset.label) candidates.push(opt.dataset.label);
          }
        }
      });
    });

    const labels = Array.from(document.querySelectorAll("label"));
    const sectorLabel = labels.find(function (el) {
      const t = normalize(el.textContent);
      return t.includes("secteur") && t.includes("activite") && !t.includes("sous");
    });

    if (sectorLabel) {
      const container =
        sectorLabel.closest(".form-group, .mb-3, .col-md-6, .col-md-12, .field, div") ||
        sectorLabel.parentElement;

      if (container) {
        container.querySelectorAll("input, select, textarea").forEach(function (field) {
          if (field.value) candidates.push(field.value);

          if (field.tagName === "SELECT") {
            const opt = field.options[field.selectedIndex];
            if (opt) {
              if (opt.value) candidates.push(opt.value);
              if (opt.textContent) candidates.push(opt.textContent);
              if (opt.dataset.code) candidates.push(opt.dataset.code);
              if (opt.dataset.label) candidates.push(opt.dataset.label);
            }
          }
        });
      }
    }

    return unique(candidates);
  }

  function sectorSignature() {
    return getSectorCandidates().map(normalize).sort().join("|");
  }

  function ensureSubsectorBlock() {
    let select = document.getElementById("activity_subsector_select");
    if (select) return select;

    const labels = Array.from(document.querySelectorAll("label"));
    const sectorLabel = labels.find(function (el) {
      const t = normalize(el.textContent);
      return t.includes("secteur") && t.includes("activite") && !t.includes("sous");
    });

    const container = sectorLabel
      ? (sectorLabel.closest(".form-group, .mb-3, .col-md-6, .col-md-12, .field, div") || sectorLabel.parentElement)
      : null;

    const block = document.createElement("div");
    block.className = "subsector-block";
    block.innerHTML = `
      <label for="activity_subsector_select">Sous-secteur d’activité</label>

      <select id="activity_subsector_select">
        <option value="">Sélectionnez d’abord un secteur d’activité</option>
      </select>

      <input type="hidden" id="activity_subsector" name="activity_subsector" value="">
      <input type="hidden" id="activity_subsector_code" name="activity_subsector_code" value="">

      <div class="subsector-help" id="activity_subsector_help">
        Le sous-secteur est filtré automatiquement selon le secteur d’activité choisi.
      </div>
    `;

    if (container && container.parentNode) {
      container.insertAdjacentElement("afterend", block);
    } else {
      const form = document.querySelector("form");
      if (form) form.appendChild(block);
      else document.body.appendChild(block);
    }

    select = document.getElementById("activity_subsector_select");

    select.addEventListener("change", function () {
      const hiddenLabel = document.getElementById("activity_subsector");
      const hiddenCode = document.getElementById("activity_subsector_code");
      const selected = select.options[select.selectedIndex];

      hiddenCode.value = select.value || "";
      hiddenLabel.value = selected ? (selected.dataset.label || selected.textContent || "") : "";

      console.log(MARKER, "Sous-secteur sélectionné:", hiddenLabel.value, hiddenCode.value);
    });

    return select;
  }

  function matchSubsectorToSector(item, sectorCandidates) {
    const itemSectorCode = normalize(item.sector_code);
    const itemSectorLabel = normalize(item.sector);

    return sectorCandidates.some(function (candidate) {
      const c = normalize(candidate);

      return (
        c === itemSectorCode ||
        c === itemSectorLabel ||
        itemSectorCode.includes(c) ||
        c.includes(itemSectorCode) ||
        itemSectorLabel.includes(c) ||
        c.includes(itemSectorLabel)
      );
    });
  }

  function refreshSubsectorsBecauseSectorChanged() {
    const select = ensureSubsectorBlock();
    const hiddenLabel = document.getElementById("activity_subsector");
    const hiddenCode = document.getElementById("activity_subsector_code");
    const help = document.getElementById("activity_subsector_help");

    const previousValue = select.value;
    const sectorCandidates = getSectorCandidates();

    select.innerHTML = "";
    hiddenLabel.value = "";
    hiddenCode.value = "";

    if (sectorCandidates.length === 0) {
      select.disabled = true;
      select.innerHTML = '<option value="">Sélectionnez d’abord un secteur d’activité</option>';
      if (help) help.textContent = "Aucun secteur d’activité détecté pour l’instant.";
      return;
    }

    const filtered = allSubsectors.filter(function (item) {
      return matchSubsectorToSector(item, sectorCandidates);
    });

    if (filtered.length === 0) {
      select.disabled = true;
      select.innerHTML = '<option value="">Aucun sous-secteur trouvé pour ce secteur</option>';
      if (help) help.textContent = "Aucun sous-secteur correspondant au secteur sélectionné.";
      return;
    }

    select.disabled = false;
    select.innerHTML = '<option value="">Sélectionnez un sous-secteur</option>';

    filtered.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item.code || "";
      option.textContent = item.label || "";
      option.dataset.label = item.label || "";
      select.appendChild(option);
    });

    // Si le secteur n’a pas changé réellement et que l’ancienne valeur existe encore, on la conserve.
    if (previousValue && Array.from(select.options).some(opt => opt.value === previousValue)) {
      select.value = previousValue;
      const selected = select.options[select.selectedIndex];
      hiddenCode.value = select.value || "";
      hiddenLabel.value = selected ? (selected.dataset.label || selected.textContent || "") : "";
    }

    if (help) help.textContent = filtered.length + " sous-secteur(s) disponible(s).";

    console.log(MARKER, "Secteur détecté:", sectorCandidates, "Sous-secteurs:", filtered.length);
  }

  async function init() {
    try {
      ensureSubsectorBlock();

      const response = await fetch("/api/subsectors/active?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("Erreur chargement /api/subsectors/active");

      allSubsectors = await response.json();

      lastSectorSignature = sectorSignature();
      refreshSubsectorsBecauseSectorChanged();

      // Vérifie le secteur, mais ne recharge que si le secteur change vraiment.
      setInterval(function () {
        const currentSignature = sectorSignature();

        if (currentSignature !== lastSectorSignature) {
          lastSectorSignature = currentSignature;
          refreshSubsectorsBecauseSectorChanged();
        }
      }, 700);

      console.log(MARKER, "chargé:", allSubsectors.length);
    } catch (error) {
      console.error(MARKER, error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

;/* ==== bloc script 21/40 (ordre du document preserve) ==== */

/* MANAGER_FORM_PRE_SESSION_JS_V1 */
  (function () {
    function getParam(name) {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    }

    function labelDocumentType(type) {
      const labels = {
        CNI_RECTO: "CNI recto",
        CNI_VERSO: "CNI verso",
        PASSPORT_DOCUMENT: "Passeport",
        RESIDENCE_PERMIT_RECTO: "Titre de séjour recto",
        RESIDENCE_PERMIT_VERSO: "Titre de séjour verso",
        CONSULAR_CARD_RECTO: "Carte consulaire recto",
        CONSULAR_CARD_VERSO: "Carte consulaire verso",
        ADDRESS_PROOF: "Justificatif de résidence",
        INCOME_PROOF: "Justificatif d’activité / revenus",
        RIB_DOCUMENT: "RIB ou coordonnées bancaires",
        BUSINESS_REGISTRATION: "Document d’existence entreprise",
        TAX_DOCUMENT: "Identification fiscale",
        CLIENT_PHOTO: "Photo client",
        CLIENT_VIDEO: "Vidéo client"
      };

      return labels[type] || type || "Document";
    }

    async function loadPreOnboardingSession() {
      const sessionId =
        getParam("pre_session") ||
        localStorage.getItem("diaspora_pre_onboarding_session_id") ||
        "";

      if (!sessionId) {
        return;
      }

      const hiddenInput = document.getElementById("pre_onboarding_session_id");
      const box = document.getElementById("pre-session-box");
      const message = document.getElementById("pre-session-message");
      const list = document.getElementById("pre-session-documents");

      if (hiddenInput) {
        hiddenInput.value = sessionId;
      }

      // AFB_CLIENT_VIEW_CLEAN_V1 : la carte « Documents préchargés » reste masquée
      // pour épurer la vue client ; le rattachement des documents passe toujours
      // par le champ caché pre_onboarding_session_id.
      return;

      if (!box || !message || !list) {
        return;
      }

      box.classList.remove("hidden");
      message.textContent = "Vérification des documents capturés...";

      try {
        const response = await fetch("/api/pre-onboarding/session/" + encodeURIComponent(sessionId));

        if (!response.ok) {
          throw new Error("Erreur " + response.status);
        }

        const data = await response.json();
        const allDocs = data.documents || [];

        const latestByType = {};

        allDocs.forEach(function (doc) {
          const type = doc.document_type || "UNKNOWN";
          const created = doc.created_at || "";

          if (!latestByType[type] || created >= (latestByType[type].created_at || "")) {
            latestByType[type] = doc;
          }
        });

        const docs = Object.values(latestByType);

        if (!docs.length) {
          message.textContent = "Aucun document temporaire trouvé pour cette session.";
          list.innerHTML = "";
          return;
        }

        message.textContent = docs.length + " type(s) de document prêt(s) à être rattaché(s) au dossier final. Les reprises précédentes sont masquées.";

        list.innerHTML = docs.map(function (doc) {
          const sizeKo = Math.round((doc.size || 0) / 1024);
          return "<li>" + labelDocumentType(doc.document_type) + " — " + sizeKo + " Ko</li>";
        }).join("");
      } catch (error) {
        console.error(error);
        message.textContent = "Impossible de vérifier les documents préchargés pour le moment.";
        list.innerHTML = "";
      }
    }

    document.addEventListener("DOMContentLoaded", loadPreOnboardingSession);
  })();

;/* ==== bloc script 22/40 (ordre du document preserve) ==== */

/* MANAGER_FORM_SEND_PRE_SESSION_FETCH_PATCH_V1 */
  (function () {
    const originalFetch = window.fetch;

    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
        const method = init && init.method ? String(init.method).toUpperCase() : "GET";

        const isCreateApplication =
          method === "POST" &&
          /\/api\/applications\/?$/.test(url);

        if (isCreateApplication && init && init.body && typeof init.body === "string") {
          const sessionId =
            new URLSearchParams(window.location.search).get("pre_session") ||
            localStorage.getItem("diaspora_pre_onboarding_session_id") ||
            "";

          if (sessionId) {
            const payload = JSON.parse(init.body);
            payload.pre_onboarding_session_id = sessionId;

            init = Object.assign({}, init, {
              body: JSON.stringify(payload)
            });
          }
        }
      } catch (error) {
        console.warn("Pré-session non injectée dans la demande:", error);
      }

      return originalFetch.call(this, input, init);
    };
  })();

;/* ==== bloc script 23/40 (ordre du document preserve) ==== */

function toggleMatrimonialRegime() {
    const maritalStatus = document.getElementById("marital_status");
    const box = document.getElementById("matrimonialRegimeBox");
    const regime = document.getElementById("matrimonial_regime");

    if (!maritalStatus || !box || !regime) return;

    if (maritalStatus.value === "Marié(e)") {
        box.style.display = "block";
        regime.disabled = false;
    } else {
        box.style.display = "none";
        regime.value = "";
        regime.disabled = true;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const maritalStatus = document.getElementById("marital_status");

    if (maritalStatus && maritalStatus.dataset.dgMaritalGridFix !== "1") {
        maritalStatus.dataset.dgMaritalGridFix = "1";
        maritalStatus.addEventListener("change", toggleMatrimonialRegime);
    }

    toggleMatrimonialRegime();
});

;/* ==== bloc script 24/40 (ordre du document preserve) ==== */

(function () {
    const INCOME_HELP_VISIBLE = {
        SALARY: "Document attendu : bulletin de salaire récent, attestation employeur ou contrat de travail.",
        BUSINESS: "Document attendu : registre de commerce, justificatif fiscal ou preuve d’activité commerciale.",
        LIBERAL: "Document attendu : justificatif d’activité professionnelle, carte professionnelle ou attestation d’exercice.",
        PENSION: "Document attendu : attestation de pension ou justificatif de retraite.",
        RENTAL: "Document attendu : contrat de bail, quittance ou document justifiant les revenus locatifs.",
        FAMILY_SUPPORT: "Document attendu : attestation de prise en charge ou justificatif du soutien familial.",
        SCHOLARSHIP: "Document attendu : attestation de bourse, certificat de scolarité ou justificatif de financement.",
        SAVINGS: "Document attendu : relevé bancaire ou document justifiant l’épargne déclarée.",
        OTHER: "Document attendu : tout justificatif cohérent avec le revenu déclaré."
    };

    const INCOME_LABEL_VISIBLE = {
        SALARY: "Salaire",
        BUSINESS: "Activité commerciale",
        LIBERAL: "Profession libérale",
        PENSION: "Pension / retraite",
        RENTAL: "Revenus locatifs",
        FAMILY_SUPPORT: "Soutien familial",
        SCHOLARSHIP: "Bourse / scolarité",
        SAVINGS: "Épargne personnelle",
        OTHER: "Autre"
    };

    window.updateIncomeProofGuidanceVisible = function () {
        const select = document.getElementById("income_source_type");
        const value = select ? select.value : "";

        const message = INCOME_HELP_VISIBLE[value] || "Sélectionnez le type de revenu afin d’identifier le justificatif attendu.";
        const labelValue = INCOME_LABEL_VISIBLE[value] || "";

        const inline = document.getElementById("incomeTypeInlineGuidance");
        if (inline) {
            inline.innerText = message;
        }

        const docsBlock = document.getElementById("managerExtraDocsBlock");
        if (!docsBlock) return;

        const incomeButton = docsBlock.querySelector('button[onclick*="INCOME_PROOF"]');
        const incomeCard = incomeButton ? incomeButton.closest(".camera-doc-card") : null;
        if (!incomeCard) return;

        const cardLabel = incomeCard.querySelector("label");
        const helpText = incomeCard.querySelector("p.doc-help");

        if (cardLabel) {
            cardLabel.innerHTML = '<span>' + (value ? "Justificatif de revenu — " + labelValue : "Justificatif de revenu") + '</span> <span class="required-doc">*</span>';
        }

        if (helpText) {
            helpText.innerText = message;
        }

        if (incomeButton) {
            incomeButton.innerHTML = "📷 Photographier le justificatif de revenu";
        }
    };

    function bindIncomeFieldVisible() {
        const select = document.getElementById("income_source_type");
        if (!select || select.dataset.boundIncomeVisible === "1") return;

        select.dataset.boundIncomeVisible = "1";
        select.addEventListener("change", window.updateIncomeProofGuidanceVisible);
    }

    function applyIncomeVisibleFix() {
        bindIncomeFieldVisible();
        window.updateIncomeProofGuidanceVisible();
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyIncomeVisibleFix();

        let count = 0;
        const timer = setInterval(function () {
            applyIncomeVisibleFix();
            count += 1;
            if (count >= 15) clearInterval(timer);
        }, 300);
    });

    setTimeout(applyIncomeVisibleFix, 1000);
    setTimeout(applyIncomeVisibleFix, 2500);
})();

;/* ==== bloc script 25/40 (ordre du document preserve) ==== */

(function () {
    function moveIncomeCurrencyAfterRealRange() {
        const incomeRange = document.querySelector('[name="income_range_ui"]');
        const currencyBox = document.getElementById("managerIncomeCurrencyBox");

        if (!incomeRange || !currencyBox) return;

        const rangeBox =
            incomeRange.closest(".form-group") ||
            incomeRange.closest(".field") ||
            incomeRange.closest(".full") ||
            incomeRange.closest("div") ||
            incomeRange.parentElement;

        if (!rangeBox) return;

        if (currencyBox.previousElementSibling !== rangeBox) {
            rangeBox.insertAdjacentElement("afterend", currencyBox);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        moveIncomeCurrencyAfterRealRange();
        setTimeout(moveIncomeCurrencyAfterRealRange, 400);
        setTimeout(moveIncomeCurrencyAfterRealRange, 1200);
        setTimeout(moveIncomeCurrencyAfterRealRange, 2500);
    });
})();

;/* ==== bloc script 26/40 (ordre du document preserve) ==== */

(function () {
    let residenceCountryList = [];

    function normalizeResidenceText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function countryFlagUrl(country) {
        const iso = String(country && country.iso_code ? country.iso_code : "")
            .trim()
            .toLowerCase();

        if (!/^[a-z]{2}$/.test(iso)) {
            return "";
        }

        return "https://flagcdn.com/w40/" + iso + ".png";
    }

    function ensureSelectedFlagPreview() {
        const picker = document.querySelector(".residence-country-picker");
        const input = document.getElementById("residenceCountrySearch");

        if (!picker || !input) return null;

        let img = document.getElementById("residenceSelectedFlag");

        if (!img) {
            img = document.createElement("img");
            img.id = "residenceSelectedFlag";
            img.alt = "";
            picker.insertBefore(img, input);
        }

        return img;
    }

    async function fetchResidenceCountries(query = "") {
        try {
            const url = query
                ? "/api/countries/active?q=" + encodeURIComponent(query)
                : "/api/countries/active";

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("API pays indisponible");
            }

            residenceCountryList = await response.json();
            return residenceCountryList;
        } catch (error) {
            console.error("Erreur chargement pays de résidence :", error);

            const helper = document.getElementById("residenceCountryHelper");
            if (helper) {
                helper.className = "field-message error";
                helper.innerText = "Impossible de charger la liste des pays. Veuillez réessayer.";
            }

            return [];
        }
    }

    function renderResidenceCountries(items) {
        const dropdown = document.getElementById("residenceCountryDropdown");
        if (!dropdown) return;

        dropdown.innerHTML = "";

        if (!items || items.length === 0) {
            dropdown.innerHTML = '<div class="residence-country-empty">Aucun pays trouvé.</div>';
            return;
        }

        items.forEach(function (country) {
            const name = country.name_fr || "";
            const flagUrl = countryFlagUrl(country);

            const option = document.createElement("div");
            option.className = "residence-country-option";

            option.innerHTML =
                '<img class="residence-country-img" src="' + escapeHtml(flagUrl) + '" alt="">' +
                '<span class="residence-country-name">' + escapeHtml(name) + '</span>';

            option.onclick = function () {
                const searchInput = document.getElementById("residenceCountrySearch");
                const hiddenInput = document.getElementById("residence");
                const helper = document.getElementById("residenceCountryHelper");
                const selectedFlag = ensureSelectedFlagPreview();

                if (searchInput) {
                    searchInput.value = name;
                    searchInput.classList.add("with-selected-flag");
                }

                if (selectedFlag && flagUrl) {
                    selectedFlag.src = flagUrl;
                    selectedFlag.style.display = "block";
                }

                // Valeur envoyée au backend : nom propre du pays, sans image, sans emoji.
                if (hiddenInput) {
                    hiddenInput.value = name;
                }

                dropdown.style.display = "none";

                if (helper) {
                    helper.className = "field-message success";
                    helper.innerText = "Pays de résidence sélectionné.";
                }
            };

            dropdown.appendChild(option);
        });
    }

    window.showResidenceCountryDropdown = async function () {
        const dropdown = document.getElementById("residenceCountryDropdown");
        if (!dropdown) return;

        dropdown.style.display = "block";

        if (!residenceCountryList || residenceCountryList.length === 0) {
            const results = await fetchResidenceCountries("");
            renderResidenceCountries(results);
            return;
        }

        renderResidenceCountries(residenceCountryList);
    };

    window.filterResidenceCountries = function () {
        const searchInput = document.getElementById("residenceCountrySearch");
        const hiddenInput = document.getElementById("residence");
        const helper = document.getElementById("residenceCountryHelper");
        const selectedFlag = ensureSelectedFlagPreview();

        if (!searchInput) return;

        const query = searchInput.value.trim();

        if (hiddenInput) {
            hiddenInput.value = "";
        }

        if (selectedFlag) {
            selectedFlag.style.display = "none";
        }

        searchInput.classList.remove("with-selected-flag");

        if (!query) {
            if (helper) {
                helper.className = "field-message";
                helper.innerText = "Tapez quelques lettres puis cliquez sur un pays proposé.";
            }

            renderResidenceCountries(residenceCountryList);
            window.showResidenceCountryDropdown();
            return;
        }

        const normalizedQuery = normalizeResidenceText(query);

        const filtered = residenceCountryList.filter(function (country) {
            return normalizeResidenceText(country.name_fr).includes(normalizedQuery) ||
                   normalizeResidenceText(country.iso_code).includes(normalizedQuery);
        });

        renderResidenceCountries(filtered);
        window.showResidenceCountryDropdown();

        if (helper) {
            helper.className = "field-message";
            helper.innerText = filtered.length
                ? filtered.length + " pays trouvé(s)."
                : "Aucun pays trouvé.";
        }
    };

    document.addEventListener("DOMContentLoaded", async function () {
        ensureSelectedFlagPreview();

        const results = await fetchResidenceCountries("");
        renderResidenceCountries(results);

        document.addEventListener("click", function (event) {
            const picker = document.querySelector(".residence-country-picker");
            const dropdown = document.getElementById("residenceCountryDropdown");

            if (picker && dropdown && !picker.contains(event.target)) {
                dropdown.style.display = "none";
            }
        });
    });
})();

;/* ==== bloc script 27/40 (ordre du document preserve) ==== */

(function () {
    if (window.__dgManagerLanguageSwitcherV1) return;
    window.__dgManagerLanguageSwitcherV1 = true;

    const STORAGE_KEY = "diaspora_client_lang";

    function currentLang() {
        return localStorage.getItem(STORAGE_KEY) || "fr";
    }

    function tr(fr, en) {
        return currentLang() === "en" ? en : fr;
    }

    function ensureSwitcher() {
        if (document.getElementById("managerLangSwitcher")) return;

        const nav = document.querySelector(".client-nav") || document.querySelector(".topbar-content");
        if (!nav) return;

        const switcher = document.createElement("div");
        switcher.id = "managerLangSwitcher";
        switcher.className = "manager-lang-switcher";
        switcher.innerHTML = `
            <button type="button" id="managerLangFr" onclick="setManagerClientLanguage('fr')">FR</button>
            <button type="button" id="managerLangEn" onclick="setManagerClientLanguage('en')">EN</button>
        `;

        const secure = nav.querySelector(".secure");
        if (secure) {
            nav.insertBefore(switcher, secure);
        } else {
            nav.appendChild(switcher);
        }
    }

    function updateButtons() {
        const lang = currentLang();
        const frBtn = document.getElementById("managerLangFr");
        const enBtn = document.getElementById("managerLangEn");

        if (frBtn) frBtn.classList.toggle("active", lang === "fr");
        if (enBtn) enBtn.classList.toggle("active", lang === "en");
    }

    function setText(selector, fr, en) {
        const el = document.querySelector(selector);
        if (el) el.textContent = tr(fr, en);
    }

    function setHtml(selector, fr, en) {
        const el = document.querySelector(selector);
        if (el) el.innerHTML = tr(fr, en);
    }

    function setPlaceholder(selector, fr, en) {
        const el = document.querySelector(selector);
        if (el) el.placeholder = tr(fr, en);
    }

    function getFieldBox(selector) {
        const field = document.querySelector(selector);
        if (!field) return null;

        let box = field.closest("div");
        if (box && !box.querySelector("label") && box.parentElement) {
            box = box.parentElement;
        }

        return box;
    }

    function setFieldLabel(selector, fr, en) {
        const box = getFieldBox(selector);
        if (!box) return;

        const label = box.querySelector("label");
        if (label) label.innerHTML = tr(fr, en);
    }

    function setFieldHint(selector, fr, en) {
        const box = getFieldBox(selector);
        if (!box) return;

        const hint = box.querySelector(".hint");
        if (hint) hint.textContent = tr(fr, en);
    }

    function setSectionHeader(number, fr, en) {
        document.querySelectorAll(".section").forEach(function (section) {
            const num = section.querySelector(".section-number");
            const header = section.querySelector(".section-header");

            if (!num || !header || num.textContent.trim() !== String(number)) return;

            header.childNodes.forEach(function (node) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    node.textContent = " " + tr(fr, en);
                }
            });
        });
    }

    function setSelectOptions(selector, translations) {
        const select = document.querySelector(selector);
        if (!select) return;

        Array.from(select.options).forEach(function (option) {
            const key = option.value || option.textContent.trim();

            if (translations[key]) {
                option.textContent = tr(translations[key][0], translations[key][1]);
            }
        });
    }

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .toLowerCase()
            .trim();
    }

    const EXACT_TEXTS = [
        ["Informations personnelles", "Personal information"],
        ["Comment bien remplir ce formulaire", "How to complete this form"],
        ["Parents", "Parents"],
        ["Personne à contacter 1", "Contact person 1"],
        ["Personne à contacter 2", "Contact person 2"],
        ["Package souhaité", "Preferred package"],
        ["Pièce d’identité officielle", "Official identity document"],
        ["Photo du justificatif de domicile", "Proof of address photo"],
        ["Selfie / preuve de vie", "Selfie / proof of life"],
        ["Documents complémentaires pour particulier non-résident", "Additional documents for non-resident individual"],
        ["Acte de naissance ou pièce avec filiation", "Birth certificate or document showing parentage"],
        ["Fiche de paie / attestation d’emploi / scolarité", "Payslip / employment or school certificate"],
        ["Attestation de conformité fiscale", "Tax compliance certificate"],
        ["Consentement et autorisation", "Consent and authorization"],
        ["Demande enregistrée avec succès", "Request successfully submitted"],
        ["Référence dossier", "File reference"],
        ["Suivre ma demande", "Track my request"],
        ["Accueil", "Home"],
        ["Ouverture de compte", "Account opening"],
        ["Carte bancaire", "Bank card"],
        ["Recharge de carte", "Card top-up"],
        ["Nouvelle demande", "New request"],
        ["Soumettre ma demande d’ouverture de compte", "Submit my account opening request"]
    ];

    // AFB_TRANSLATE_PERF_V1 : index précalculé (voir bloc traduction complète).
    const EXACT_INDEX = new Map();
    EXACT_TEXTS.forEach(function (pair) {
        EXACT_INDEX.set(normalize(pair[0]), pair);
        EXACT_INDEX.set(normalize(pair[1]), pair);
    });

    function targetText(value) {
        const pair = EXACT_INDEX.get(normalize(value));
        if (!pair) return null;
        return currentLang() === "en" ? pair[1] : pair[0];
    }

    function translateExactTextNodes() {
        // Langue jamais changée -> page dans sa langue d'origine, rien à faire.
        if (localStorage.getItem(STORAGE_KEY) === null) return;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    const tag = parent.tagName ? parent.tagName.toLowerCase() : "";
                    if (tag === "script" || tag === "style") return NodeFilter.FILTER_REJECT;
                    if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];
        let node;

        while ((node = walker.nextNode())) {
            nodes.push(node);
        }

        nodes.forEach(function (node) {
            const translated = targetText(node.textContent.trim());
            if (translated) {
                const leading = node.textContent.match(/^\s*/)[0];
                const trailing = node.textContent.match(/\s*$/)[0];
                node.textContent = leading + translated + trailing;
            }
        });
    }

    function translateManagerPage() {
        document.documentElement.lang = currentLang();

        ensureSwitcher();
        updateButtons();

        setText(".brand-title", "Portail d'onboarding client", "Client onboarding portal");

        // AFB_TOPNAV_PROCESS_ACTIVE_V1 : traduction par texte, pas par position —
        // l'ancien index [0] renommait « Accueil » en « Ouvrir un compte ».
        const navPairs = [
            ["Accueil", "Home"],
            ["Ouverture de compte", "Account opening"],
            ["Carte bancaire", "Bank card"],
            ["Recharge de carte", "Card top-up"],
            ["Suivre ma demande", "Track my request"]
        ];
        document.querySelectorAll(".client-nav a").forEach(function (link) {
            const current = link.textContent.trim();
            navPairs.forEach(function (pair) {
                if (current === pair[0] || current === pair[1]) {
                    link.textContent = tr(pair[0], pair[1]);
                }
            });
        });

        setText(".client-nav .secure", "Connexion sécurisée - eKYC", "Secure connection - eKYC");

        setText(".intro h1", "Informations personnelles", "Personal information");
        setText(
            ".intro p",
            "Renseignez vos informations telles qu’elles figurent sur votre pièce d’identité. Les champs marqués d’un astérisque (*) sont obligatoires.",
            "Enter your information exactly as it appears on your identity document. Fields marked with an asterisk (*) are required."
        );

        setText(".help-box h3", "Comment bien remplir ce formulaire", "How to complete this form");

        const helpItems = document.querySelectorAll(".help-box li");
        const helpFr = [
            "Saisissez vos informations exactement comme sur votre pièce d’identité.",
            "Les champs marqués d’un astérisque (*) sont obligatoires.",
            "Joignez des photos nettes et lisibles de vos documents.",
            "Vos données sont utilisées pour l’ouverture, le KYC et la vérification de votre compte."
        ];
        const helpEn = [
            "Enter your information exactly as it appears on your identity document.",
            "Fields marked with an asterisk (*) are required.",
            "Attach clear and readable photos of your documents.",
            "Your data is used for account opening, KYC and account verification."
        ];

        helpItems.forEach(function (item, index) {
            if (helpFr[index]) item.textContent = tr(helpFr[index], helpEn[index]);
        });

        setSectionHeader(1, "Vos informations personnelles", "Your personal information");
        setSectionHeader(2, "Parents ou tuteurs", "Parents or guardians");
        setSectionHeader(3, "Coordonnées", "Contact details");
        setSectionHeader(4, "Pièce et activité", "Identity document and activity");
        setSectionHeader(5, "Votre compte", "Your account");
        setSectionHeader(6, "Documents à joindre", "Documents to attach");
        setSectionHeader(7, "Consentement et autorisation", "Consent and authorization");

        setFieldLabel('[name="sex"]', 'Sexe <span class="required">*</span>', 'Gender <span class="required">*</span>');
        setFieldLabel('[name="marital_status"]', 'Situation matrimoniale <span class="required">*</span>', 'Marital status <span class="required">*</span>');
        setFieldLabel('[name="matrimonial_regime"]', 'Régime matrimonial', 'Matrimonial regime');
        setFieldLabel('[name="last_name"]', 'Nom d’usage / Nom de famille <span class="required">*</span>', 'Usual name / Family name <span class="required">*</span>');
        setFieldLabel('[name="birth_name"]', 'Nom de naissance / Nom de jeune fille', 'Birth name / Maiden name');
        setFieldLabel('[name="first_name"]', 'Prénom(s) <span class="required">*</span>', 'First name(s) <span class="required">*</span>');
        setFieldLabel('[name="birth_date"]', 'Date de naissance <span class="required">*</span>', 'Date of birth <span class="required">*</span>');
        setFieldLabel('[name="birth_place"]', 'Lieu de naissance <span class="required">*</span>', 'Place of birth <span class="required">*</span>');
        setFieldLabel('[name="birth_department"]', 'Département de naissance', 'Birth department');
        setFieldLabel('#nationalitySearch', 'Nationalité <span class="required">*</span>', 'Nationality <span class="required">*</span>');
        setFieldLabel('#residenceCountrySearch', 'Pays de résidence <span class="required">*</span>', 'Country of residence <span class="required">*</span>');
        setFieldLabel('[name="residency_status"]', 'Statut de résidence <span class="required">*</span>', 'Residence status <span class="required">*</span>');
        setFieldLabel('[name="niu_ui"]', 'N° identification unique / Numéros fiscal', 'Unique identification number / Tax number');

        setFieldLabel('[name="father_last_name_ui"]', 'Noms du père', "Father's last name");
        setFieldLabel('[name="father_first_name_ui"]', 'Prénoms du père', "Father's first name");
        setFieldLabel('[name="mother_last_name_ui"]', 'Noms de la mère', "Mother's last name");
        setFieldLabel('[name="mother_first_name_ui"]', 'Prénoms de la mère', "Mother's first name");

        setFieldLabel('[name="contact_1_last_name_ui"]', 'Noms du contact', "Contact's last name");
        setFieldLabel('[name="contact_1_first_name_ui"]', 'Prénoms du contact', "Contact's first name");
        setFieldLabel('[name="contact_2_last_name_ui"]', 'Noms du contact', "Contact's last name");
        setFieldLabel('[name="contact_2_first_name_ui"]', 'Prénoms du contact', "Contact's first name");

        setFieldLabel('#phone_local', 'Téléphone WhatsApp <span class="required">*</span>', 'WhatsApp phone number <span class="required">*</span>');
        setFieldLabel('[name="email"]', 'Adresse e-mail <span class="required">*</span>', 'Email address <span class="required">*</span>');
        setFieldLabel('[name="address_location"]', 'Adresse / Localisation', 'Address / Location');
        setFieldLabel('[name="postal_box"]', 'Boîte postale', 'Postal box');

        setFieldLabel('[name="document_type_ui"]', 'Type de pièce <span class="required">*</span>', 'Document type <span class="required">*</span>');
        setFieldLabel('[name="identity_document_number"]', 'N° de pièce <span class="required">*</span>', 'Document number <span class="required">*</span>');
        setFieldLabel('[name="identity_document_issue_date"]', 'Date de délivrance', 'Issue date');
        setFieldLabel('[name="identity_document_issue_place"]', 'Lieu de délivrance', 'Place of issue');
        setFieldLabel('[name="profession_ui"]', 'Profession <span class="required">*</span>', 'Profession <span class="required">*</span>');
        setFieldLabel('[name="income_source_type_ui"]', 'Type de revenu <span class="required">*</span>', 'Income source type <span class="required">*</span>');
        setFieldLabel('[name="income_range_ui"]', 'Tranche de revenus <span class="required">*</span>', 'Income range <span class="required">*</span>');

        setFieldLabel('#agencySearch', 'Agence <span class="required">*</span>', 'Branch <span class="required">*</span>');
        setFieldLabel('[name="currency_ui"]', 'Devise', 'Currency');
        setFieldLabel('[name="account_type"]', 'Type de compte <span class="required">*</span>', 'Account type <span class="required">*</span>');
        setFieldLabel('[name="rib"]', 'RIB <span class="optional">(si disponible)</span>', 'Bank details / RIB <span class="optional">(if available)</span>');
        setFieldLabel('[name="account_object"]', 'Objet du compte <span class="required">*</span>', 'Purpose of the account <span class="required">*</span>');
        setFieldLabel('[name="funds_origin"]', 'Origine des fonds <span class="required">*</span>', 'Source of funds <span class="required">*</span>');
        setFieldLabel('[name="referral_code_ui"]', 'Code de parrainage <span class="optional">(Optionnel)</span>', 'Referral code <span class="optional">(Optional)</span>');

        setPlaceholder('#nationalitySearch', 'Rechercher une nationalité...', 'Search for a nationality...');
        setPlaceholder('#residenceCountrySearch', 'Rechercher un pays...', 'Search for a country...');
        setPlaceholder('#agencySearch', 'Rechercher par nom ou code...', 'Search by name or code...');
        setPlaceholder('[name="address_location"]', 'Adresse complète de résidence', 'Full residential address');

        setFieldHint('#residenceCountrySearch', 'Recherchez et sélectionnez votre pays de résidence.', 'Search and select your country of residence.');
        setFieldHint('[name="income_source_type_ui"]', 'Sélectionnez votre principale source de revenu.', 'Select your main source of income.');
        setFieldHint('#agencySearch', 'Recherchez et sélectionnez l’agence où votre dossier sera traité.', 'Search and select the branch where your file will be processed.');

        setSelectOptions('[name="sex"]', {
            "Masculin": ["Masculin", "Male"],
            "Féminin": ["Féminin", "Female"]
        });

        setSelectOptions('[name="marital_status"]', {
            "Célibataire": ["Célibataire", "Single"],
            "Marié(e)": ["Marié(e)", "Married"],
            "Divorcé(e)": ["Divorcé(e)", "Divorced"],
            "Veuf/Veuve": ["Veuf / Veuve", "Widowed"]
        });

        setSelectOptions('[name="residency_status"]', {
            "RESIDENT": ["Résident", "Resident"],
            "NON_RESIDENT": ["Non-résident", "Non-resident"]
        });

        setSelectOptions('[name="document_type_ui"]', {
            "": ["Sélectionnez...", "Select..."],
            "Carte nationale d’identité": ["Carte nationale d’identité", "National identity card"],
            "Passeport": ["Passeport", "Passport"],
            "Titre de séjour": ["Titre de séjour", "Residence permit"],
            "Carte consulaire": ["Carte consulaire", "Consular card"]
        });

        setSelectOptions('[name="profession_ui"]', {
            "": ["Sélectionnez votre profession...", "Select your profession..."],
            "Salarié": ["Salarié", "Employee"],
            "Commerçant": ["Commerçant", "Trader"],
            "Étudiant": ["Étudiant", "Student"],
            "Entrepreneur": ["Entrepreneur", "Entrepreneur"],
            "Fonctionnaire": ["Fonctionnaire", "Civil servant"],
            "Autre": ["Autre", "Other"]
        });

        setSelectOptions('[name="income_source_type_ui"]', {
            "": ["Sélectionnez le type de revenu...", "Select income source type..."],
            "SALARY": ["Salaire", "Salary"],
            "BUSINESS": ["Activité commerciale", "Business activity"],
            "LIBERAL": ["Profession libérale", "Self-employed profession"],
            "PENSION": ["Pension / retraite", "Pension / retirement"],
            "RENTAL": ["Revenus locatifs", "Rental income"],
            "FAMILY_SUPPORT": ["Soutien familial", "Family support"],
            "SCHOLARSHIP": ["Bourse / scolarité", "Scholarship / education support"],
            "SAVINGS": ["Épargne personnelle", "Personal savings"],
            "OTHER": ["Autre", "Other"]
        });

        setSelectOptions('[name="account_type"]', {
            "": ["Sélectionnez...", "Select..."],
            "Compte courant": ["Compte courant", "Current account"],
            "Compte épargne diaspora": ["Compte épargne à distance", "Remote savings account"],
            "Compte joint": ["Compte joint", "Joint account"]
        });

        setSelectOptions('[name="account_object"]', {
            "": ["Sélectionnez...", "Select..."],
            "Épargne personnelle": ["Épargne personnelle", "Personal savings"],
            "Réception de salaire": ["Réception de salaire", "Salary reception"],
            "Activité commerciale": ["Activité commerciale", "Business activity"],
            "Transferts familiaux": ["Transferts familiaux", "Family transfers"],
            "Investissement": ["Investissement", "Investment"],
            "Autres": ["Autres", "Other"]
        });

        setSelectOptions('[name="funds_origin"]', {
            "": ["Sélectionnez...", "Select..."],
            "Salaire": ["Salaire", "Salary"],
            "Activité commerciale": ["Activité commerciale", "Business activity"],
            "Épargne personnelle": ["Épargne personnelle", "Personal savings"],
            "Transferts familiaux": ["Transferts familiaux", "Family transfers"],
            "Revenus locatifs": ["Revenus locatifs", "Rental income"],
            "Pension / retraite": ["Pension / retraite", "Pension / retirement"],
            "Bourse / scolarité": ["Bourse / scolarité", "Scholarship / education support"],
            "Autres": ["Autres", "Other"]
        });

        const submitBtn = document.querySelector(".submit-btn");
        if (submitBtn) {
            submitBtn.textContent = tr(
                "Soumettre ma demande d’ouverture de compte",
                "Submit my account opening request"
            );
        }

        translateExactTextNodes();
    }

    window.setManagerClientLanguage = function (lang) {
        localStorage.setItem(STORAGE_KEY, lang === "en" ? "en" : "fr");
        translateManagerPage();
    };

    document.addEventListener("DOMContentLoaded", function () {
        translateManagerPage();

        let count = 0;
        const timer = setInterval(function () {
            translateManagerPage();
            count += 1;
            if (count >= 12) clearInterval(timer);
        }, 350);
    });

    setTimeout(translateManagerPage, 800);
    setTimeout(translateManagerPage, 1800);
    setTimeout(translateManagerPage, 3000);
})();

;/* ==== bloc script 28/40 (ordre du document preserve) ==== */

(function () {
    if (window.__dgManagerTargetedTranslationsV4) return;
    window.__dgManagerTargetedTranslationsV4 = true;

    const STORAGE_KEY = "diaspora_client_lang";

    const PAIRS = [
        ["La phase d’identification commence par le sexe et la situation matrimoniale, car ces informations peuvent influencer le nom d’usage, notamment pour une femme mariée.", "The identification section starts with gender and marital status, as this information may affect the usual name, especially for a married woman."],
        ["La phase d'identification commence par le sexe et la situation matrimoniale, car ces informations peuvent influencer le nom d’usage, notamment pour une femme mariée.", "The identification section starts with gender and marital status, as this information may affect the usual name, especially for a married woman."],
        ["Pour une femme mariée, renseigner le nom d’épouse s’il est utilisé officiellement.", "For a married woman, enter the married name if it is officially used."],
        ["Pour une femme mariée, renseigner le nom d'épouse s'il est utilisé officiellement.", "For a married woman, enter the married name if it is officially used."],
        ["À renseigner si différent du nom d’usage ou du nom marital.", "Enter this if it differs from the usual name or married name."],
        ["A renseigner si différent du nom d’usage ou du nom marital.", "Enter this if it differs from the usual name or married name."],
        ["Tous vos prénoms dans l’ordre de votre pièce.", "All your first names in the order shown on your identity document."],
        ["Tous vos prénoms dans l'ordre de votre pièce.", "All your first names in the order shown on your identity document."],
        ["Tapez quelques lettres puis cliquez sur un pays proposé.", "Type a few letters, then click one of the suggested countries."],
        ["Tapez quelques lettres puis cliquez sur une agence proposée.", "Type a few letters, then click one of the suggested branches."],

        ["Indiquez votre filiation et deux personnes à prévenir en cas d’urgence.", "Enter your parent information and two emergency contacts."],
        ["Indiquez votre filiation et deux personnes à prévenir en cas d'urgence.", "Enter your parent information and two emergency contacts."],
        ["N° de téléphone", "Phone number"],
        ["N° téléphone", "Phone number"],
        ["Rechercher un pays ou un indicatif...", "Search for a country or calling code..."],
        ["Rechercher un pays ou un indicatif", "Search for a country or calling code"],
        ["Tapez le nom du pays ou l’indicatif pour filtrer la liste.", "Type the country name or calling code to filter the list."],
        ["Tapez le nom du pays ou l'indicatif pour filtrer la liste.", "Type the country name or calling code to filter the list."],
        ["Format Cameroun : 9 chiffres après +237", "Cameroon format: 9 digits after +237"],
        ["CM Cameroun (+237)", "CM Cameroon (+237)"],

        ["Choisissez l’indicatif du pays puis saisissez votre numéro WhatsApp.", "Choose the country calling code, then enter your WhatsApp number."],
        ["Choisissez l'indicatif du pays puis saisissez votre numéro WhatsApp.", "Choose the country calling code, then enter your WhatsApp number."],
        ["Vos confirmations seront envoyées à cette adresse.", "Your confirmations will be sent to this address."],

        ["En soumettant ce formulaire, vous autorisez la banque à vérifier les informations fournies, à contrôler les documents transmis et à effectuer les diligences nécessaires à l’ouverture de votre compte.", "By submitting this form, you authorize the bank to verify the information provided, check the submitted documents and perform the required due diligence for account opening."],
        ["En soumettant ce formulaire, vous autorisez la banque à vérifier les informations fournies, à contrôler les documents transmis et à effectuer les diligences nécessaires à l'ouverture de votre compte.", "By submitting this form, you authorize the bank to verify the information provided, check the submitted documents and perform the required due diligence for account opening."],
        ["Je certifie que les informations fournies sont exactes et j’autorise Afriland First Bank à effectuer les contrôles KYC, la vérification documentaire, le filtrage de conformité et les diligences nécessaires à l’ouverture de mon compte.", "I certify that the information provided is accurate and authorize Afriland First Bank to perform KYC checks, document verification, compliance screening and the due diligence required to open my account."],
        ["Je certifie que les informations fournies sont exactes et j'autorise Afriland First Bank à effectuer les contrôles KYC, la vérification documentaire, le filtrage de conformité et les diligences nécessaires à l'ouverture de mon compte.", "I certify that the information provided is accurate and authorize Afriland First Bank to perform KYC checks, document verification, compliance screening and the due diligence required to open my account."],

        ["Renseignez votre RIB si vous disposez déjà d’une référence bancaire ou d’un compte existant.", "Enter your RIB if you already have a bank reference or an existing account."],
        ["Renseignez votre RIB si vous disposez déjà d'une référence bancaire ou d'un compte existant.", "Enter your RIB if you already have a bank reference or an existing account."],
        ["Référence facultative", "Optional reference"],

        ["PREFERRED PACKAGE", "PREFERRED PACKAGE"],
        ["Package souhaité", "Preferred package"],
        ["Pour les professionnels", "For professionals"],
        ["L’essentiel au meilleur prix", "Essentials at the best price"],
        ["L'essentiel au meilleur prix", "Essentials at the best price"],
        ["Assurance", "Insurance"],
        ["Découvert permanent", "Permanent overdraft"],
        ["Carte Visa Classique", "Classic Visa card"],
        ["Tarification", "Pricing"],
        ["Ouverture", "Opening"],
        ["Souscription", "Subscription"],
        ["Mensuel", "Monthly"],
        ["Sans paiement immédiat", "No immediate payment"],

        ["Official identity document", "Official identity document"],
        ["Photographiez votre pièce. Pour une CNI ou une carte consulaire, le recto et le verso sont requis. Pour un passeport, une seule page suffit.", "Photograph your ID document. For a national ID card or consular card, both front and back are required. For a passport, one page is sufficient."],
        ["Photographier", "Take photo"],
        ["Importer", "Upload"],
        ["Photographier le justificatif de domicile", "Take proof of address photo"],
        ["Importer le justificatif de domicile", "Upload proof of address"],
        ["Aucune pièce capturée ou importée.", "No identity document captured or uploaded."],
        ["Aucun justificatif de domicile ajouté.", "No proof of address added."],
        ["Facture, attestation ou document officiel indiquant l’adresse.", "Bill, certificate or official document showing the address."],
        ["Facture, attestation ou document officiel indiquant l'adresse.", "Bill, certificate or official document showing the address."],

        ["DOCUMENTS COMPLÉMENTAIRES OBLIGATOIRES", "MANDATORY ADDITIONAL DOCUMENTS"],
        ["DOCUMENTS COMPLEMENTAIRES OBLIGATOIRES", "MANDATORY ADDITIONAL DOCUMENTS"],
        ["Photographiez les pièces permettant de justifier votre activité ou vos revenus, ainsi que votre relevé d’identification bancaire.", "Photograph the documents proving your activity or income, as well as your bank identification statement."],
        ["Photographiez les pièces permettant de justifier votre activité ou vos revenus, ainsi que votre relevé d’identification bancaire.", "Photograph the documents proving your activity or income, as well as your bank identification statement."],
        ["Justificatif de revenu — Activité commerciale", "Income proof — Business activity"],
        ["Justificatif de revenu — Activite commerciale", "Income proof — Business activity"],
        ["Photographier le justificatif de revenu", "Take income proof photo"],
        ["Relevé d’identification bancaire - RIB", "Bank identification statement - RIB"],
        ["Relevé d'identification bancaire - RIB", "Bank identification statement - RIB"],
        ["Photographier le RIB", "Take RIB photo"],
        ["Photographiez votre relevé d’identification bancaire ou une preuve de votre RIB.", "Photograph your bank identification statement or RIB proof."],
        ["Photographiez votre relevé d’identification bancaire ou une preuve de votre RIB.", "Photograph your bank identification statement or RIB proof."],
        ["Aucune photo capturée.", "No photo captured."],

        ["Selfie / proof of life", "Selfie / proof of life"],
        ["Prenez une photo claire du visage ou enregistrez une courte vidéo selfie. La photo utilise un cadrage intelligent ; la vidéo permet de renforcer la preuve de vie.", "Take a clear face photo or record a short selfie video. The photo uses intelligent framing; the video helps strengthen proof of life."],
        ["Filmer", "Record"],
        ["Selfie obligatoire : vous devez capturer un selfie réel. L’import simple du selfie n’est pas accepté.", "Mandatory selfie: you must capture a real selfie. Simple selfie upload is not accepted."],
        ["Selfie obligatoire : vous devez capturer un selfie réel. L'import simple du selfie n'est pas accepté.", "Mandatory selfie: you must capture a real selfie. Simple selfie upload is not accepted."],
        ["Aucun selfie capturé ou importé.", "No selfie captured or uploaded."],

        ["ADDITIONAL DOCUMENTS FOR NON-RESIDENT INDIVIDUAL", "ADDITIONAL DOCUMENTS FOR NON-RESIDENT INDIVIDUAL"],
        ["Birth certificate or document showing parentage", "Birth certificate or document showing parentage"],
        ["Payslip / employment or school certificate", "Payslip / employment or school certificate"],
        ["Tax compliance certificate", "Tax compliance certificate"],
        ["Aucun document ajouté.", "No document added."],
        ["À fournir si la pièce d’identité ne permet pas d’identifier clairement la filiation.", "Required if the identity document does not clearly show parentage."],
        ["A fournir si la pièce d'identité ne permet pas d'identifier clairement la filiation.", "Required if the identity document does not clearly show parentage."],
        ["Document justifiant l’activité professionnelle ou scolaire.", "Document proving professional or school activity."],
        ["Document justifiant l'activite professionnelle ou scolaire.", "Document proving professional or school activity."],
        ["Attestation de conformité fiscale exigée pour les non-résidents.", "Tax compliance certificate required for non-residents."],

        ["Secteur d’activité", "Business sector"],
        ["Secteur d'activité", "Business sector"],
        ["Rechercher un secteur : commerce, santé, BTP, finance...", "Search for a sector: trade, health, construction, finance..."],
        ["Sélectionner le secteur d’activité", "Select the business sector"],
        ["Sélectionner le secteur d'activité", "Select the business sector"],
        ["La liste est chargée depuis le système de la banque.", "The list is loaded from the bank system."],
        ["Sous-secteur d’activité", "Business sub-sector"],
        ["Sous-secteur d'activité", "Business sub-sector"],
        ["Sélectionnez un sous-secteur", "Select a sub-sector"],
        ["Aucun sous-secteur trouvé pour ce secteur", "No sub-sector found for this sector"],
        ["Aucun sous-secteur correspondant au secteur sélectionné.", "No sub-sector matches the selected sector."],

        ["Transport et logistique", "Transport and logistics"],
        ["Commerce et distribution", "Trade and distribution"],
        ["Santé", "Healthcare"],
        ["Sante", "Healthcare"],
        ["BTP", "Construction"],
        ["Finance", "Finance"],
        ["Banque", "Banking"],
        ["Assurance", "Insurance"],
        ["Agriculture", "Agriculture"],
        ["Éducation", "Education"],
        ["Education", "Education"],
        ["Informatique", "IT services"],
        ["Télécommunications", "Telecommunications"],
        ["Telecommunications", "Telecommunications"],
        ["Industrie", "Industry"],
        ["Services", "Services"],
        ["Hôtellerie et restauration", "Hospitality and catering"],
        ["Hotellerie et restauration", "Hospitality and catering"],

        ["Devise de la tranche de revenu", "Income range currency"],
        ["Sélectionnez la devise correspondant à votre tranche de revenu déclarée.", "Select the currency corresponding to your declared income range."],
        ["La devise de cette tranche est sélectionnée dans le champ Devise de la tranche de revenu.", "The currency for this range is selected in the Income range currency field."],
        ["Les tranches sont converties depuis les montants FCFA avec le taux indicatif 1 EUR = 655.957 FCFA.", "The ranges are converted from FCFA amounts using the indicative rate 1 EUR = 655.957 FCFA."],
        ["Document attendu : registre de commerce, justificatif fiscal ou preuve d’activité commerciale.", "Expected document: business registration, tax certificate, or proof of business activity."],
        ["Document attendu : registre de commerce, justificatif fiscal ou preuve d'activité commerciale.", "Expected document: business registration, tax certificate, or proof of business activity."],

        ["Pré-inscription", "Pre-registration"],
        ["Documents à fournir", "Required documents"],
        ["Identité", "Identity"],
        ["Parents / tuteurs", "Parents / guardians"],
        ["Pièce & activité", "ID & activity"],
        ["Votre compte", "Your account"],
        ["Consentement", "Consent"]
    ];

    function currentLang() {
        return localStorage.getItem(STORAGE_KEY) || "fr";
    }

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    // AFB_TRANSLATE_PERF_V1 : index précalculé — l'ancienne recherche linéaire
    // re-normalisait ~100 paires PAR NŒUD DE TEXTE et bloquait le thread
    // principal ~700 ms à chaque interaction (clics lents sur toute la page).
    const PAIR_INDEX = new Map();
    PAIRS.forEach(function (pair) {
        PAIR_INDEX.set(normalize(pair[0]), pair);
        PAIR_INDEX.set(normalize(pair[1]), pair);
    });

    function findTranslation(value) {
        const pair = PAIR_INDEX.get(normalize(value));
        if (!pair) return null;
        return currentLang() === "en" ? pair[1] : pair[0];
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // AFB_TRANSLATE_PERF_V1 : regex compilées une fois par langue (avant :
    // ~100 `new RegExp` par nœud de texte).
    const COMPILED_RULES = {};

    function compiledRules() {
        const lang = currentLang() === "en" ? "en" : "fr";
        if (COMPILED_RULES[lang]) return COMPILED_RULES[lang];

        const rules = [];
        PAIRS.forEach(function (pair) {
            const from = lang === "en" ? pair[0] : pair[1];
            const to = lang === "en" ? pair[1] : pair[0];

            if (!from || !to || from === to) return;

            // Limites de mots : sans elles, « Consent » matche à l'intérieur de
            // « Consentement » et chaque exécution du timer ajoute « ement »
            // (Consentementement...). \b uniquement si le bord est un caractère
            // de mot ASCII (les phrases finissant par « . » restent couvertes).
            const lead = /\w/.test(from[0]) ? "\\b" : "";
            const tail = /\w/.test(from[from.length - 1]) ? "\\b" : "";

            rules.push([new RegExp(lead + escapeRegExp(from) + tail, "g"), to]);
        });

        COMPILED_RULES[lang] = rules;
        return rules;
    }

    function replaceKnownPhrases(value) {
        let output = String(value || "");

        compiledRules().forEach(function (rule) {
            output = output.replace(rule[0], rule[1]);
        });

        if (currentLang() === "en") {
            output = output.replace(
                /(\d+)\s+sous-secteur\(s\)\s+disponible\(s\)\.?/gi,
                "$1 sub-sector(s) available."
            );
        } else {
            output = output.replace(
                /(\d+)\s+sub-sector\(s\)\s+available\.?/gi,
                "$1 sous-secteur(s) disponible(s)."
            );
        }

        return output;
    }

    function translateTextNodes() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    const tag = parent.tagName ? parent.tagName.toLowerCase() : "";
                    if (tag === "script" || tag === "style") return NodeFilter.FILTER_REJECT;
                    if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];
        let node;

        while ((node = walker.nextNode())) {
            nodes.push(node);
        }

        nodes.forEach(function (node) {
            const raw = node.textContent;
            const value = raw.trim();

            let next = findTranslation(value);

            if (!next) {
                next = replaceKnownPhrases(raw);
            } else {
                const leading = raw.match(/^\s*/)[0];
                const trailing = raw.match(/\s*$/)[0];
                next = leading + next + trailing;
            }

            if (next && next !== raw) {
                node.textContent = next;
            }
        });
    }

    function translateAttributes() {
        document.querySelectorAll("[placeholder]").forEach(function (el) {
            const raw = el.getAttribute("placeholder") || "";
            const next = findTranslation(raw) || replaceKnownPhrases(raw);

            if (next && next !== raw) {
                el.setAttribute("placeholder", next);
            }
        });

        document.querySelectorAll("[title]").forEach(function (el) {
            const raw = el.getAttribute("title") || "";
            const next = findTranslation(raw) || replaceKnownPhrases(raw);

            if (next && next !== raw) {
                el.setAttribute("title", next);
            }
        });
    }

    function translateOptions() {
        document.querySelectorAll("option").forEach(function (option) {
            if (!option.dataset.originalText) {
                option.dataset.originalText = option.textContent.trim();
            }

            const original = option.dataset.originalText;
            const current = option.textContent.trim();
            const base = currentLang() === "fr" ? original : current;

            const next = findTranslation(base) || findTranslation(original) || replaceKnownPhrases(base);

            if (next && next !== current) {
                if (!option.hasAttribute("value")) {
                    option.setAttribute("value", original);
                }

                option.textContent = next;
            }
        });
    }

    function runTranslations() {
        if (!document.body) return;

        // AFB_TRANSLATE_PERF_V1 : langue jamais changée -> la page est dans sa
        // langue d'origine (FR), il n'y a rien à traduire. Évite de balayer
        // tout le DOM à chaque clic/saisie pour la quasi-totalité des clients.
        if (localStorage.getItem(STORAGE_KEY) === null) return;

        translateTextNodes();
        translateAttributes();
        translateOptions();
    }

    let timers = [];

    function scheduleTranslations() {
        // AFB_TRANSLATE_PERF_V1 : vrai debounce — l'ancienne version n'annulait
        // que le premier timer et empilait 2 balayages complets de plus par
        // clic/frappe clavier.
        timers.forEach(clearTimeout);
        timers = [
            setTimeout(runTranslations, 180),
            setTimeout(runTranslations, 650),
            setTimeout(runTranslations, 1300)
        ];
    }

    function wrapLanguageSwitcher() {
        if (typeof window.setManagerClientLanguage !== "function") return;
        if (window.setManagerClientLanguage.__fullTranslationWrapped) return;

        const original = window.setManagerClientLanguage;

        window.setManagerClientLanguage = function () {
            const result = original.apply(this, arguments);
            scheduleTranslations();
            return result;
        };

        window.setManagerClientLanguage.__fullTranslationWrapped = true;
    }

    document.addEventListener("DOMContentLoaded", function () {
        runTranslations();

        setTimeout(runTranslations, 500);
        setTimeout(runTranslations, 1500);
        setTimeout(runTranslations, 3000);

        setTimeout(wrapLanguageSwitcher, 300);
        setTimeout(wrapLanguageSwitcher, 1000);

        document.addEventListener("click", scheduleTranslations);
        document.addEventListener("change", scheduleTranslations);
        document.addEventListener("input", scheduleTranslations);
    });
})();

;/* ==== bloc script 29/40 (ordre du document preserve) ==== */

/* SELFIE_CAPTURE_BUTTON_MOBILE_FIX_V1 */
(function () {
    function pageLooksLikeSelfieCapture() {
        const text = (document.body.innerText || "").toLowerCase();
        return (
            text.includes("capture photo selfie") ||
            text.includes("placez votre visage") ||
            text.includes("capturer la photo") ||
            text.includes("auto-capture")
        );
    }

    function findCaptureButton() {
        const candidates = Array.from(document.querySelectorAll("button, a, input[type='button'], input[type='submit']"));

        return candidates.find(function (el) {
            const label = (
                el.innerText ||
                el.value ||
                el.getAttribute("aria-label") ||
                el.getAttribute("title") ||
                ""
            ).toLowerCase();

            return (
                label.includes("capturer") ||
                label.includes("capture") ||
                label.includes("prendre la photo") ||
                label.includes("photo")
            ) && !label.includes("fermer");
        });
    }

    function createFloatingCaptureButton(existingButton) {
        if (document.getElementById("selfieFloatingCaptureFix")) return;

        document.body.classList.add("selfie-capture-active");

        const bar = document.createElement("div");
        bar.id = "selfieFloatingCaptureFix";
        bar.className = "selfie-manual-capture-fix";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerText = "Capturer la photo";

        btn.addEventListener("click", function () {
            const freshButton = findCaptureButton();

            if (freshButton && freshButton !== btn) {
                freshButton.click();
                return;
            }

            const possibleFns = [
                "capturePhoto",
                "captureSelfie",
                "takePhoto",
                "takeSelfie",
                "manualCapture",
                "captureImage"
            ];

            for (const fnName of possibleFns) {
                if (typeof window[fnName] === "function") {
                    window[fnName]();
                    return;
                }
            }

            alert("Bouton de capture introuvable. Veuillez faire défiler légèrement la page ou contacter le support.");
        });

        bar.appendChild(btn);
        document.body.appendChild(bar);
    }

    function init() {
        if (!pageLooksLikeSelfieCapture()) return;

        const existingButton = findCaptureButton();

        if (existingButton) {
            existingButton.style.display = "";
            existingButton.style.visibility = "visible";
        }

        createFloatingCaptureButton(existingButton);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    setTimeout(init, 1000);
    setTimeout(init, 2500);
})();

;/* ==== bloc script 30/40 (ordre du document preserve) ==== */

/* AFB_FINAL_FORM_STEP0_PREFILL_AND_PAYLOAD_V1 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_FORM_STEP0_PREFILL_AND_PAYLOAD_V1) return;
  window.__AFB_FINAL_FORM_STEP0_PREFILL_AND_PAYLOAD_V1 = true;

  const STEP0_PAYLOAD_KEY = "diaspora_step0_payload";

  function readPayload() {
    try {
      return JSON.parse(localStorage.getItem(STEP0_PAYLOAD_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function query(selector) {
    return document.querySelector(selector);
  }

  function setValue(selectors, value) {
    if (!value) return false;

    for (const selector of selectors) {
      const input = query(selector);
      if (!input) continue;

      const current = String(input.value || "").trim();
      if (current) return true;

      if (input.tagName === "SELECT") {
        let matched = false;

        Array.from(input.options).forEach(function (option) {
          if (String(option.value || "").toLowerCase() === String(value).toLowerCase() ||
              String(option.textContent || "").toLowerCase() === String(value).toLowerCase()) {
            input.value = option.value;
            matched = true;
          }
        });

        if (!matched) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          input.appendChild(option);
          input.value = value;
        }
      } else {
        input.value = value;
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      return true;
    }

    return false;
  }

  function ensureHiddenField(name, value) {
    if (!value) return;

    let input = document.querySelector('[name="' + name + '"]');

    if (!input) {
      const form = document.querySelector("form") || document.body;
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.id = name;
      form.appendChild(input);
    }

    input.value = value;
  }

  function prefillFinalForm() {
    const payload = readPayload();

    setValue([
      '#email',
      '[name="email"]',
      '#client_email',
      '[name="client_email"]'
    ], payload.email);

    setValue([
      '#phone',
      '[name="phone"]',
      '#telephone',
      '[name="telephone"]',
      '#client_phone',
      '[name="client_phone"]'
    ], payload.whatsapp_phone_full || payload.phone);

    setValue([
      '#residence',
      '[name="residence"]',
      '#country_of_residence',
      '[name="country_of_residence"]'
    ], payload.country_of_residence || payload.residence);

    ensureHiddenField("pre_onboarding_session_id", payload.pre_onboarding_session_id);
  }

  function mergeStep0IntoApplicationBody(body) {
    const payload = readPayload();

    if (!payload || !payload.pre_onboarding_session_id) return body;

    body.pre_onboarding_session_id = body.pre_onboarding_session_id || payload.pre_onboarding_session_id;
    body.email = body.email || payload.email;
    body.phone = body.phone || payload.whatsapp_phone_full || payload.phone;
    body.residence = body.residence || payload.country_of_residence || payload.residence;

    return body;
  }

  const originalFetch = window.fetch;

  window.fetch = function (input, init) {
    try {
      const url = typeof input === "string" ? input : String(input && input.url || "");

      if (url.includes("/api/applications") && init && init.body && typeof init.body === "string") {
        const body = JSON.parse(init.body);
        init.body = JSON.stringify(mergeStep0IntoApplicationBody(body));
      }
    } catch (e) {}

    return originalFetch.apply(this, arguments);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prefillFinalForm);
  } else {
    prefillFinalForm();
  }

  setTimeout(prefillFinalForm, 500);
  setTimeout(prefillFinalForm, 1200);
})();

;/* ==== bloc script 31/40 (ordre du document preserve) ==== */

/* AFB_FINAL_FORM_REAL_STEP0_PREFILL_V2 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_FORM_REAL_STEP0_PREFILL_V2) return;
  window.__AFB_FINAL_FORM_REAL_STEP0_PREFILL_V2 = true;

  const STEP0_PAYLOAD_KEY = "diaspora_step0_payload";

  function el(id) {
    return document.getElementById(id);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function readPayload() {
    const params = new URLSearchParams(window.location.search);

    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(STEP0_PAYLOAD_KEY) || "{}") || {};
    } catch (e) {
      stored = {};
    }

    const payload = {
      pre_onboarding_session_id:
        params.get("pre_session") ||
        stored.pre_onboarding_session_id ||
        localStorage.getItem("diaspora_pre_onboarding_session_id") ||
        "",

      email:
        params.get("step0_email") ||
        stored.email ||
        localStorage.getItem("diaspora_step0_email") ||
        "",

      phone:
        params.get("step0_phone") ||
        stored.whatsapp_phone_full ||
        stored.phone ||
        localStorage.getItem("diaspora_step0_whatsapp_full") ||
        localStorage.getItem("diaspora_step0_whatsapp_otp_phone") ||
        "",

      residence:
        params.get("step0_residence") ||
        stored.country_of_residence ||
        stored.residence ||
        localStorage.getItem("diaspora_step0_country") ||
        localStorage.getItem("diaspora_step0_residence") ||
        ""
    };

    payload.email = clean(payload.email).toLowerCase();
    payload.phone = normalizePhone(payload.phone);
    payload.residence = clean(payload.residence);

    return payload;
  }

  function normalizePhone(phone) {
    const value = clean(phone);
    if (!value) return "";
    if (value.startsWith("+")) return "+" + digits(value);
    return "+" + digits(value);
  }

  function setInputValue(input, value, overwrite) {
    if (!input || !value) return false;

    if (!overwrite && clean(input.value)) return true;

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function findDialOption(select, fullPhone) {
    if (!select || !fullPhone) return null;

    const phoneDigits = digits(fullPhone);

    const options = Array.from(select.options || [])
      .map(function (option) {
        const code = clean(option.value || option.dataset.callingCode || option.dataset.code || option.textContent);
        const codeDigits = digits(code);
        return { option, code, codeDigits };
      })
      .filter(function (item) {
        return item.codeDigits && phoneDigits.startsWith(item.codeDigits);
      })
      .sort(function (a, b) {
        return b.codeDigits.length - a.codeDigits.length;
      });

    return options.length ? options[0] : null;
  }

  function prefillPhone(payload) {
    // AFB_WHATSAPP_PREFILL_KEEP_V9 : le téléphone WhatsApp est prérempli par
    // le module final unique (V8), qui respecte le formatage PHONE_FINAL_V10
    // et la saisie manuelle. Les variantes historiques se contredisaient
    // (change d'indicatif → purge du champ) et laissaient le champ vide.
    return;

    const fullPhone = normalizePhone(payload.phone);
    if (!fullPhone) return;

    const countrySelect = el("phone_country");
    const localInput = el("phone_local");
    const hiddenPhone = el("phone") || qs('[name="phone"]');

    if (hiddenPhone) {
      setInputValue(hiddenPhone, fullPhone, true);
    }

    const match = findDialOption(countrySelect, fullPhone);

    if (countrySelect && match) {
      countrySelect.value = match.option.value;
      countrySelect.dispatchEvent(new Event("input", { bubbles: true }));
      countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (localInput) {
      let local = digits(fullPhone);

      if (match && match.codeDigits && local.startsWith(match.codeDigits)) {
        local = local.slice(match.codeDigits.length);
      }

      local = local.replace(/^0+/, "");

      setInputValue(localInput, local, true);
      localInput.placeholder = localInput.placeholder || local;
    }

    if (typeof window.composePhoneNumber === "function") {
      try {
        window.composePhoneNumber("phone_country", "phone_local", "phone");
      } catch (e) {}
    }

    if (hiddenPhone) {
      setInputValue(hiddenPhone, fullPhone, true);
    }
  }

  function prefillEmail(payload) {
    const emailInput = qs('[name="email"]') || el("email") || el("client_email");
    setInputValue(emailInput, payload.email, true);
  }

  function prefillResidence(payload) {
    if (!payload.residence) return;

    const hiddenResidence = el("residence") || qs('[name="residence"]');
    const visibleResidence =
      el("residenceCountrySearch") ||
      el("country_of_residence") ||
      qs('[name="country_of_residence"]') ||
      qs('[name="residence_country"]');

    setInputValue(hiddenResidence, payload.residence, true);
    setInputValue(visibleResidence, payload.residence, true);

    if (visibleResidence) {
      visibleResidence.classList.add("with-selected-flag");
      visibleResidence.setAttribute("data-prefilled-step0", "1");
    }
  }

  function prefillSession(payload) {
    const sessionInput =
      el("pre_onboarding_session_id") ||
      qs('[name="pre_onboarding_session_id"]');

    setInputValue(sessionInput, payload.pre_onboarding_session_id, true);
  }

  function persistPayload(payload) {
    if (!payload) return;

    localStorage.setItem(STEP0_PAYLOAD_KEY, JSON.stringify({
      pre_onboarding_session_id: payload.pre_onboarding_session_id,
      email: payload.email,
      phone: payload.phone,
      whatsapp_phone_full: payload.phone,
      residence: payload.residence,
      country_of_residence: payload.residence,
      restored_at: new Date().toISOString()
    }));
  }

  function applyPrefill() {
    const payload = readPayload();

    if (!payload.email && !payload.phone && !payload.residence) {
      console.warn("AFB_FINAL_FORM_REAL_STEP0_PREFILL_V2 : aucune donnée Étape 0 trouvée.");
      return;
    }

    persistPayload(payload);
    prefillSession(payload);
    prefillEmail(payload);
    prefillPhone(payload);
    prefillResidence(payload);

    window.__AFB_FINAL_STEP0_PREFILL_PAYLOAD__ = payload;

    console.log("AFB_FINAL_FORM_REAL_STEP0_PREFILL_V2 appliqué :", payload);
  }

  function mergePayloadIntoBody(body) {
    const payload = readPayload();

    if (!body || typeof body !== "object") return body;

    if (payload.pre_onboarding_session_id) {
      body.pre_onboarding_session_id = body.pre_onboarding_session_id || payload.pre_onboarding_session_id;
    }

    if (payload.email) {
      body.email = body.email || payload.email;
    }

    if (payload.phone) {
      body.phone = payload.phone;
    }

    if (payload.residence) {
      body.residence = body.residence || payload.residence;
    }

    return body;
  }

  function bindSubmitGuard() {
    const form = el("accountForm") || qs("form");
    if (!form || form.dataset.step0RealPrefillSubmit === "1") return;

    form.dataset.step0RealPrefillSubmit = "1";

    form.addEventListener("submit", function () {
      applyPrefill();
    }, true);
  }

  function wrapFetch() {
    if (window.__AFB_FINAL_FORM_REAL_STEP0_FETCH_WRAPPED_V2) return;
    window.__AFB_FINAL_FORM_REAL_STEP0_FETCH_WRAPPED_V2 = true;

    const originalFetch = window.fetch;

    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : String(input && input.url || "");

        if (url.includes("/api/applications") && init && init.body && typeof init.body === "string") {
          const body = JSON.parse(init.body);
          init.body = JSON.stringify(mergePayloadIntoBody(body));
        }
      } catch (e) {}

      return originalFetch.apply(this, arguments);
    };
  }

  function init() {
    applyPrefill();
    bindSubmitGuard();
    wrapFetch();

    setTimeout(applyPrefill, 300);
    setTimeout(applyPrefill, 900);
    setTimeout(applyPrefill, 1800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

;/* ==== bloc script 32/40 (ordre du document preserve) ==== */

/* AFB_FINAL_FORM_PHONE_PREFILL_FIX_V3 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_FORM_PHONE_PREFILL_FIX_V3) return;
  window.__AFB_FINAL_FORM_PHONE_PREFILL_FIX_V3 = true;

  function el(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizePhone(value) {
    const raw = clean(value);
    if (!raw) return "";
    return "+" + digits(raw);
  }

  function readStep0Phone() {
    const params = new URLSearchParams(window.location.search);

    let payload = {};
    try {
      payload = JSON.parse(localStorage.getItem("diaspora_step0_payload") || "{}") || {};
    } catch (e) {
      payload = {};
    }

    return normalizePhone(
      params.get("step0_phone") ||
      payload.whatsapp_phone_full ||
      payload.phone ||
      localStorage.getItem("diaspora_step0_whatsapp_full") ||
      localStorage.getItem("diaspora_step0_whatsapp_otp_phone") ||
      ""
    );
  }

  function findBestCountryOption(select, fullPhone) {
    if (!select || !fullPhone) return null;

    const fullDigits = digits(fullPhone);

    return Array.from(select.options || [])
      .map(function (option) {
        const value = clean(option.value);
        const text = clean(option.textContent);
        const dataCalling = clean(option.dataset.callingCode || option.dataset.code || "");
        const codeDigits = digits(dataCalling || value || text);

        return {
          option: option,
          codeDigits: codeDigits
        };
      })
      .filter(function (item) {
        return item.codeDigits && fullDigits.startsWith(item.codeDigits);
      })
      .sort(function (a, b) {
        return b.codeDigits.length - a.codeDigits.length;
      })[0] || null;
  }

  function setValue(input, value) {
    if (!input || !value) return;

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function fillPhoneOnce() {
    // AFB_WHATSAPP_PREFILL_KEEP_V9 : neutralisé — ce remplisseur répétait un
    // « change » d'indicatif toutes les 300 ms, que PHONE_FINAL_V10 punissait
    // en vidant le champ : le numéro ne se préchargeait jamais. Le module
    // final unique (V8) assure désormais seul le préremplissage.
    return true;

    const fullPhone = readStep0Phone();
    if (!fullPhone) return false;

    const countrySelect = el("phone_country");
    const localInput = el("phone_local");
    const hiddenInput = el("phone");

    if (!countrySelect || !localInput || !hiddenInput) return false;

    const match = findBestCountryOption(countrySelect, fullPhone);

    let local = digits(fullPhone);

    if (match && match.codeDigits) {
      countrySelect.value = match.option.value;
      countrySelect.dispatchEvent(new Event("input", { bubbles: true }));
      countrySelect.dispatchEvent(new Event("change", { bubbles: true }));

      if (local.startsWith(match.codeDigits)) {
        local = local.slice(match.codeDigits.length);
      }
    }

    local = local.replace(/^0+/, "");

    setValue(localInput, local);
    setValue(hiddenInput, fullPhone);

    // Si les fonctions natives du formulaire existent, on les laisse recomposer,
    // puis on remet la valeur exacte complète pour éviter toute perte.
    try {
      if (typeof window.composePhoneNumber === "function") {
        window.composePhoneNumber("phone_country", "phone_local", "phone");
      }
    } catch (e) {}

    setTimeout(function () {
      setValue(localInput, local);
      setValue(hiddenInput, fullPhone);
    }, 100);

    setTimeout(function () {
      setValue(localInput, local);
      setValue(hiddenInput, fullPhone);
    }, 500);

    window.__AFB_STEP0_PHONE_PREFILLED__ = {
      phone_country_value: countrySelect.value,
      phone_local_value: localInput.value,
      phone_hidden_value: hiddenInput.value,
      source_phone: fullPhone
    };

    console.log("AFB_FINAL_FORM_PHONE_PREFILL_FIX_V3 appliqué :", window.__AFB_STEP0_PHONE_PREFILLED__);

    return true;
  }

  function runRepeated() {
    let count = 0;

    const timer = setInterval(function () {
      count += 1;

      const ok = fillPhoneOnce();
      const select = el("phone_country");

      // On continue quelques secondes parce que la liste des pays est chargée async.
      if ((ok && select && select.options && select.options.length > 5 && count > 4) || count > 30) {
        clearInterval(timer);
      }
    }, 300);
  }

  function observeCountrySelect() {
    const select = el("phone_country");
    if (!select || select.dataset.step0PhoneObserver === "1") return;

    select.dataset.step0PhoneObserver = "1";

    const observer = new MutationObserver(function () {
      fillPhoneOnce();
    });

    observer.observe(select, { childList: true, subtree: true });
  }

  function init() {
    fillPhoneOnce();
    observeCountrySelect();
    runRepeated();

    setTimeout(fillPhoneOnce, 1000);
    setTimeout(fillPhoneOnce, 2000);
    setTimeout(fillPhoneOnce, 3500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

;/* ==== bloc script 33/40 (ordre du document preserve) ==== */

/* AFB_FINAL_RESIDENCE_PREFILL_DROPDOWN_FIX_V1 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_RESIDENCE_PREFILL_DROPDOWN_FIX_V1) return;
  window.__AFB_FINAL_RESIDENCE_PREFILL_DROPDOWN_FIX_V1 = true;

  function el(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function readStep0Residence() {
    const params = new URLSearchParams(window.location.search);

    let payload = {};
    try {
      payload = JSON.parse(localStorage.getItem("diaspora_step0_payload") || "{}") || {};
    } catch (e) {
      payload = {};
    }

    return clean(
      params.get("step0_residence") ||
      payload.country_of_residence ||
      payload.residence ||
      localStorage.getItem("diaspora_step0_country") ||
      localStorage.getItem("diaspora_step0_residence") ||
      ""
    );
  }

  function applyResidenceCleanState() {
    const visible = el("residenceCountrySearch");
    const hidden = el("residence");
    const dropdown = el("residenceCountryDropdown");
    const helper = el("residenceCountryHelper");

    if (!visible || !hidden) return false;

    const step0Residence = readStep0Residence();
    const visibleValue = clean(visible.value);
    const hiddenValue = clean(hidden.value);

    const hasPrefilledResidence =
      Boolean(step0Residence) &&
      (
        visibleValue.toLowerCase() === step0Residence.toLowerCase() ||
        hiddenValue.toLowerCase() === step0Residence.toLowerCase() ||
        visible.dataset.prefilledStep0 === "1"
      );

    if (!hasPrefilledResidence) return false;

    visible.value = visibleValue || step0Residence;
    hidden.value = hiddenValue || step0Residence;

    visible.dataset.prefilledStep0 = "1";
    visible.classList.add("with-selected-flag");

    document.body.classList.add("residence-prefilled-clean");

    if (dropdown) {
      dropdown.innerHTML = "";
      dropdown.style.display = "none";
      dropdown.hidden = true;
    }

    if (helper) {
      helper.textContent = "Pays de résidence prérempli depuis la pré-inscription.";
      helper.style.display = "block";
    }

    visible.dispatchEvent(new Event("change", { bubbles: true }));
    hidden.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  }

  function observeDropdown() {
    const dropdown = el("residenceCountryDropdown");
    if (!dropdown || dropdown.dataset.residencePrefillObserver === "1") return;

    dropdown.dataset.residencePrefillObserver = "1";

    const observer = new MutationObserver(function () {
      applyResidenceCleanState();
    });

    observer.observe(dropdown, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function bindManualEditReset() {
    const visible = el("residenceCountrySearch");
    if (!visible || visible.dataset.residenceManualResetBound === "1") return;

    visible.dataset.residenceManualResetBound = "1";

    visible.addEventListener("input", function () {
      const step0Residence = readStep0Residence();
      const current = clean(visible.value);

      if (current && step0Residence && current.toLowerCase() !== step0Residence.toLowerCase()) {
        visible.dataset.prefilledStep0 = "0";
        document.body.classList.remove("residence-prefilled-clean");

        const dropdown = el("residenceCountryDropdown");
        if (dropdown) {
          dropdown.hidden = false;
          dropdown.style.display = "";
        }
      }
    }, true);
  }

  function init() {
    applyResidenceCleanState();
    observeDropdown();
    bindManualEditReset();

    setTimeout(applyResidenceCleanState, 300);
    setTimeout(applyResidenceCleanState, 900);
    setTimeout(applyResidenceCleanState, 1800);
    setTimeout(applyResidenceCleanState, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

;/* ==== bloc script 34/40 (ordre du document preserve) ==== */

/* AFB_FINAL_STEP0_OTP_PAYLOAD_BRIDGE_V1 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_STEP0_OTP_PAYLOAD_BRIDGE_V1) return;
  window.__AFB_FINAL_STEP0_OTP_PAYLOAD_BRIDGE_V1 = true;

  function readStep0Payload() {
    try {
      return JSON.parse(localStorage.getItem("diaspora_step0_payload") || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function readOtpVerified(payload) {
    const phone =
      payload.whatsapp_phone_full ||
      payload.phone ||
      localStorage.getItem("diaspora_step0_whatsapp_full") ||
      localStorage.getItem("diaspora_step0_whatsapp_otp_phone") ||
      "";

    return (
      payload.whatsapp_otp_verified === true ||
      payload.whatsapp_otp_verified === "true" ||
      (
        localStorage.getItem("diaspora_step0_whatsapp_otp_verified") === "true" &&
        localStorage.getItem("diaspora_step0_whatsapp_otp_phone") === phone
      )
    );
  }

  function enrichBody(body) {
    const payload = readStep0Payload();

    if (!body || typeof body !== "object") return body;

    const phone =
      payload.whatsapp_phone_full ||
      payload.phone ||
      body.phone ||
      "";

    const otpVerified = readOtpVerified(payload);

    if (payload.pre_onboarding_session_id) {
      body.pre_onboarding_session_id = body.pre_onboarding_session_id || payload.pre_onboarding_session_id;
    }

    if (phone) {
      body.phone = body.phone || phone;
      body.whatsapp_phone_full = phone;
    }

    body.whatsapp_otp_verified = Boolean(otpVerified);

    if (otpVerified) {
      body.whatsapp_otp_verified_at =
        payload.whatsapp_otp_verified_at ||
        new Date().toISOString();
    }

    return body;
  }

  const previousFetch = window.fetch;

  window.fetch = function (input, init) {
    try {
      const url = typeof input === "string" ? input : String(input && input.url || "");

      if (url.includes("/api/applications") && init && init.body && typeof init.body === "string") {
        const body = JSON.parse(init.body);
        init.body = JSON.stringify(enrichBody(body));
      }
    } catch (e) {}

    return previousFetch.apply(this, arguments);
  };
})();

;/* ==== bloc script 35/40 (ordre du document preserve) ==== */

/* AFB_FINAL_MINIMAL_STEP0_PREFILL_V7 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_MINIMAL_STEP0_PREFILL_V7) return;
  window.__AFB_FINAL_MINIMAL_STEP0_PREFILL_V7 = true;

  function el(id) {
    return document.getElementById(id);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizePhone(value) {
    const raw = clean(value);
    if (!raw) return "";
    return "+" + digits(raw);
  }

  function readStoredPayload() {
    try {
      return JSON.parse(localStorage.getItem("diaspora_step0_payload") || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function readStep0() {
    const params = new URLSearchParams(window.location.search);
    const stored = readStoredPayload();

    return {
      preSession:
        clean(params.get("pre_session")) ||
        clean(stored.pre_onboarding_session_id) ||
        clean(localStorage.getItem("diaspora_pre_onboarding_session_id")),

      email:
        clean(params.get("step0_email")) ||
        clean(stored.email) ||
        clean(localStorage.getItem("diaspora_step0_email")),

      residence:
        clean(params.get("step0_residence")) ||
        clean(stored.country_of_residence) ||
        clean(stored.residence) ||
        clean(localStorage.getItem("diaspora_step0_country")) ||
        clean(localStorage.getItem("diaspora_step0_residence")),

      phone:
        normalizePhone(
          params.get("step0_phone") ||
          stored.whatsapp_phone_full ||
          stored.phone ||
          localStorage.getItem("diaspora_step0_whatsapp_full") ||
          localStorage.getItem("diaspora_step0_whatsapp_otp_phone") ||
          ""
        ),

      otpVerified:
        params.get("step0_otp_verified") === "1" ||
        stored.whatsapp_otp_verified === true ||
        stored.whatsapp_otp_verified === "true",

      otpVerifiedAt:
        clean(params.get("step0_otp_verified_at")) ||
        clean(stored.whatsapp_otp_verified_at)
    };
  }

  function setValue(field, value) {
    if (!field || !value) return false;

    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  }

  function fillEmail(data) {
    const email = qs('[name="email"]');
    setValue(email, data.email);
  }

  function fillResidence(data) {
    if (!data.residence) return;

    const visible = el("residenceCountrySearch");
    const hidden = el("residence") || qs('[name="residence"]');
    const dropdown = el("residenceCountryDropdown");
    const helper = el("residenceCountryHelper");

    setValue(visible, data.residence);
    setValue(hidden, data.residence);

    if (visible) {
      visible.dataset.prefilledStep0 = "1";
    }

    if (dropdown) {
      dropdown.innerHTML = "";
      dropdown.style.display = "none";
      dropdown.hidden = true;
    }

    if (helper) {
      helper.textContent = "Pays de résidence prérempli depuis la pré-inscription.";
      helper.style.display = "block";
    }
  }

  function detectDialCode(fullPhone) {
    const all = digits(fullPhone);

    const known = [
      "237","225","221","239","33","32","1","44","49","39","34","41",
      "241","242","243","235","236","240","234","229","228","233",
      "223","226","227","212","213","216","20","27","86","91","90","55"
    ].sort(function (a, b) {
      return b.length - a.length;
    });

    for (const code of known) {
      if (all.startsWith(code)) return code;
    }

    return "";
  }

  function findDialOption(select, code) {
    if (!select || !code) return null;

    return Array.from(select.options || []).find(function (option) {
      const txt = [
        option.value,
        option.textContent,
        option.dataset.callingCode,
        option.dataset.code
      ].join(" ");

      return digits(txt).includes(code);
    }) || null;
  }

  function fillPhone(data) {
    // AFB_WHATSAPP_PREFILL_KEEP_V9 : neutralisé au profit du module final
    // unique (V8) — voir fillWhatsappOnly.
    return;

    const fullPhone = normalizePhone(data.phone);
    if (!fullPhone) return;

    const countrySelect = el("phone_country");
    const localInput = el("phone_local");
    const hiddenPhone = el("phone") || qs('[name="phone"]');

    if (!localInput || !hiddenPhone) return;

    const code = detectDialCode(fullPhone);
    let local = digits(fullPhone);

    if (code && local.startsWith(code)) {
      local = local.slice(code.length);
    }

    local = local.replace(/^0+/, "");

    if (countrySelect && code) {
      const option = findDialOption(countrySelect, code);
      if (option) {
        countrySelect.value = option.value;
        countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    setValue(localInput, local);
    setValue(hiddenPhone, fullPhone);

    try {
      if (typeof window.composePhoneNumber === "function") {
        window.composePhoneNumber("phone_country", "phone_local", "phone");
      }
    } catch (e) {}

    setValue(hiddenPhone, fullPhone);
  }

  function fillSession(data) {
    const input = el("pre_onboarding_session_id") || qs('[name="pre_onboarding_session_id"]');
    setValue(input, data.preSession);
  }

  function saveNormalizedPayload(data) {
    try {
      localStorage.setItem("diaspora_step0_payload", JSON.stringify({
        pre_onboarding_session_id: data.preSession,
        email: data.email,
        phone: data.phone,
        whatsapp_phone_full: data.phone,
        residence: data.residence,
        country_of_residence: data.residence,
        whatsapp_otp_verified: Boolean(data.otpVerified),
        whatsapp_otp_verified_at: data.otpVerifiedAt || null,
        saved_by: "AFB_FINAL_MINIMAL_STEP0_PREFILL_V7",
        saved_at: new Date().toISOString()
      }));
    } catch (e) {}
  }

  function applyPrefill() {
    const data = readStep0();

    if (!data.email && !data.residence && !data.phone) return;

    saveNormalizedPayload(data);
    fillSession(data);
    fillEmail(data);
    fillResidence(data);
    fillPhone(data);

    window.__AFB_FINAL_MINIMAL_STEP0_PREFILL_V7_DATA__ = data;
  }

  function enrichApplicationPayload(body) {
    const data = readStep0();

    if (!body || typeof body !== "object") return body;

    if (data.preSession) {
      body.pre_onboarding_session_id = body.pre_onboarding_session_id || data.preSession;
    }

    if (data.email) {
      body.email = body.email || data.email;
    }

    if (data.residence) {
      body.residence = body.residence || data.residence;
    }

    if (data.phone) {
      body.phone = data.phone;
      body.whatsapp_phone_full = data.phone;
    }

    body.whatsapp_otp_verified = Boolean(data.otpVerified);

    if (data.otpVerified) {
      body.whatsapp_otp_verified_at = data.otpVerifiedAt || new Date().toISOString();
    }

    return body;
  }

  function wrapFetch() {
    if (window.__AFB_FINAL_MINIMAL_STEP0_PREFILL_V7_FETCH) return;
    window.__AFB_FINAL_MINIMAL_STEP0_PREFILL_V7_FETCH = true;

    const oldFetch = window.fetch;

    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : String(input && input.url || "");

        if (url.includes("/api/applications") && init && init.body && typeof init.body === "string") {
          const body = JSON.parse(init.body);
          init.body = JSON.stringify(enrichApplicationPayload(body));
        }
      } catch (e) {}

      return oldFetch.apply(this, arguments);
    };
  }

  function bindSubmit() {
    const form = el("accountForm") || qs("form");
    if (!form || form.dataset.minimalStep0PrefillV7Submit === "1") return;

    form.dataset.minimalStep0PrefillV7Submit = "1";

    form.addEventListener("submit", function () {
      applyPrefill();
    }, true);
  }

  function init() {
    wrapFetch();
    bindSubmit();

    applyPrefill();
    setTimeout(applyPrefill, 700);
    setTimeout(applyPrefill, 1800);
    setTimeout(applyPrefill, 3500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

;/* ==== bloc script 36/40 (ordre du document preserve) ==== */

/* AFB_FINAL_WHATSAPP_ONLY_PREFILL_V8 */
(function () {
  "use strict";

  if (window.__AFB_FINAL_WHATSAPP_ONLY_PREFILL_V8) return;
  window.__AFB_FINAL_WHATSAPP_ONLY_PREFILL_V8 = true;

  const KNOWN_CODES = [
    "237","225","221","239","33","32","1","44","49","39","34","41",
    "241","242","243","235","236","240","234","229","228","233",
    "223","226","227","212","213","216","20","27","86","91","90","55"
  ].sort(function (a, b) {
    return b.length - a.length;
  });

  function el(id) {
    return document.getElementById(id);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizePhone(value) {
    const raw = clean(value);
    if (!raw) return "";
    return "+" + digits(raw);
  }

  function readPhone() {
    const params = new URLSearchParams(window.location.search);

    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem("diaspora_step0_payload") || "{}") || {};
    } catch (e) {
      stored = {};
    }

    return normalizePhone(
      params.get("step0_phone") ||
      stored.whatsapp_phone_full ||
      stored.phone ||
      localStorage.getItem("diaspora_step0_whatsapp_full") ||
      localStorage.getItem("diaspora_step0_whatsapp_otp_phone") ||
      ""
    );
  }

  function detectCode(fullPhone) {
    const all = digits(fullPhone);

    for (const code of KNOWN_CODES) {
      if (all.startsWith(code)) return code;
    }

    return "";
  }

  function findOption(select, code) {
    if (!select || !code) return null;

    return Array.from(select.options || []).find(function (option) {
      const source = [
        option.value,
        option.textContent,
        option.dataset.callingCode,
        option.dataset.code
      ].join(" ");

      return digits(source).includes(code);
    }) || null;
  }

  function setValue(field, value) {
    if (!field || !value) return false;

    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  }

  function fillWhatsappOnly() {
    const fullPhone = readPhone();
    if (!fullPhone) return false;

    const countrySelect = el("phone_country");
    const localInput = el("phone_local");
    const hiddenPhone = el("phone") || qs('[name="phone"]');

    if (!localInput || !hiddenPhone) return false;

    const code = detectCode(fullPhone);
    let local = digits(fullPhone);

    if (code && local.startsWith(code)) {
      local = local.slice(code.length);
    }

    local = local.replace(/^0+/, "");

    // AFB_WHATSAPP_PREFILL_KEEP_V9 : si le numéro local attendu est déjà en
    // place, ne pas re-remplir — mais corriger l'indicatif s'il n'a pas pu
    // l'être au premier passage (la liste des pays se charge en asynchrone).
    const currentDigits = digits(localInput.value);
    if (currentDigits === local && local) {
      if (countrySelect && code && countrySelect.options && countrySelect.options.length) {
        const option = findOption(countrySelect, code);

        if (option && countrySelect.value !== option.value) {
          countrySelect.value = option.value;
          countrySelect.dispatchEvent(new Event("change", { bubbles: true }));

          // PHONE_FINAL_V10 vide le champ local après un changement
          // d'indicatif : reposer le numéro après ses purges différées.
          setTimeout(function () {
            setValue(localInput, local);
            try {
              if (typeof window.composePhoneNumber === "function") {
                window.composePhoneNumber("phone_country", "phone_local", "phone");
              }
            } catch (e) {}
            setValue(hiddenPhone, fullPhone);
          }, 320);
        }
      }

      setValue(hiddenPhone, fullPhone);
      return true;
    }

    // Une saisie manuelle différente du préremplissage est respectée.
    if (currentDigits && currentDigits !== local) {
      return false;
    }

    let countryChanged = false;

    if (countrySelect && code && countrySelect.options && countrySelect.options.length) {
      const option = findOption(countrySelect, code);

      // Ne déclencher « change » que si l'indicatif change réellement :
      // PHONE_FINAL_V10 vide le champ local à +50 ms et +200 ms après chaque
      // changement d'indicatif.
      if (option && countrySelect.value !== option.value) {
        countrySelect.value = option.value;
        countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
        countryChanged = true;
      }
    }

    if (countryChanged) {
      // Repasser après les purges différées de PHONE_FINAL_V10.
      setTimeout(function () {
        setValue(localInput, local);
        try {
          if (typeof window.composePhoneNumber === "function") {
            window.composePhoneNumber("phone_country", "phone_local", "phone");
          }
        } catch (e) {}
        setValue(hiddenPhone, fullPhone);
      }, 320);
    }

    setValue(localInput, local);
    setValue(hiddenPhone, fullPhone);

    try {
      if (typeof window.composePhoneNumber === "function") {
        window.composePhoneNumber("phone_country", "phone_local", "phone");
      }
    } catch (e) {}

    setValue(hiddenPhone, fullPhone);

    window.__AFB_FINAL_WHATSAPP_ONLY_PREFILL_V8_RESULT__ = {
      fullPhone: fullPhone,
      code: code,
      local: local,
      countryValue: countrySelect ? countrySelect.value : "",
      hiddenPhone: hiddenPhone ? hiddenPhone.value : ""
    };

    return true;
  }

  function enrichFetchPhone(body) {
    const fullPhone = readPhone();

    if (!body || typeof body !== "object") return body;

    if (fullPhone) {
      body.phone = fullPhone;
      body.whatsapp_phone_full = fullPhone;
    }

    return body;
  }

  function wrapFetch() {
    if (window.__AFB_FINAL_WHATSAPP_ONLY_PREFILL_V8_FETCH) return;
    window.__AFB_FINAL_WHATSAPP_ONLY_PREFILL_V8_FETCH = true;

    const oldFetch = window.fetch;

    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : String(input && input.url || "");

        if (url.includes("/api/applications") && init && init.body && typeof init.body === "string") {
          const body = JSON.parse(init.body);
          init.body = JSON.stringify(enrichFetchPhone(body));
        }
      } catch (e) {}

      return oldFetch.apply(this, arguments);
    };
  }

  function bindSubmit() {
    const form = el("accountForm") || qs("form");
    if (!form || form.dataset.whatsappOnlyV8Submit === "1") return;

    form.dataset.whatsappOnlyV8Submit = "1";

    form.addEventListener("submit", function () {
      fillWhatsappOnly();
    }, true);
  }

  function init() {
    wrapFetch();
    bindSubmit();

    fillWhatsappOnly();

    // Exécutions limitées pour attendre le chargement des indicatifs pays.
    setTimeout(fillWhatsappOnly, 500);
    setTimeout(fillWhatsappOnly, 1200);
    setTimeout(fillWhatsappOnly, 2500);
    setTimeout(fillWhatsappOnly, 4500);
    setTimeout(fillWhatsappOnly, 7000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

;/* ==== bloc script 37/40 (ordre du document preserve) ==== */

/* AFB_GENDER_MAIDEN_AND_AGE_RULES_V1 */
(function () {
  "use strict";

  if (window.__AFB_GENDER_MAIDEN_AND_AGE_RULES_V1) return;
  window.__AFB_GENDER_MAIDEN_AND_AGE_RULES_V1 = true;

  function qs(selector) {
    return document.querySelector(selector);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function normalize(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function isMale(value) {
    const v = normalize(value);
    return (
      v === "masculin" ||
      v === "male" ||
      v === "homme" ||
      v === "m" ||
      v.includes("masculin")
    );
  }

  function getFieldContainer(field) {
    if (!field) return null;

    const gridItem = field.closest(".grid > div");
    if (gridItem) return gridItem;

    const parentDiv = field.closest("div");
    if (parentDiv) return parentDiv;

    return field.parentElement;
  }

  function updateBirthNameVisibility() {
    const sexField = document.getElementById("sex") || qs('[name="sex"]');
    const birthNameField = qs('[name="birth_name"]');
    const birthNameLabel = document.getElementById("birthNameLabel");

    if (!sexField || !birthNameField) return;

    const container = getFieldContainer(birthNameField);
    const male = isMale(sexField.value);

    if (male) {
      birthNameField.value = "";
      birthNameField.required = false;
      birthNameField.removeAttribute("required");
      birthNameField.setCustomValidity("");

      if (container) {
        container.style.display = "none";
        container.dataset.hiddenByGenderRule = "1";
      }

      if (birthNameLabel) {
        birthNameLabel.textContent = "Nom de naissance";
      }
    } else {
      if (container && container.dataset.hiddenByGenderRule === "1") {
        container.style.display = "";
      }

      if (birthNameLabel) {
        birthNameLabel.textContent = "Nom de naissance / Nom de jeune fille";
      }
    }
  }

  function parseBirthDate() {
    const birthDateField = qs('[name="birth_date"]');
    if (!birthDateField || !birthDateField.value) return null;

    const d = new Date(birthDateField.value + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;

    return d;
  }

  function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age;
  }

  function ensureAgeMessage() {
    const birthDateField = qs('[name="birth_date"]');
    if (!birthDateField) return null;

    let msg = document.getElementById("afb-age-validation-message");

    if (!msg) {
      msg = document.createElement("div");
      msg.id = "afb-age-validation-message";
      msg.style.marginTop = "6px";
      msg.style.fontSize = "13px";
      msg.style.fontWeight = "600";
      msg.style.display = "none";
      birthDateField.insertAdjacentElement("afterend", msg);
    }

    return msg;
  }

  function maxBirthDateForAdult() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  }

  function validateAdult(showMessage) {
    const birthDateField = qs('[name="birth_date"]');
    const msg = ensureAgeMessage();

    if (!birthDateField) return true;

    birthDateField.max = maxBirthDateForAdult();

    const birthDate = parseBirthDate();

    if (!birthDate) {
      birthDateField.setCustomValidity("");
      if (msg) msg.style.display = "none";
      return true;
    }

    const age = calculateAge(birthDate);

    if (age < 18) {
      const message = "Le demandeur doit être majeur : âge minimum requis 18 ans.";

      birthDateField.setCustomValidity(message);

      if (msg) {
        msg.textContent = message;
        msg.style.color = "#b91c1c";
        msg.style.display = "block";
      }

      if (showMessage) {
        birthDateField.reportValidity();
        birthDateField.focus();
      }

      return false;
    }

    birthDateField.setCustomValidity("");

    if (msg) {
      msg.textContent = "Âge vérifié : demandeur majeur.";
      msg.style.color = "#166534";
      msg.style.display = "block";
    }

    return true;
  }

  function bindRules() {
    const sexField = document.getElementById("sex") || qs('[name="sex"]');
    const birthDateField = qs('[name="birth_date"]');
    const form = document.getElementById("accountForm") || qs("form");

    if (sexField && sexField.dataset.genderAgeRulesBound !== "1") {
      sexField.dataset.genderAgeRulesBound = "1";
      sexField.addEventListener("change", updateBirthNameVisibility);
      sexField.addEventListener("input", updateBirthNameVisibility);
    }

    if (birthDateField && birthDateField.dataset.ageRulesBound !== "1") {
      birthDateField.dataset.ageRulesBound = "1";
      birthDateField.max = maxBirthDateForAdult();
      birthDateField.addEventListener("change", function () {
        validateAdult(false);
      });
      birthDateField.addEventListener("input", function () {
        validateAdult(false);
      });
    }

    if (form && form.dataset.genderAgeSubmitRulesBound !== "1") {
      form.dataset.genderAgeSubmitRulesBound = "1";

      form.addEventListener("submit", function (event) {
        updateBirthNameVisibility();

        if (!validateAdult(true)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return false;
        }
      }, true);
    }

    updateBirthNameVisibility();
    validateAdult(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindRules);
  } else {
    bindRules();
  }

  setTimeout(bindRules, 500);
  setTimeout(bindRules, 1500);
})();

;/* ==== bloc script 38/40 (ordre du document preserve) ==== */

/* MANAGER_FORM_DOCUMENT_PRELOAD_CAMERA_DOCS_V12 */
(function () {
  if (window.__documentPreloadCameraDocsV12) return;
  window.__documentPreloadCameraDocsV12 = true;

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'");
  }

  function getSessionId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("pre_session") || localStorage.getItem("diaspora_pre_onboarding_session_id") || "";
  }

  function latestByType(docs) {
    const latest = {};

    (docs || []).forEach(function (doc) {
      const t = String(doc.document_type || "").trim().toUpperCase();
      const created = String(doc.created_at || "");

      if (!t) return;

      if (!latest[t] || created >= String(latest[t].created_at || "")) {
        latest[t] = doc;
      }
    });

    return latest;
  }

  function hasAny(latest, types) {
    return types.some(function (t) {
      return !!latest[String(t).toUpperCase()];
    });
  }

  function findCard(keywords, selectorList) {
    const selectors = selectorList || [
      ".camera-doc-card",
      ".photo-card"
    ];

    const cards = Array.from(document.querySelectorAll(selectors.join(",")));

    let best = null;
    let bestLength = Infinity;

    cards.forEach(function (card) {
      const text = norm(card.textContent);

      const ok = keywords.some(function (keyword) {
        return text.includes(norm(keyword));
      });

      if (ok && text.length < bestLength) {
        best = card;
        bestLength = text.length;
      }
    });

    return best;
  }

  function removeOldBadges(card) {
    if (!card) return;

    card.querySelectorAll(
      ".preloaded-final-v12-badge, .preloaded-final-v11-badge, .income-rib-exact-v10-badge, .income-rib-green-v9-badge, .preloaded-clean-v8-badge"
    ).forEach(function (el) {
      el.remove();
    });
  }

  function markPreloaded(card, message) {
    if (!card) return;

    removeOldBadges(card);

    card.style.background = "#f0fdf4";
    card.style.border = "1px solid #86efac";
    card.style.borderRadius = "14px";

    card.querySelectorAll("button").forEach(function (btn) {
      const text = norm(btn.textContent);

      if (
        text.includes("photographier") ||
        text.includes("importer") ||
        text.includes("filmer") ||
        text.includes("capturer")
      ) {
        btn.style.display = "none";
        btn.disabled = true;
      }
    });

    card.querySelectorAll('input[type="file"]').forEach(function (input) {
      input.required = false;
      input.disabled = true;
      input.style.display = "none";
    });

    card.querySelectorAll(".capture-status, .field-message, .helper, .hint, .manager-doc-preview").forEach(function (el) {
      const text = norm(el.textContent);

      if (
        text.includes("aucune photo") ||
        text.includes("aucun document") ||
        text.includes("aucun fichier")
      ) {
        el.style.display = "none";
      }
    });

    const badge = document.createElement("div");
    badge.className = "preloaded-final-v12-badge";
    badge.innerHTML = "✅ " + message;

    badge.style.marginTop = "10px";
    badge.style.padding = "10px 12px";
    badge.style.borderRadius = "12px";
    badge.style.background = "#ecfdf5";
    badge.style.border = "1px solid #bbf7d0";
    badge.style.color = "#166534";
    badge.style.fontWeight = "800";
    badge.style.fontSize = "13px";

    card.appendChild(badge);
  }

  function applyPreloaded(latest) {
    window.preloadedDocumentTypes = latest || {};

    if (hasAny(latest, [
      "CNI_RECTO",
      "CNI_VERSO",
      "PASSPORT_DOCUMENT",
      "RESIDENCE_PERMIT_RECTO",
      "RESIDENCE_PERMIT_VERSO",
      "CONSULAR_CARD_RECTO",
      "CONSULAR_CARD_VERSO",
      "IDENTITY_DOCUMENT_RECTO",
      "IDENTITY_DOCUMENT_VERSO",
      "IDENTITY_DOCUMENT_IMPORTED"
    ])) {
      markPreloaded(
        findCard(["Pièce d’identité officielle", "Pièce d'identité officielle"], [".photo-card"]),
        "Pièce d’identité déjà préchargée depuis le pré-onboarding."
      );
    }

    if (latest.ADDRESS_PROOF) {
      markPreloaded(
        findCard(["Photo du justificatif de domicile"], [".photo-card"]),
        "Justificatif de domicile déjà préchargé depuis le pré-onboarding."
      );
    }

    if (latest.INCOME_PROOF) {
      markPreloaded(
        findCard([
          "Preuve de justification de vos revenus ou de votre activité",
          "Preuve de justification de revenu",
          "vos revenus ou votre activité"
        ], [".camera-doc-card", ".photo-card"]),
        "Justificatif d’activité / revenus déjà préchargé depuis le pré-onboarding."
      );
    }

    if (latest.RIB_DOCUMENT) {
      markPreloaded(
        findCard([
          "Relevé d’identification bancaire - RIB",
          "Relevé d'identification bancaire - RIB",
          "RIB"
        ], [".camera-doc-card", ".photo-card"]),
        "RIB ou coordonnées bancaires déjà préchargé depuis le pré-onboarding."
      );
    }

    if (hasAny(latest, ["CLIENT_PHOTO", "CLIENT_VIDEO", "SELFIE_PHOTO", "SELFIE_VIDEO"])) {
      markPreloaded(
        findCard(["Selfie / preuve de vie"], [".photo-card"]),
        "Photo ou vidéo client déjà préchargée depuis le pré-onboarding."
      );
    }
  }

  async function loadPreloaded() {
    const sessionId = getSessionId();
    if (!sessionId) return;

    try {
      const response = await fetch("/api/pre-onboarding/session/" + encodeURIComponent(sessionId));

      if (!response.ok) {
        throw new Error("Erreur session " + response.status);
      }

      const data = await response.json();
      const latest = latestByType(data.documents || []);

      applyPreloaded(latest);
      setTimeout(function () { applyPreloaded(latest); }, 800);
      setTimeout(function () { applyPreloaded(latest); }, 1800);
      setTimeout(function () { applyPreloaded(latest); }, 3000);
    } catch (error) {
      console.warn("Chargement documents préchargés impossible:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", loadPreloaded);
})();

;/* ==== bloc script 39/40 (ordre du document preserve) ==== */

/* MANAGER_FORM_DYNAMIC_PACKAGES_V1 */
(function () {
    if (window.__managerDynamicPackagesV1) return;
    window.__managerDynamicPackagesV1 = true;

    let selectedPackage = null;

    function money(value, currency) {
        const n = Number(value || 0);
        return n.toLocaleString("fr-FR") + " " + (currency || "XAF");
    }

    function ensurePackageHiddenFields() {
        const form = document.querySelector("form");
        if (!form) return;

        const fields = [
            "selected_package_code",
            "selected_package_name",
            "selected_package_currency",
            "selected_package_opening_fee",
            "selected_package_subscription_fee",
            "selected_package_monthly_fee",
            "selected_package_payment_required"
        ];

        fields.forEach(function (name) {
            if (!form.querySelector(`[name="${name}"]`)) {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                form.appendChild(input);
            }
        });
    }

    function setHiddenValue(name, value) {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) el.value = value ?? "";
    }

    function applySelectedPackage(pkg) {
        selectedPackage = pkg;

        document.querySelectorAll(".dynamic-package-card").forEach(function (card) {
            card.classList.remove("selected");
        });

        const card = document.querySelector(`[data-package-code="${pkg.code}"]`);
        if (card) card.classList.add("selected");

        setHiddenValue("selected_package_code", pkg.code);
        setHiddenValue("selected_package_name", pkg.name);
        setHiddenValue("selected_package_currency", pkg.currency || "XAF");
        setHiddenValue("selected_package_opening_fee", pkg.opening_fee || 0);
        setHiddenValue("selected_package_subscription_fee", pkg.subscription_fee || 0);
        setHiddenValue("selected_package_monthly_fee", pkg.monthly_fee || 0);
        setHiddenValue("selected_package_payment_required", pkg.payment_required ? "true" : "false");

        const oldSelected = document.querySelector('[name="selected_package_ui"]');
        if (oldSelected) {
            oldSelected.value = pkg.name;
        }
    }

    function renderPackage(pkg) {
        const services = Array.isArray(pkg.services) ? pkg.services : [];
        const currency = pkg.currency || "XAF";

        return `
            <div class="package-card dynamic-package-card" data-package-code="${pkg.code}">
                <h4>${pkg.name || pkg.code}</h4>
                <p>${pkg.description || ""}</p>

                ${services.map(service => `<span class="tag">${service}</span>`).join("")}

                <div class="package-price-box">
                    <strong>Tarification</strong><br>
                    Ouverture : ${money(pkg.opening_fee, currency)}<br>
                    Souscription : ${money(pkg.subscription_fee, currency)}<br>
                    Mensuel : ${money(pkg.monthly_fee, currency)}
                    <br>
                    ${pkg.payment_required
                        ? `<span class="package-payment-required">Paiement requis</span>`
                        : `<span class="package-free">Sans paiement immédiat</span>`
                    }
                </div>
            </div>
        `;
    }

    async function loadDynamicPackages() {
        ensurePackageHiddenFields();

        const grid = document.querySelector(".package-grid");
        if (!grid) return;

        try {
            const response = await fetch("/api/backoffice/packages?v=" + Date.now(), {
                cache: "no-store"
            });

            if (!response.ok) return;

            const data = await response.json();
            const packages = (data.packages || []).filter(pkg => pkg.active);

            if (!packages.length) return;

            grid.innerHTML = packages.map(renderPackage).join("");

            grid.querySelectorAll(".dynamic-package-card").forEach(function (card) {
                card.addEventListener("click", function () {
                    const code = card.getAttribute("data-package-code");
                    const pkg = packages.find(p => String(p.code) === String(code));
                    if (pkg) applySelectedPackage(pkg);
                });
            });

            applySelectedPackage(packages[0]);
        } catch (error) {
            console.warn("Chargement packages dynamiques impossible:", error);
        }
    }

    // Ajoute les champs package au JSON envoyé à /api/applications
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        try {
            const url = typeof input === "string" ? input : (input && input.url) || "";

            if (
                url.includes("/api/applications") &&
                init &&
                String(init.method || "").toUpperCase() === "POST" &&
                init.body
            ) {
                const body = JSON.parse(init.body);

                body.selected_package_code = document.querySelector('[name="selected_package_code"]')?.value || null;
                body.selected_package_name = document.querySelector('[name="selected_package_name"]')?.value || null;
                body.selected_package_currency = document.querySelector('[name="selected_package_currency"]')?.value || null;
                body.selected_package_opening_fee = Number(document.querySelector('[name="selected_package_opening_fee"]')?.value || 0);
                body.selected_package_subscription_fee = Number(document.querySelector('[name="selected_package_subscription_fee"]')?.value || 0);
                body.selected_package_monthly_fee = Number(document.querySelector('[name="selected_package_monthly_fee"]')?.value || 0);
                body.selected_package_payment_required = String(document.querySelector('[name="selected_package_payment_required"]')?.value || "false") === "true";

                init.body = JSON.stringify(body);
            }
        } catch (e) {}

        return originalFetch.apply(this, arguments);
    };

    document.addEventListener("DOMContentLoaded", function () {
        setTimeout(loadDynamicPackages, 400);
        setTimeout(loadDynamicPackages, 1200);
    });
})();

;/* ==== bloc script 40/40 (ordre du document preserve) ==== */

(function () {
    if (window.__managerPreOnboardingAcceptFinalV1) return;
    window.__managerPreOnboardingAcceptFinalV1 = true;

    const IDENTITY_TYPES = [
        "CNI_RECTO",
        "CNI_VERSO",
        "PASSPORT_DOCUMENT",
        "RESIDENCE_PERMIT_RECTO",
        "RESIDENCE_PERMIT_VERSO",
        "CONSULAR_CARD_RECTO",
        "CONSULAR_CARD_VERSO",
        "IDENTITY_DOCUMENT_RECTO",
        "IDENTITY_DOCUMENT_VERSO",
        "IDENTITY_DOCUMENT_IMPORTED"
    ];

    const ADDRESS_TYPES = [
        "ADDRESS_PROOF",
        "PROOF_OF_ADDRESS_PHOTO"
    ];

    const INCOME_TYPES = [
        "INCOME_PROOF",
        "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO"
    ];

    const RIB_TYPES = [
        "RIB_DOCUMENT"
    ];

    const SELFIE_TYPES = [
        "CLIENT_PHOTO",
        "CLIENT_VIDEO",
        "SELFIE_PHOTO",
        "SELFIE_VIDEO"
    ];

    function normalizeType(value) {
        return String(value || "").trim().toUpperCase();
    }

    function getSessionId() {
        const params = new URLSearchParams(window.location.search);
        return (
            params.get("pre_session") ||
            localStorage.getItem("diaspora_pre_onboarding_session_id") ||
            ""
        );
    }

    function safeJsonParse(value, fallback) {
        try {
            return JSON.parse(value || "");
        } catch (e) {
            return fallback;
        }
    }

    function latestByType(docs) {
        const latest = {};

        (docs || []).forEach(function (doc) {
            const type = normalizeType(doc.document_type || doc.type || doc.key || "");
            if (!type) return;

            const created = String(doc.created_at || doc.saved_at || doc.captured_at || "");

            if (!latest[type] || created >= String(latest[type].created_at || latest[type].saved_at || latest[type].captured_at || "")) {
                latest[type] = Object.assign({}, doc, { document_type: type });
            }
        });

        return latest;
    }

    function mergeLatest(nextLatest) {
        window.preloadedDocumentTypes = Object.assign(
            {},
            window.preloadedDocumentTypes || {},
            nextLatest || {}
        );

        return window.preloadedDocumentTypes;
    }

    function latest() {
        return window.preloadedDocumentTypes || {};
    }

    function hasAny(types) {
        const map = latest();

        return (types || []).some(function (type) {
            return !!map[normalizeType(type)];
        });
    }

    function loadFromLocalStorage() {
        const docs = [];

        const saved = safeJsonParse(localStorage.getItem("diaspora_pre_onboarding_saved_documents"), {});
        Object.keys(saved || {}).forEach(function (type) {
            if (saved[type]) {
                docs.push(Object.assign({}, saved[type], { document_type: type }));
            }
        });

        const ocr = safeJsonParse(localStorage.getItem("diaspora_pre_onboarding_ocr"), {});
        const ocrSaved = ocr && ocr.saved_documents ? ocr.saved_documents : {};

        Object.keys(ocrSaved || {}).forEach(function (type) {
            if (ocrSaved[type]) {
                docs.push(Object.assign({}, ocrSaved[type], { document_type: type }));
            }
        });

        return latestByType(docs);
    }

    async function loadFromServer() {
        const sessionId = getSessionId();

        if (!sessionId) {
            return {};
        }

        try {
            const response = await fetch("/api/pre-onboarding/session/" + encodeURIComponent(sessionId), {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Session pré-onboarding indisponible : " + response.status);
            }

            const data = await response.json();
            return latestByType(data.documents || []);
        } catch (error) {
            console.warn("Pré-onboarding : lecture serveur impossible, fallback localStorage.", error);
            return {};
        }
    }

    function createPreloadedPlaceholder() {
        return {
            __preloadedSelfie: true,
            name: "selfie_precharge_depuis_pre_onboarding",
            type: "application/x-preloaded"
        };
    }

    function markSelfieAsPreloaded() {
        if (!hasAny(SELFIE_TYPES)) return false;

        window.managerPreloadedSelfieAccepted = true;

        try {
            if (typeof selfieFiles !== "undefined") {
                selfieFiles.imported = null;

                if (!selfieFiles.photo) {
                    selfieFiles.photo = createPreloadedPlaceholder();
                }
            }
        } catch (e) {}

        const status = document.getElementById("selfieCaptureStatus");
        const preview = document.getElementById("selfiePreview");

        if (status) {
            status.className = "capture-status success";
            status.innerText = "✅ Selfie / photo client déjà préchargé depuis le pré-onboarding.";
        }

        if (preview && !document.getElementById("preloadedSelfieFinalBadge")) {
            const badge = document.createElement("div");
            badge.id = "preloadedSelfieFinalBadge";
            badge.className = "preloaded-final-v12-badge";
            badge.innerHTML = "✅ Preuve de vie déjà capturée au début du parcours.";

            badge.style.marginTop = "10px";
            badge.style.padding = "10px 12px";
            badge.style.borderRadius = "12px";
            badge.style.background = "#ecfdf5";
            badge.style.border = "1px solid #bbf7d0";
            badge.style.color = "#166534";
            badge.style.fontWeight = "800";
            badge.style.fontSize = "13px";

            preview.appendChild(badge);
        }

        return true;
    }

    function patchUploadSelfieDocument() {
        if (typeof window.uploadSelfieDocument !== "function") return;
        if (window.uploadSelfieDocument.__preOnboardingAcceptPatched) return;

        const original = window.uploadSelfieDocument;

        const patched = async function (applicationId) {
            if (
                window.managerPreloadedSelfieAccepted ||
                hasAny(SELFIE_TYPES) ||
                (
                    typeof selfieFiles !== "undefined" &&
                    selfieFiles.photo &&
                    selfieFiles.photo.__preloadedSelfie
                )
            ) {
                console.log("Pré-onboarding : selfie déjà rattaché via pre_onboarding_session_id.");
                return { preloaded: true, document_type: "SELFIE_PRELOADED" };
            }

            return original.apply(this, arguments);
        };

        patched.__preOnboardingAcceptPatched = true;

        window.uploadSelfieDocument = patched;

        try {
            uploadSelfieDocument = patched;
        } catch (e) {}
    }

    function patchUploadIdentityDocuments() {
        if (typeof window.uploadIdentityDocuments !== "function") return;
        if (window.uploadIdentityDocuments.__preOnboardingAcceptPatched) return;

        const original = window.uploadIdentityDocuments;

        const patched = async function (applicationId) {
            if (hasAny(IDENTITY_TYPES)) {
                console.log("Pré-onboarding : pièce d’identité déjà rattachée via pre_onboarding_session_id.");
                return { preloaded: true, document_type: "IDENTITY_PRELOADED" };
            }

            return original.apply(this, arguments);
        };

        patched.__preOnboardingAcceptPatched = true;

        window.uploadIdentityDocuments = patched;

        try {
            uploadIdentityDocuments = patched;
        } catch (e) {}
    }

    function patchUploadManagerExtraDocuments() {
        if (typeof window.uploadManagerExtraDocuments !== "function") return;
        if (window.uploadManagerExtraDocuments.__preOnboardingAcceptPatched) return;

        const patched = async function (applicationId) {
            const files = window.managerExtraDocumentFiles || {};

            const incomePreloaded = hasAny(INCOME_TYPES);
            const ribPreloaded = hasAny(RIB_TYPES);

            if (!files.INCOME_PROOF && !incomePreloaded) {
                throw new Error("Veuillez photographier ou précharger la preuve de justification de vos revenus ou votre activité.");
            }

            if (!files.RIB_DOCUMENT && !ribPreloaded) {
                throw new Error("Veuillez photographier ou précharger le relevé d’identification bancaire - RIB.");
            }

            if (files.INCOME_PROOF) {
                await uploadFileObject(applicationId, "INCOME_PROOF", files.INCOME_PROOF);
            } else {
                console.log("Pré-onboarding : justificatif revenu déjà rattaché via pre_onboarding_session_id.");
            }

            if (files.RIB_DOCUMENT) {
                await uploadFileObject(applicationId, "RIB_DOCUMENT", files.RIB_DOCUMENT);
            } else {
                console.log("Pré-onboarding : RIB déjà rattaché via pre_onboarding_session_id.");
            }

            return {
                preloaded_income: incomePreloaded,
                preloaded_rib: ribPreloaded
            };
        };

        patched.__preOnboardingAcceptPatched = true;

        window.uploadManagerExtraDocuments = patched;

        try {
            uploadManagerExtraDocuments = patched;
        } catch (e) {}
    }

    function patchUploadPhoto() {
        if (typeof window.uploadPhoto !== "function") return;
        if (window.uploadPhoto.__preOnboardingAcceptPatched) return;

        const original = window.uploadPhoto;

        const patched = async function (applicationId, documentType, fileInputId) {
            const input = document.getElementById(fileInputId);
            const hasLocalFile = input && input.files && input.files.length > 0;

            if (!hasLocalFile && documentType === "PROOF_OF_ADDRESS_PHOTO" && hasAny(ADDRESS_TYPES)) {
                console.log("Pré-onboarding : justificatif de domicile déjà rattaché via pre_onboarding_session_id.");
                return { preloaded: true, document_type: "ADDRESS_PROOF" };
            }

            return original.apply(this, arguments);
        };

        patched.__preOnboardingAcceptPatched = true;

        window.uploadPhoto = patched;

        try {
            uploadPhoto = patched;
        } catch (e) {}
    }

    function patchAllUploads() {
        patchUploadSelfieDocument();
        patchUploadIdentityDocuments();
        patchUploadManagerExtraDocuments();
        patchUploadPhoto();
    }

    function applyVisualStatus() {
        markSelfieAsPreloaded();

        if (hasAny(ADDRESS_TYPES)) {
            const status = document.querySelector("#addressPhotoCaptureStatus, #addressCaptureStatus");
            if (status && !status.textContent.includes("préchargé")) {
                status.className = "capture-status success";
                status.innerText = "✅ Justificatif de domicile déjà préchargé depuis le pré-onboarding.";
            }
        }

        if (hasAny(INCOME_TYPES)) {
            const status = document.getElementById("incomeProofCaptureStatus");
            if (status && !status.textContent.includes("préchargé")) {
                status.className = "capture-status success";
                status.innerText = "✅ Justificatif de revenu déjà préchargé depuis le pré-onboarding.";
            }
        }

        if (hasAny(RIB_TYPES)) {
            const status = document.getElementById("ribDocumentCaptureStatus");
            if (status && !status.textContent.includes("préchargé")) {
                status.className = "capture-status success";
                status.innerText = "✅ RIB déjà préchargé depuis le pré-onboarding.";
            }
        }
    }

    async function refreshPreloadedDocuments() {
        const localLatest = loadFromLocalStorage();
        mergeLatest(localLatest);

        const serverLatest = await loadFromServer();
        mergeLatest(serverLatest);

        applyVisualStatus();
        patchAllUploads();

        return latest();
    }

    document.addEventListener("DOMContentLoaded", function () {
        refreshPreloadedDocuments();

        let tries = 0;
        const timer = setInterval(function () {
            refreshPreloadedDocuments();
            tries += 1;

            if (tries >= 12) {
                clearInterval(timer);
            }
        }, 700);
    });

    window.addEventListener("focus", refreshPreloadedDocuments);
})();

;/* ==== AFB_OCR_PRIORITY_OVER_DRAFT_V1 ====
   Le préremplissage OCR des documents a priorité sur le brouillon local :
   après les modules OCR V1/V2 (700/1400 ms) et la restauration du brouillon
   (immédiate), ce module force les valeurs OCR sur les champs d'identité.
   Si le brouillon contenait d'autres valeurs, une option « Utiliser les
   données du brouillon » est proposée pour les rétablir. */

document.addEventListener("DOMContentLoaded", function () {
    if (window.afbOcrPriorityOverDraftInstalled === true) return;
    window.afbOcrPriorityOverDraftInstalled = true;

    const OCR_KEY = "diaspora_pre_onboarding_ocr";

    function readJson(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null");
        } catch (e) {
            return null;
        }
    }

    function isEn() {
        return localStorage.getItem("diaspora_client_lang") === "en";
    }

    function normalizeDate(value) {
        const v = String(value || "").trim();
        const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return v;
    }

    function getField(key) {
        return document.querySelector(`[name="${key}"]`) || document.getElementById(key);
    }

    function setValue(el, value) {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.classList.add("ocr-prefilled-field");
    }

    function buildNotice(conflicts) {
        const form = document.getElementById("accountForm");
        if (!form || document.getElementById("ocrDraftChoiceNotice")) return;

        const notice = document.createElement("div");
        notice.id = "ocrDraftChoiceNotice";
        notice.style.cssText =
            "background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;" +
            "padding:12px 16px;margin:0 0 18px;display:flex;justify-content:space-between;" +
            "align-items:center;gap:12px;flex-wrap:wrap;font-size:14px;color:#1e3a8a;";

        const message = document.createElement("span");
        const button = document.createElement("button");
        button.type = "button";
        button.style.cssText =
            "background:none;border:1px solid #1d4ed8;color:#1d4ed8;border-radius:8px;" +
            "padding:6px 12px;cursor:pointer;font-weight:bold;";

        let usingOcr = true;

        function refreshLabels() {
            if (usingOcr) {
                message.textContent = isEn()
                    ? `OCR prefill from your documents was prioritized for ${conflicts.length} field(s) over your saved draft.`
                    : `Le préremplissage OCR de vos documents a été privilégié pour ${conflicts.length} champ(s) par rapport à votre brouillon.`;
                button.textContent = isEn() ? "Use my draft data" : "Utiliser les données du brouillon";
            } else {
                message.textContent = isEn()
                    ? "Your draft data was restored for those fields."
                    : "Les données de votre brouillon ont été rétablies pour ces champs.";
                button.textContent = isEn() ? "Reapply text extraction prefill" : "Réappliquer le préremplissage par extraction de texte";
            }
        }

        button.addEventListener("click", function () {
            conflicts.forEach(function (item) {
                const el = getField(item.key);
                if (!el) return;
                setValue(el, usingOcr ? item.draftValue : item.ocrValue);
                if (usingOcr) el.classList.remove("ocr-prefilled-field");
            });
            usingOcr = !usingOcr;
            refreshLabels();
        });

        refreshLabels();
        notice.appendChild(message);
        notice.appendChild(button);
        form.parentElement.insertBefore(notice, form);
    }

    function resolveSessionId() {
        try {
            const fromUrl = new URLSearchParams(window.location.search).get("pre_session");
            if (fromUrl) return fromUrl;
        } catch (e) {}

        const hidden = document.getElementById("pre_onboarding_session_id");
        if (hidden && hidden.value) return hidden.value;

        return localStorage.getItem("diaspora_pre_onboarding_session_id") || "";
    }

    // AFB_OCR_FIELDS_SERVER_PERSIST_V1 : si le localStorage ne contient rien
    // (autre appareil, cache vidé), on récupère les champs OCR conservés côté
    // serveur pour la session de pré-onboarding.
    async function fetchServerFields() {
        const sessionId = resolveSessionId();
        if (!sessionId) return {};

        try {
            const response = await fetch(
                "/api/pre-onboarding/session/" + encodeURIComponent(sessionId)
            );
            if (!response.ok) return {};
            const data = await response.json();
            return (data && data.extracted_fields) || {};
        } catch (e) {
            return {};
        }
    }

    async function run() {
        const store = readJson(OCR_KEY) || {};
        let prefill = store.prefill || store.extracted_fields || {};

        if (!prefill || Object.keys(prefill).length === 0) {
            prefill = await fetchServerFields();

            if (prefill && Object.keys(prefill).length > 0) {
                // Rendre ces champs visibles aux modules V1/V2 des prochains
                // chargements de page.
                try {
                    store.extracted_fields = prefill;
                    store.prefill = prefill;
                    localStorage.setItem(OCR_KEY, JSON.stringify(store));
                } catch (e) {}
            }
        }

        if (!prefill || Object.keys(prefill).length === 0) return;

        const sexValue = (function () {
            const v = String(prefill.sex || "").trim().toUpperCase();
            if (v === "M" || v.includes("MASCULIN") || v.includes("MALE")) return "Masculin";
            if (v === "F" || v.includes("FEMININ") || v.includes("FÉMININ") || v.includes("FEMALE")) return "Féminin";
            return "";
        })();

        // AFB_CNI_SIDE_AWARE_V1 : père/mère extraits du verso de la CNI.
        // Convention CNI camerounaise : le nom de famille est en tête.
        function splitParentName(full) {
            const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
            return {
                last: parts[0] || "",
                first: parts.slice(1).join(" ")
            };
        }

        const father = splitParentName(prefill.father_full_name);
        const mother = splitParentName(prefill.mother_full_name);

        const mapping = [
            ["last_name", prefill.last_name || prefill.surname, false],
            ["first_name", prefill.first_name || prefill.given_names, false],
            ["birth_date", prefill.birth_date, true],
            ["birth_place", prefill.place_of_birth || prefill.birth_place, false],
            [
                "identity_document_number",
                prefill.identity_document_number || prefill.cni_number || prefill.passport_number,
                false
            ],
            ["identity_document_issue_date", prefill.identity_issue_date, true],
            ["sex", sexValue, false],
            ["father_last_name_ui", father.last, false],
            ["father_first_name_ui", father.first, false],
            ["mother_last_name_ui", mother.last, false],
            ["mother_first_name_ui", mother.first, false]
        ];

        const conflicts = [];

        mapping.forEach(function (entry) {
            const key = entry[0];
            let value = entry[1];
            if (value === undefined || value === null || value === "") return;
            if (entry[2]) value = normalizeDate(value);
            value = String(value);

            const el = getField(key);
            if (!el) return;

            const current = String(el.value || "").trim();
            if (current === value) return;

            // La valeur en place vient du brouillon (restauré au chargement)
            // ou d'une saisie précédente : l'OCR a priorité, mais on garde la
            // valeur pour proposer le retour au brouillon.
            if (current) {
                conflicts.push({ key: key, draftValue: current, ocrValue: value });
            }

            setValue(el, value);
        });

        if (conflicts.length > 0) {
            buildNotice(conflicts);
        }
    }

    // Après la restauration du brouillon (0 ms) et les modules OCR (700/1400 ms).
    setTimeout(run, 2000);

    console.log("AFB_OCR_PRIORITY_OVER_DRAFT_V1 actif.");
});

;/* ==== AFB_DRAFT_RESUME_V1 — brouillon serveur ==== */

/* Sauvegarde automatique du formulaire dans un brouillon serveur (après
   pré-inscription validée : le serveur refuse sinon), et préremplissage au
   retour d'une reprise de dossier (?resume_draft=...). */
(function () {
    var SAVE_DEBOUNCE_MS = 1800;
    var SAVE_MAX_LATENCY_MS = 5000;
    var saveTimer = null;
    var maxTimer = null;

    function draftSessionId() {
        var hidden = document.getElementById("pre_onboarding_session_id");
        var fromHidden = hidden && hidden.value ? String(hidden.value).trim() : "";
        if (fromHidden) return fromHidden;
        try {
            return localStorage.getItem("diaspora_pre_onboarding_session_id") || "";
        } catch (e) {
            return "";
        }
    }

    function collectFields() {
        var form = document.getElementById("accountForm");
        if (!form) return null;

        var fields = {};
        form.querySelectorAll("input[name], select[name], textarea[name]").forEach(function (input) {
            var name = input.name;
            if (!name || input.type === "file" || input.type === "password") return;

            if (input.type === "checkbox" || input.type === "radio") {
                if (input.checked) fields[name] = input.value || "on";
                return;
            }

            var value = String(input.value || "");
            if (value !== "") fields[name] = value;
        });
        return fields;
    }

    function saveDraft() {
        var sid = draftSessionId();
        if (!sid) return;

        var fields = collectFields();
        if (!fields || !Object.keys(fields).length) return;

        try {
            fetch("/api/pre-onboarding/draft/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sid,
                    account_type: localStorage.getItem("diaspora_account_type") || "PERSONAL",
                    fields: fields
                })
            }).catch(function () {});
        } catch (e) {}
    }

    function runSave() {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
        saveDraft();
    }

    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(runSave, SAVE_DEBOUNCE_MS);

        // Garantie de latence : certains modules de la page émettent des événements
        // input en continu et réarmeraient le debounce indéfiniment.
        if (!maxTimer) {
            maxTimer = setTimeout(runSave, SAVE_MAX_LATENCY_MS);
        }
    }

    function bindAutosave() {
        var form = document.getElementById("accountForm");
        if (!form || form.dataset.draftAutosave === "1") return;
        form.dataset.draftAutosave = "1";

        form.addEventListener("input", scheduleSave, true);
        form.addEventListener("change", scheduleSave, true);
        window.addEventListener("beforeunload", saveDraft);
    }

    function applyDraftFields(fields) {
        var form = document.getElementById("accountForm");
        if (!form || !fields) return 0;

        var filled = 0;

        Object.keys(fields).forEach(function (name) {
            var value = String(fields[name]);
            var selector = '[name="' + name.replace(/"/g, '\\"') + '"]';
            var inputs = form.querySelectorAll(selector);
            if (!inputs.length) return;

            var first = inputs[0];

            if (first.type === "radio") {
                inputs.forEach(function (radio) {
                    if (String(radio.value) === value && !radio.checked) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event("change", { bubbles: true }));
                        filled++;
                    }
                });
                return;
            }

            if (first.type === "checkbox") {
                if (!first.checked) {
                    first.checked = true;
                    first.dispatchEvent(new Event("change", { bubbles: true }));
                    filled++;
                }
                return;
            }

            if (first.type === "file") return;

            // On ne remplace jamais une saisie déjà présente (OCR ou client).
            if (String(first.value || "") === "") {
                first.value = value;
                first.dispatchEvent(new Event("input", { bubbles: true }));
                first.dispatchEvent(new Event("change", { bubbles: true }));
                filled++;
            }
        });

        return filled;
    }

    function prefillFromDraft() {
        var params = new URLSearchParams(window.location.search);
        var draftId = params.get("resume_draft");
        if (!draftId) return;

        fetch("/api/pre-onboarding/draft/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draft_id: draftId })
        }).then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok || !data.ok) return;

                var hidden = document.getElementById("pre_onboarding_session_id");
                if (hidden && !hidden.value) hidden.value = data.session_id;

                // Trois passes : certains selects (agences, secteurs, pays) se
                // peuplent en asynchrone après le chargement de la page.
                var run = function () { return applyDraftFields(data.fields); };
                var firstPass = run();
                setTimeout(run, 1800);
                setTimeout(run, 4200);
                console.log("[DRAFT] reprise de dossier :", firstPass, "champ(s) préremplis (1re passe).");
            });
        }).catch(function () {});
    }

    function init() {
        bindAutosave();
        prefillFromDraft();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    setTimeout(bindAutosave, 1500);
})();
