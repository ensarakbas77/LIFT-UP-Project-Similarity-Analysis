/**
 * LIFT UP — Proje Benzerlik Analizi Frontend
 * ══════════════════════════════════════════════
 * API ve DOM Yönetimi — Vanilla JavaScript (Fetch API)
 *
 * Akış:
 *   1. Form validasyonu
 *   2. POST /analyze isteği
 *   3. Yanıtı parse edip kart yapısında render
 *   4. Sınıflandırma banner gösterimi
 */

// ─── Configuration ─────────────────────────────────────────────
const API_BASE_URL = "http://localhost:8000";
const ENDPOINTS = {
    analyze: `${API_BASE_URL}/analyze`,
    health: `${API_BASE_URL}/health`,
    suggestKeywords: `${API_BASE_URL}/suggest-keywords`,
};

// AI Önerisi davranış sabitleri
const AI_SUGGEST = {
    minAbstractLength: 50,   // Bu eşiğin altında özet varsa buton gizli
    cooldownMs: 8000,        // Tıklamalar arası soğuma süresi (RPM korumasi)
};

// ─── DOM Elements ──────────────────────────────────────────────
const DOM = {
    // Form
    form: document.getElementById("analyze-form"),
    titleInput: document.getElementById("project-title"),
    abstractInput: document.getElementById("project-abstract"),
    keywordsInput: document.getElementById("project-keywords"),
    topkInput: document.getElementById("project-topk"),
    submitBtn: document.getElementById("submit-btn"),
    submitContent: document.getElementById("submit-content"),
    submitLoading: document.getElementById("submit-loading"),

    // Counters
    titleCount: document.getElementById("title-count"),
    abstractCount: document.getElementById("abstract-count"),
    keywordsCount: document.getElementById("keywords-count"),

    // Errors
    titleError: document.getElementById("title-error"),
    abstractError: document.getElementById("abstract-error"),
    keywordsError: document.getElementById("keywords-error"),
    topkError: document.getElementById("topk-error"),

    // Sections
    formSection: document.getElementById("content-section"),
    heroSection: document.getElementById("content-section"),
    resultsSection: document.getElementById("results-section"),
    errorSection: document.getElementById("error-section"),

    // Results
    querySummary: document.getElementById("query-summary"),
    queryTitle: document.getElementById("query-title"),
    queryAbstract: document.getElementById("query-abstract"),
    queryKeywords: document.getElementById("query-keywords"),
    resultsCards: document.getElementById("results-cards"),
    resultsCount: document.getElementById("results-count"),

    // Error
    errorTitle: document.getElementById("error-title"),
    errorMessage: document.getElementById("error-message"),

    // Actions
    btnNewAnalysis: document.getElementById("btn-new-analysis"),
    btnRetry: document.getElementById("btn-retry"),

    // Status
    statusDot: document.getElementById("status-dot"),
    statusLabel: document.getElementById("status-label"),

    // AI keyword suggestion
    aiSuggestBtn: document.getElementById("ai-suggest-btn"),
    aiSuggestContent: document.getElementById("ai-suggest-content"),
    aiSuggestLoading: document.getElementById("ai-suggest-loading"),
    aiSuggestMsg: document.getElementById("ai-suggest-msg"),

    // Results toolbar
    resultsToolbar: document.getElementById("results-toolbar"),
    resultsTopkInput: document.getElementById("results-topk"),
    resultsTopkBtn: document.getElementById("results-topk-btn"),
    resultsTopkBtnContent: document.getElementById("results-topk-btn-content"),
    resultsTopkBtnLoading: document.getElementById("results-topk-btn-loading"),
    resultsYear: document.getElementById("results-year"),
    sortDescBtn: document.getElementById("sort-desc"),
    sortAscBtn: document.getElementById("sort-asc"),
};

// ─── Results Toolbar State ─────────────────────────────────────
// Sonuç ekranındaki filtre/sıralama state'i. Yeni analiz veya
// top-k güncellemesi sonrası rawResults yeniden doldurulur; yıl
// filtresi ve sort her render'da yeniden uygulanır.
let lastQueryPayload = null;   // {title, abstract, keywords} — top-k re-fetch için
let lastTopK = 5;              // Son kullanılan top_k
let rawResults = [];           // Backend'den gelen ham sonuç listesi
let currentSort = "desc";      // "desc" | "asc"
let currentYearFilter = "";    // "" = tümü

// ─── Classification Config (5 Seviye) ─────────────────────────
const CLASSIFICATION = {
    critical: {
        icon: "🔴",
        title: "Çok Yüksek Benzerlik — Potansiyel Mükerrer Kayıt",
        description: "Projenin özgünlüğü ciddi risk altındadır. Manuel teknik inceleme zorunludur.",
        className: "critical",
        label: "Çok Yüksek Benzerlik",
        labelShort: "Kritik",
    },
    high: {
        icon: "🟠",
        title: "Yüksek Benzerlik — Yakın Tematik Bağlantı",
        description: "Aynı alt uzmanlık alanında ve benzer metodolojide çalışma. İnceleme önerilir.",
        className: "high",
        label: "Yüksek Benzerlik",
        labelShort: "Yüksek",
    },
    medium: {
        icon: "🟡",
        title: "Orta Düzey Benzerlik — Disiplin Paralelliği",
        description: "Aynı ana disiplin (Havacılık, Yazılım vb.) fakat farklı problem odakları.",
        className: "medium",
        label: "Orta Benzerlik",
        labelShort: "Orta",
    },
    low: {
        icon: "🟢",
        title: "Düşük Benzerlik — Uzak Tematik İlişki",
        description: "Sadece yüzeysel kavramsal benzerlikler veya genel mühendislik terimleri.",
        className: "low",
        label: "Düşük Benzerlik",
        labelShort: "Düşük",
    },
    irrelevant: {
        icon: "⚪",
        title: "Alakasız — İlişki Yok",
        description: "Farklı disiplinler veya bağlamsal olarak tamamen ayrı içerikler.",
        className: "irrelevant",
        label: "Alakasız",
        labelShort: "Alakasız",
    },
};

// ─── Validation Rules ─────────────────────────────────────────
const VALIDATION = {
    title: {
        minLength: 3,
        maxLength: 500,
        messages: {
            required: "Proje başlığı zorunludur.",
            minLength: "Başlık en az 3 karakter olmalıdır.",
            maxLength: "Başlık en fazla 500 karakter olabilir.",
        },
    },
    abstract: {
        minLength: 10,
        maxLength: 5000,
        messages: {
            required: "Proje özeti zorunludur.",
            minLength: "Özet en az 10 karakter olmalıdır.",
            maxLength: "Özet en fazla 5000 karakter olabilir.",
        },
    },
    keywords: {
        minLength: 3,
        maxLength: 1000,
        messages: {
            required: "Anahtar kelimeler zorunludur.",
            minLength: "Anahtar kelimeler en az 3 karakter olmalıdır.",
            maxLength: "Anahtar kelimeler en fazla 1000 karakter olabilir.",
        },
    },
};


// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("home-view");
    initCharCounters();
    initFormListeners();
    initActionButtons();
    initAiSuggest();
    initResultsToolbar();
    checkSystemHealth();
});


// ═══════════════════════════════════════════════════════════════
// CHARACTER COUNTERS
// ═══════════════════════════════════════════════════════════════

function initCharCounters() {
    // Title counter
    DOM.titleInput.addEventListener("input", () => {
        DOM.titleCount.textContent = DOM.titleInput.value.length;
        clearFieldError("title");
    });

    // Abstract counter
    DOM.abstractInput.addEventListener("input", () => {
        DOM.abstractCount.textContent = DOM.abstractInput.value.length;
        clearFieldError("abstract");
        updateAiSuggestVisibility();
    });

    // Keywords counter
    DOM.keywordsInput.addEventListener("input", () => {
        DOM.keywordsCount.textContent = DOM.keywordsInput.value.length;
        clearFieldError("keywords");
    });
}


// ═══════════════════════════════════════════════════════════════
// FORM VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Tek bir alanı doğrular.
 * @param {string} fieldName - Alan adı: "title" | "abstract" | "keywords"
 * @param {string} value - Alan değeri
 * @returns {string|null} Hata mesajı veya null
 */
function validateField(fieldName, value) {
    const rules = VALIDATION[fieldName];
    const trimmed = value.trim();

    if (!trimmed) {
        return rules.messages.required;
    }
    if (trimmed.length < rules.minLength) {
        return rules.messages.minLength;
    }
    if (trimmed.length > rules.maxLength) {
        return rules.messages.maxLength;
    }
    return null;
}

/**
 * Tüm form alanlarını doğrular.
 * @returns {boolean} Geçerli mi?
 */
function validateForm() {
    const fields = [
        { name: "title", value: DOM.titleInput.value },
        { name: "abstract", value: DOM.abstractInput.value },
        { name: "keywords", value: DOM.keywordsInput.value },
    ];

    let isValid = true;

    fields.forEach(({ name, value }) => {
        const error = validateField(name, value);
        if (error) {
            showFieldError(name, error);
            isValid = false;
        } else {
            clearFieldError(name);
        }
    });

    return isValid;
}

/**
 * Alan hata mesajını gösterir ve input'a error class ekler.
 */
function showFieldError(fieldName, message) {
    const errorEl = DOM[`${fieldName}Error`];
    const inputEl = DOM[`${fieldName}Input`];

    errorEl.textContent = message;
    errorEl.classList.add("visible");
    inputEl.classList.add("error");
}

/**
 * Alan hata mesajını ve error class'ını temizler.
 */
function clearFieldError(fieldName) {
    const errorEl = DOM[`${fieldName}Error`];
    const inputEl = DOM[`${fieldName}Input`];

    errorEl.textContent = "";
    errorEl.classList.remove("visible");
    inputEl.classList.remove("error");
}


// ═══════════════════════════════════════════════════════════════
// FORM SUBMISSION
// ═══════════════════════════════════════════════════════════════

function initFormListeners() {
    DOM.form.addEventListener("submit", handleSubmit);
}

/**
 * Form submit handler.
 */
async function handleSubmit(e) {
    e.preventDefault();

    // Validate
    if (!validateForm()) {
        // Scroll to first error
        const firstError = DOM.form.querySelector(".form__input.error, .form__textarea.error");
        if (firstError) {
            firstError.focus();
        }
        return;
    }

    // Start loading
    setLoadingState(true);

    try {
        const topK = parseInt(DOM.topkInput.value, 10) || 5;
        const payload = {
            title: DOM.titleInput.value.trim(),
            abstract: DOM.abstractInput.value.trim(),
            keywords: DOM.keywordsInput.value.trim(),
            top_k: topK,
        };

        // Top-K re-fetch için kullanılacak — sadece sorgu içeriği saklanır
        lastQueryPayload = {
            title: payload.title,
            abstract: payload.abstract,
            keywords: payload.keywords,
        };
        lastTopK = topK;

        const response = await fetch(ENDPOINTS.analyze, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const detail = errorData?.detail || `HTTP ${response.status}: Sunucu hatası`;
            throw new Error(detail);
        }

        const data = await response.json();
        renderResults(data, { resetToolbar: true });
    } catch (error) {
        showError(error);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Yükleniyor durumunu kontrol eder.
 */
function setLoadingState(isLoading) {
    DOM.submitBtn.disabled = isLoading;
    DOM.submitBtn.classList.toggle("loading", isLoading);

    // Disable inputs during loading
    DOM.titleInput.disabled = isLoading;
    DOM.abstractInput.disabled = isLoading;
    DOM.keywordsInput.disabled = isLoading;
    DOM.topkInput.disabled = isLoading;

    // AI öneri butonu da analiz sırasında devre dışı
    if (DOM.aiSuggestBtn && !DOM.aiSuggestBtn.hidden) {
        DOM.aiSuggestBtn.disabled = isLoading || performance.now() < aiCooldownUntil;
    }
}


// ═══════════════════════════════════════════════════════════════
// RESULTS RENDERING
// ═══════════════════════════════════════════════════════════════

/**
 * API yanıtını parse edip DOM'a render eder.
 * @param {Object} data - AnalyzeResponse nesnesi
 * @param {Object} [opts]
 * @param {boolean} [opts.resetToolbar=false] - Yıl filtresi/sıralama varsayılana dönsün mü
 */
function renderResults(data, opts = {}) {
    const { similar_projects } = data;
    const { resetToolbar = false } = opts;

    // Hide form & hero, show results
    document.body.classList.remove("home-view");
    DOM.heroSection.style.display = "none";
    DOM.formSection.style.display = "none";
    DOM.errorSection.style.display = "none";
    DOM.resultsSection.style.display = "block";

    // Render query summary (user's input)
    renderQuerySummary();

    // Toolbar state senkronizasyonu
    rawResults = Array.isArray(similar_projects) ? similar_projects : [];
    syncToolbarAfterFetch({ resetToolbar });

    // Filtre + sort uygulanmış halini render et
    applyAndRenderFiltered();

    // Smooth scroll to results
    DOM.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Kullanıcının girdiği sorgu bilgilerini sonuç sayfasının üstünde gösterir.
 */
function renderQuerySummary() {
    DOM.queryTitle.textContent = DOM.titleInput.value.trim();
    DOM.queryAbstract.textContent = DOM.abstractInput.value.trim();
    DOM.queryKeywords.textContent = DOM.keywordsInput.value.trim();
}

/**
 * Proje kartlarını döngü ile oluşturur.
 * @param {Array} projects - SimilarProject listesi
 */
function renderProjectCards(projects) {
    DOM.resultsCards.innerHTML = "";

    if (!projects || projects.length === 0) {
        DOM.resultsCards.innerHTML = `
            <div class="results__empty">
                <p>Benzer proje bulunamadı.</p>
            </div>
        `;
        return;
    }

    projects.forEach((project, index) => {
        const card = createProjectCard(project, index);
        DOM.resultsCards.appendChild(card);
    });
}

/**
 * Tek bir proje kartı HTML element'i oluşturur.
 * @param {Object} project - SimilarProject nesnesi
 * @param {number} index - Sıra numarası (0-based)
 * @returns {HTMLElement}
 */
function createProjectCard(project, index) {
    const { title, abstract, similarity, year, classification, emrecan_similarity } = project;
    const percentage = Math.round(similarity * 100);
    const level = classification || getLevel(similarity);
    const classConfig = CLASSIFICATION[level] || CLASSIFICATION.irrelevant;
    const cardId = `project-card-${index}`;
    const abstractId = `abstract-${index}`;
    const toggleId = `toggle-${index}`;

    const emrecanPct    = emrecan_similarity != null ? Math.round(emrecan_similarity * 100) : null;
    const emrecanLevel  = emrecan_similarity != null ? getLevel(emrecan_similarity) : null;
    const emrecanConfig = emrecanLevel ? CLASSIFICATION[emrecanLevel] : null;

    const card = document.createElement("div");
    card.className = `project-card ${level}`;
    card.id = cardId;
    card.style.animationDelay = `${index * 0.06}s`;

    card.innerHTML = `
        <div class="project-card__header">
            <span class="project-card__rank">${index + 1}</span>
            <h4 class="project-card__title">${escapeHtml(title)}</h4>
            <span class="project-card__score-badge ${level}">
                %${percentage}
            </span>
        </div>

        <div class="project-card__level-badge ${level}">
            <span class="project-card__level-icon">${classConfig.icon}</span>
            <span class="project-card__level-text">${classConfig.label}</span>
        </div>

        ${abstract ? `
            <p class="project-card__abstract" id="${abstractId}">${escapeHtml(abstract)}</p>
            <button type="button" class="project-card__toggle" id="${toggleId}" data-target="${abstractId}">
                Devamını oku
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </button>
        ` : ""}

        <div class="project-card__footer">
            <div class="project-card__meta">
                ${year ? `<span class="project-card__year">📅 ${year}</span>` : ""}
                ${emrecanConfig ? `<span class="project-card__emrecan-badge ${emrecanLevel}">${emrecanConfig.icon} Diğer modelin analiz sonucu: %${emrecanPct} (${emrecanConfig.label})</span>` : ""}
            </div>
            <div class="project-card__similarity-bar">
                <div class="project-card__similarity-fill ${level}" style="width: 0%;" data-width="${percentage}%"></div>
            </div>
        </div>
    `;

    // Toggle event
    const toggleBtn = card.querySelector(`#${toggleId}`);
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const abstractEl = card.querySelector(`#${abstractId}`);
            const isExpanded = abstractEl.classList.toggle("expanded");
            toggleBtn.classList.toggle("expanded", isExpanded);
            // Update text based on state
            const textNode = toggleBtn.childNodes[0];
            if (textNode) {
                textNode.textContent = isExpanded ? "Daha az göster " : "Devamını oku ";
            }
        });
    }

    // Animate similarity bar after render
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const fillBar = card.querySelector(".project-card__similarity-fill");
            if (fillBar) {
                fillBar.style.width = fillBar.dataset.width;
            }
        });
    });

    return card;
}

/**
 * Benzerlik skoruna göre seviye döndürür (fallback — backend classification yoksa).
 * @param {number} score - 0-1 arası similarity skoru
 * @returns {string} "critical" | "high" | "medium" | "low" | "irrelevant"
 */
function getLevel(score) {
    if (score >= 0.90) return "critical";
    if (score >= 0.70) return "high";
    if (score >= 0.50) return "medium";
    if (score >= 0.25) return "low";
    return "irrelevant";
}


// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

/**
 * Hata bölümünü gösterir.
 * @param {Error} error
 */
function showError(error) {
    document.body.classList.remove("home-view");
    DOM.heroSection.style.display = "none";
    DOM.formSection.style.display = "none";
    DOM.resultsSection.style.display = "none";
    DOM.errorSection.style.display = "block";

    let title = "Bir Hata Oluştu";
    let message = error.message || "Beklenmeyen bir hata oluştu.";

    // Network error detection
    if (error instanceof TypeError && error.message.includes("fetch")) {
        title = "Bağlantı Hatası";
        message = "Backend sunucusuna ulaşılamıyor. Lütfen sunucunun çalıştığından emin olun.";
    }

    DOM.errorTitle.textContent = title;
    DOM.errorMessage.textContent = message;

    DOM.errorSection.scrollIntoView({ behavior: "smooth", block: "start" });
}


// ═══════════════════════════════════════════════════════════════
// RESULTS TOOLBAR (Top-K re-fetch + Year Filter + Sort)
// ═══════════════════════════════════════════════════════════════

function initResultsToolbar() {
    // Top-K Güncelle butonu
    DOM.resultsTopkBtn.addEventListener("click", handleTopkUpdate);
    DOM.resultsTopkInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleTopkUpdate();
        }
    });

    // Yıl filtresi
    DOM.resultsYear.addEventListener("change", () => {
        currentYearFilter = DOM.resultsYear.value;
        DOM.resultsYear.classList.toggle("active", !!currentYearFilter);
        applyAndRenderFiltered();
    });

    // Sıralama butonları
    DOM.sortDescBtn.addEventListener("click", () => setSortOrder("desc"));
    DOM.sortAscBtn.addEventListener("click", () => setSortOrder("asc"));
}

function setSortOrder(order) {
    if (order === currentSort) return;
    currentSort = order;
    DOM.sortDescBtn.classList.toggle("active", order === "desc");
    DOM.sortAscBtn.classList.toggle("active", order === "asc");
    DOM.sortDescBtn.setAttribute("aria-pressed", order === "desc");
    DOM.sortAscBtn.setAttribute("aria-pressed", order === "asc");
    applyAndRenderFiltered();
}

/**
 * Yeni fetch sonrası toolbar UI'sını günceller. resetToolbar true ise
 * yıl filtresi ve sıralama varsayılana döner; aksi halde mevcut seçimler
 * korunur (ör. top-k güncellendiğinde).
 */
function syncToolbarAfterFetch({ resetToolbar }) {
    DOM.resultsTopkInput.value = "";
    DOM.resultsTopkInput.placeholder = String(lastTopK);

    if (resetToolbar) {
        currentSort = "desc";
        currentYearFilter = "";
        DOM.sortDescBtn.classList.add("active");
        DOM.sortAscBtn.classList.remove("active");
        DOM.sortDescBtn.setAttribute("aria-pressed", "true");
        DOM.sortAscBtn.setAttribute("aria-pressed", "false");
    }

    populateYearFilter();
}

function populateYearFilter() {
    const years = [...new Set(rawResults.map(p => p.year).filter(Boolean))]
        .sort()
        .reverse();

    const previousValue = currentYearFilter;
    DOM.resultsYear.innerHTML = '<option value="">Tüm Yıllar</option>' +
        years.map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join("");

    // Önceki seçim hâlâ geçerliyse koru
    if (previousValue && years.includes(previousValue)) {
        DOM.resultsYear.value = previousValue;
        DOM.resultsYear.classList.add("active");
    } else {
        currentYearFilter = "";
        DOM.resultsYear.value = "";
        DOM.resultsYear.classList.remove("active");
    }
}

/**
 * rawResults'a yıl filtresi ve sıralama uygulayıp render eder.
 */
function applyAndRenderFiltered() {
    let list = rawResults;

    if (currentYearFilter) {
        list = list.filter(p => p.year === currentYearFilter);
    }

    // Backend desc sıralı geliyor; asc istenirse ters çevir
    if (currentSort === "asc") {
        list = [...list].reverse();
    }

    renderProjectCards(list);

    const total = rawResults.length;
    const shown = list.length;
    DOM.resultsCount.textContent = (shown === total)
        ? `${total} proje bulundu`
        : `${shown} / ${total} proje gösteriliyor`;
}

/**
 * Mevcut sorguyu yeni top_k ile yeniden çalıştırır.
 */
async function handleTopkUpdate() {
    if (!lastQueryPayload) return;

    const newTopK = parseInt(DOM.resultsTopkInput.value, 10);
    if (!Number.isFinite(newTopK) || newTopK < 1 || newTopK > 50) {
        DOM.resultsTopkInput.focus();
        DOM.resultsTopkInput.select();
        return;
    }

    if (newTopK === lastTopK && rawResults.length > 0) return;

    setTopkLoading(true);

    try {
        const payload = { ...lastQueryPayload, top_k: newTopK };

        const response = await fetch(ENDPOINTS.analyze, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const detail = errorData?.detail || `HTTP ${response.status}: Sunucu hatası`;
            throw new Error(detail);
        }

        const data = await response.json();
        lastTopK = newTopK;
        // Mevcut yıl/sort tercihlerini koru
        renderResults(data, { resetToolbar: false });
    } catch (error) {
        showError(error);
    } finally {
        setTopkLoading(false);
    }
}

function setTopkLoading(isLoading) {
    DOM.resultsTopkBtn.disabled = isLoading;
    DOM.resultsTopkInput.disabled = isLoading;
    DOM.resultsTopkBtnContent.hidden = isLoading;
    DOM.resultsTopkBtnLoading.hidden = !isLoading;
}


// ═══════════════════════════════════════════════════════════════
// ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════

function initActionButtons() {
    // "Yeni Analiz" button
    DOM.btnNewAnalysis.addEventListener("click", () => window.location.reload());

    // "Tekrar Dene" button
    DOM.btnRetry.addEventListener("click", resetToForm);
}

/**
 * Formu sıfırlayıp ana sayfaya döner.
 */
function resetToForm() {
    // Reset form
    DOM.form.reset();
    DOM.titleCount.textContent = "0";
    DOM.abstractCount.textContent = "0";
    DOM.keywordsCount.textContent = "0";
    DOM.topkInput.value = "5";

    // Clear errors
    clearFieldError("title");
    clearFieldError("abstract");
    clearFieldError("keywords");

    // Clear results
    DOM.resultsCards.innerHTML = "";

    // Show form, hide others
    document.body.classList.add("home-view");
    DOM.heroSection.style.display = "block";
    DOM.formSection.style.display = "block";
    DOM.resultsSection.style.display = "none";
    DOM.errorSection.style.display = "none";

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Focus title input
    setTimeout(() => DOM.titleInput.focus(), 300);
}


// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Backend sağlık durumunu kontrol eder.
 */
async function checkSystemHealth() {
    try {
        const response = await fetch(ENDPOINTS.health, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) throw new Error("Health check failed");

        const data = await response.json();

        if (data.status === "healthy") {
            DOM.statusDot.className = "status-dot online";
            DOM.statusLabel.textContent = "Sistem hazır";
        } else {
            DOM.statusDot.className = "status-dot offline";
            DOM.statusLabel.textContent = "Sistem kısıtlı";
        }
    } catch {
        DOM.statusDot.className = "status-dot offline";
        DOM.statusLabel.textContent = "Bağlantı yok";
    }
}


// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * XSS koruması için HTML entity escape.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


// ═══════════════════════════════════════════════════════════════
// AI KEYWORD SUGGESTION (Gemini)
// ═══════════════════════════════════════════════════════════════

let aiCooldownUntil = 0;       // performance.now() ms — bu ana kadar devre dışı
let aiCooldownTimer = null;    // Cooldown geri sayım timer'ı

function initAiSuggest() {
    if (!DOM.aiSuggestBtn) return;
    DOM.aiSuggestBtn.addEventListener("click", handleAiSuggest);
    updateAiSuggestVisibility();
}

/**
 * Özet uzunluğuna göre butonu gösterip gizler.
 * Eşik altındaysa hem butonu hem önceki mesajı temizler.
 */
function updateAiSuggestVisibility() {
    if (!DOM.aiSuggestBtn) return;
    const len = DOM.abstractInput.value.trim().length;
    const shouldShow = len >= AI_SUGGEST.minAbstractLength;

    DOM.aiSuggestBtn.hidden = !shouldShow;
    if (!shouldShow) {
        hideAiMsg();
    }
}

async function handleAiSuggest() {
    const abstract = DOM.abstractInput.value.trim();

    if (abstract.length < AI_SUGGEST.minAbstractLength) {
        showAiMsg("info", `Özet en az ${AI_SUGGEST.minAbstractLength} karakter olmalı.`);
        return;
    }

    // Cooldown kontrolü (frontend tarafı)
    const now = performance.now();
    if (now < aiCooldownUntil) {
        const remaining = Math.ceil((aiCooldownUntil - now) / 1000);
        showAiMsg("info", `Lütfen ${remaining} saniye bekleyin.`);
        return;
    }

    setAiLoading(true);
    hideAiMsg();

    try {
        const response = await fetch(ENDPOINTS.suggestKeywords, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ abstract }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const detail = data?.detail || `HTTP ${response.status}`;
            const msg = mapAiErrorMessage(response.status, detail);
            showAiMsg("error", msg);
            return;
        }

        const keywords = Array.isArray(data?.keywords) ? data.keywords : [];
        if (keywords.length === 0) {
            showAiMsg("error", "AI servisi anahtar kelime üretemedi.");
            return;
        }

        const joined = keywords.join(", ");
        DOM.keywordsInput.value = joined;
        DOM.keywordsCount.textContent = joined.length;
        clearFieldError("keywords");
        showAiMsg("success", `${keywords.length} anahtar kelime önerildi. Düzenleyebilirsiniz.`);

    } catch (err) {
        showAiMsg("error", "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
        setAiLoading(false);
        startAiCooldown(AI_SUGGEST.cooldownMs);
    }
}

/**
 * HTTP status koduna göre kullanıcı dostu mesaj döndürür.
 */
function mapAiErrorMessage(status, detail) {
    if (status === 429) {
        return detail || "Şu an yoğunluk var ya da limitimize ulaştık. Lütfen daha sonra tekrar deneyin.";
    }
    if (status === 503) {
        return "AI servisi şu an meşgul. Lütfen biraz sonra tekrar deneyin.";
    }
    if (status === 502) {
        return "AI servisinden geçersiz yanıt geldi. Lütfen tekrar deneyin.";
    }
    if (status === 500) {
        return detail || "AI servisi şu an kullanılamıyor.";
    }
    return detail || "Öneri alınamadı.";
}

function setAiLoading(loading) {
    DOM.aiSuggestBtn.disabled = loading;
    DOM.aiSuggestContent.hidden = loading;
    DOM.aiSuggestLoading.hidden = !loading;
}

function startAiCooldown(ms) {
    aiCooldownUntil = performance.now() + ms;

    if (aiCooldownTimer) clearInterval(aiCooldownTimer);
    DOM.aiSuggestBtn.disabled = true;

    const tick = () => {
        const remainingMs = aiCooldownUntil - performance.now();
        if (remainingMs <= 0) {
            clearInterval(aiCooldownTimer);
            aiCooldownTimer = null;
            DOM.aiSuggestBtn.disabled = false;
            DOM.aiSuggestContent.innerHTML =
                '<svg class="ai-suggest-btn__icon" width="14" height="14" viewBox="0 0 24 24" ' +
                'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                'stroke-linejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/>' +
                '<path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z"/></svg>AI Önerisi';
            return;
        }
        const sec = Math.ceil(remainingMs / 1000);
        DOM.aiSuggestContent.textContent = `${sec}s bekle`;
    };
    tick();
    aiCooldownTimer = setInterval(tick, 250);
}

function showAiMsg(type, text) {
    if (!DOM.aiSuggestMsg) return;
    DOM.aiSuggestMsg.textContent = text;
    DOM.aiSuggestMsg.className = `ai-suggest-msg ${type}`;
    DOM.aiSuggestMsg.hidden = false;
}

function hideAiMsg() {
    if (!DOM.aiSuggestMsg) return;
    DOM.aiSuggestMsg.hidden = true;
    DOM.aiSuggestMsg.textContent = "";
    DOM.aiSuggestMsg.className = "ai-suggest-msg";
}
