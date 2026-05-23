// ============================================
// LIFT UP Admin Panel — Frontend Logic
// FastAPI backend (/admin/* endpoint'leri) ile çalışır
// ============================================

// ─── Konfigürasyon ────────────────────────────────────────────────────────────
// Relative URL kullanıyoruz — 127.0.0.1 vs localhost CORS sorununu önler
const API_BASE = '';
const POLL_INTERVAL_MS = 2000; // İş durumu sorgulama aralığı

// ─── Global State ─────────────────────────────────────────────────────────────
let selectedFile = null;
let currentJobId = null;
let currentFilename = null;
let pollTimer = null;

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const uploadArea = document.getElementById('uploadArea');
const pdfFileInput = document.getElementById('pdfFile');
const uploadContent = document.getElementById('uploadContent');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const uploadForm = document.getElementById('uploadForm');
const submitBtn = document.getElementById('submitBtn');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const resultMessage = document.getElementById('resultMessage');
const downloadBtn = document.getElementById('downloadBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const analysisSection = document.getElementById('analysisSection');
const downloadBtnFromAnalysis = document.getElementById('downloadBtnFromAnalysis');
const closeAnalysisBtn = document.getElementById('closeAnalysisBtn');

// ─── Year input: clear invalid state on input ─────────────────────────────────
document.getElementById('year').addEventListener('input', function () {
    this.classList.remove('is-invalid');
});

// ─── Auth Guard ───────────────────────────────────────────────────────────────
(function checkAuth() {
    const token = localStorage.getItem('lift_admin_token');
    if (!token) {
        window.location.replace('/');
    }
})();

// ─── API Headers ──────────────────────────────────────────────────────────────
function getAdminHeaders() {
    const token = localStorage.getItem('lift_admin_token');
    if (!token) {
        window.location.replace('/');
        return {};
    }
    return { 'Authorization': `Bearer ${token}` };
}

// ============================================
// FILE UPLOAD HANDLERS
// ============================================

uploadArea.addEventListener('click', () => pdfFileInput.click());

pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf') {
            pdfFileInput.files = e.dataTransfer.files;
            handleFileSelect(file);
        } else {
            showError('Lütfen sadece PDF dosyası yükleyin!');
        }
    }
});

removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileUpload();
});

// ============================================
// FILE HANDLING FUNCTIONS
// ============================================

function handleFileSelect(file) {
    if (!file || file.type !== 'application/pdf') {
        showError('Lütfen geçerli bir PDF dosyası seçin!');
        return;
    }
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('Dosya boyutu çok büyük! Maksimum 200MB yükleyebilirsiniz.');
        return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    uploadContent.classList.add('d-none');
    fileInfo.classList.remove('d-none');
    fileInfo.style.animation = 'fadeIn 0.5s ease';
}

function resetFileUpload() {
    selectedFile = null;
    pdfFileInput.value = '';
    uploadContent.classList.remove('d-none');
    fileInfo.classList.add('d-none');
    hideAllSections();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// FORM SUBMISSION — POST /admin/extract
// ============================================

const YEAR_RE = /^\d{4}-\d{4}$/;

function validateYear(value) {
    if (!YEAR_RE.test(value)) return false;
    const [a, b] = value.split('-').map(Number);
    return b === a + 1;
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) {
        showError('Lütfen bir PDF dosyası seçin!');
        return;
    }

    const yearInput = document.getElementById('year');
    const yearError = document.getElementById('year-error');
    const yearValue = yearInput.value.trim();

    if (!validateYear(yearValue)) {
        yearInput.classList.add('is-invalid');
        yearError.textContent = yearValue
            ? `"${yearValue}" geçersiz format. YYYY-YYYY kullanın (örn: 2024-2025).`
            : 'Yıl bilgisi zorunludur.';
        yearInput.focus();
        return;
    }
    yearInput.classList.remove('is-invalid');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);
    formData.append('year', yearValue);

    showProgress();

    try {
        // 1. PDF yükleme isteği gönder — anında job_id döner
        const response = await fetch(`${API_BASE}/admin/extract`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Sunucu hatası!');
        }

        const data = await response.json();
        currentJobId = data.job_id;

        // 2. İş durumunu periyodik olarak sorgula
        startPolling(currentJobId);

    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Sunucu hatası! Lütfen daha sonra tekrar deneyin.');
    }
});

// ============================================
// JOB POLLING — GET /admin/jobs/{job_id}
// ============================================

function startPolling(jobId) {
    // Mesaj animasyonu
    const messages = [
        'PDF dosyanız yükleniyor...',
        'Makaleler taranıyor...',
        'Başlıklar çıkarılıyor...',
        'Özetler işleniyor...',
        'Anahtar kelimeler belirleniyor...',
        'CSV dosyası oluşturuluyor...'
    ];
    let idx = 0;
    const msgTimer = setInterval(() => {
        progressText.textContent = messages[idx];
        idx = (idx + 1) % messages.length;
    }, 2000);

    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
                headers: getAdminHeaders(),
            });

            if (!res.ok) {
                clearInterval(pollTimer);
                clearInterval(msgTimer);
                showError('İş durumu sorgulanamadı.');
                return;
            }

            const job = await res.json();

            if (job.status === 'done') {
                clearInterval(pollTimer);
                clearInterval(msgTimer);
                currentFilename = job.csv_filename;
                showSuccess(job.article_count, job.csv_filename);

            } else if (job.status === 'error') {
                clearInterval(pollTimer);
                clearInterval(msgTimer);
                showError(job.error || 'PDF işleme sırasında bir hata oluştu.');
            }
            // status === 'processing' ise beklemeye devam et

        } catch (err) {
            console.error('Polling error:', err);
        }
    }, POLL_INTERVAL_MS);
}

// ============================================
// DOWNLOAD — GET /admin/download/{job_id}/{filename}
// ============================================

downloadBtn.addEventListener('click', () => downloadCSV());
downloadBtnFromAnalysis.addEventListener('click', () => downloadCSV());

async function downloadCSV() {
    if (!currentJobId || !currentFilename) {
        showError('İndirme bilgileri bulunamadı!');
        return;
    }
    const downloadUrl = `${API_BASE}/admin/download/${currentJobId}/${currentFilename}`;

    // X-Admin-Key header'ı ile fetch edip blob olarak indir
    try {
        const res = await fetch(downloadUrl, { headers: getAdminHeaders() });
        if (!res.ok) throw new Error('İndirme başarısız.');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = currentFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('CSV dosyası indiriliyor...', 'success');

        // 2 saniye sonra geçici dosyaları temizle
        setTimeout(() => cleanupJob(), 2000);

    } catch (err) {
        console.error('Download error:', err);
        showError('İndirme sırasında bir hata oluştu!');
    }
}

// ============================================
// ANALYSIS — GET /admin/analyze/{job_id}/{filename}
// ============================================

analyzeBtn.addEventListener('click', async () => {
    if (!currentJobId || !currentFilename) {
        showError('Analiz bilgileri bulunamadı!');
        return;
    }
    try {
        showNotification('Analiz yapılıyor...', 'info');
        const res = await fetch(
            `${API_BASE}/admin/analyze/${currentJobId}/${currentFilename}`,
            { headers: getAdminHeaders() }
        );
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Analiz başarısız.');
        }
        const analysis = await res.json();
        displayAnalysis(analysis);
    } catch (err) {
        console.error('Analysis error:', err);
        showError(err.message || 'Analiz sırasında bir hata oluştu!');
    }
});

closeAnalysisBtn.addEventListener('click', () => {
    analysisSection.classList.add('d-none');
    resultSection.classList.remove('d-none');
});

function displayAnalysis(analysis) {
    // Temel istatistikler
    const basicStats = analysis.basic_stats;
    document.getElementById('statTotalArticles').textContent = basicStats.total_articles;
    document.getElementById('statTotalColumns').textContent = basicStats.total_columns;
    document.getElementById('statFileSize').textContent = formatFileSize(basicStats.file_size);

    // Eksik değerler
    const mv = analysis.missing_values;
    document.getElementById('statMissingValues').textContent = mv.total_missing;

    if (mv.has_missing && mv.details.length > 0) {
        const missingSection = document.getElementById('missingDetailsSection');
        const missingList = document.getElementById('missingDetailsList');
        let html = '<ul class="mb-0">';
        mv.details.forEach(item => {
            html += `<li><strong>${item.column}:</strong> ${item.count} eksik değer (${item.percentage}%)</li>`;
        });
        html += '</ul>';
        missingList.innerHTML = html;
        missingSection.classList.remove('d-none');
    }

    // Dil istatistikleri
    const lang = analysis.language_stats;
    if (lang) {
        document.getElementById('trPercentage').textContent = `${lang.tr_completeness}%`;
        document.getElementById('enPercentage').textContent = `${lang.en_completeness}%`;
        document.getElementById('trProgressBar').style.width = `${lang.tr_completeness}%`;
        document.getElementById('enProgressBar').style.width = `${lang.en_completeness}%`;
    }

    // İlk 5 satır tablosu
    const tableBody = document.getElementById('dataPreviewBody');
    tableBody.innerHTML = '';
    analysis.first_rows.forEach((row) => {
        const tr = document.createElement('tr');
        const hasAll = row.Title_TR && row.Title_EN && row.Abstract_TR && row.Abstract_EN;
        const badge = hasAll
            ? '<span class="badge bg-success">Tam</span>'
            : '<span class="badge bg-warning">Eksik</span>';
        tr.innerHTML = `
            <td>${row.PageNumber || '-'}</td>
            <td>${row.Year || '-'}</td>
            <td title="${row.Title_TR || '-'}">${truncateText(row.Title_TR || '-', 50)}</td>
            <td title="${row.Title_EN || '-'}">${truncateText(row.Title_EN || '-', 50)}</td>
            <td title="${row.Abstract_TR || '-'}">${truncateText(row.Abstract_TR || '-', 50)}</td>
            <td title="${row.Abstract_EN || '-'}">${truncateText(row.Abstract_EN || '-', 50)}</td>
            <td title="${row.Keywords_TR || '-'}">${truncateText(row.Keywords_TR || '-', 50)}</td>
            <td title="${row.Keywords_EN || '-'}">${truncateText(row.Keywords_EN || '-', 50)}</td>
            <td>${badge}</td>
        `;
        tableBody.appendChild(tr);
    });

    resultSection.classList.add('d-none');
    analysisSection.classList.remove('d-none');
    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function truncateText(text, maxLength) {
    if (!text || text === '-') return '-';
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
}

// ============================================
// CLEANUP — DELETE /admin/cleanup/{job_id}
// ============================================

async function cleanupJob() {
    if (!currentJobId) return;
    const jobId = currentJobId;
    currentJobId = null; // ikinci çağrıyı önle
    try {
        await fetch(`${API_BASE}/admin/cleanup/${jobId}`, {
            method: 'DELETE',
            headers: getAdminHeaders(),
        });
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

// ============================================
// RESET
// ============================================

resetBtn.addEventListener('click', () => {
    if (pollTimer) clearInterval(pollTimer);
    cleanupJob();
    resetFileUpload();
    const yr = document.getElementById('year');
    yr.value = '';
    yr.classList.remove('is-invalid');
    currentJobId = null;
    currentFilename = null;
});

retryBtn.addEventListener('click', () => {
    hideAllSections();
    submitBtn.classList.remove('d-none');
});

// ============================================
// UI STATE FUNCTIONS
// ============================================

function showProgress() {
    hideAllSections();
    submitBtn.classList.add('d-none');
    progressSection.classList.remove('d-none');
    progressText.textContent = 'PDF dosyanız yükleniyor...';
}

function showSuccess(articleCount, csvFilename) {
    hideAllSections();
    submitBtn.classList.remove('d-none');
    resultMessage.innerHTML = `
        <strong>${articleCount}</strong> makale başarıyla işlendi!
        <br><small class="text-muted mt-1">${csvFilename}</small>
    `;
    resultSection.classList.remove('d-none');
    resultSection.style.animation = 'slideIn 0.5s ease';
}

function showError(message) {
    hideAllSections();
    if (pollTimer) clearInterval(pollTimer);
    submitBtn.classList.remove('d-none');
    errorMessage.textContent = message;
    errorSection.classList.remove('d-none');
    errorSection.style.animation = 'slideIn 0.5s ease';
}

function hideAllSections() {
    progressSection.classList.add('d-none');
    resultSection.classList.add('d-none');
    errorSection.classList.add('d-none');
    analysisSection.classList.add('d-none');
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    toast.style.zIndex = '9999';
    toast.style.minWidth = '300px';
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease';
        setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
}

// ============================================
// PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 LIFT UP Admin Panel — Ready! API:', API_BASE);
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
});
