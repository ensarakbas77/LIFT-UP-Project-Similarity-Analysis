// ============================================
// LIFT UP Admin — Veri Düzenleme Sayfası
// ============================================

// ── DOM Referansları ──────────────────────────────────────────────────────────
const pklFileInput    = document.getElementById('pklFileInput');
const uploadZone      = document.getElementById('uploadZone');
const uploadZoneTitle = document.getElementById('uploadZoneTitle');
const uploadZoneSub   = document.getElementById('uploadZoneSub');
const fileInfoWrap    = document.getElementById('fileInfoWrap');
const fileInfoName    = document.getElementById('fileInfoName');
const fileInfoSize    = document.getElementById('fileInfoSize');
const clearFileBtn    = document.getElementById('clearFileBtn');
const startUploadBtn  = document.getElementById('startUploadBtn');
const progressWrap    = document.getElementById('progressWrap');
const progressFill    = document.getElementById('progressFill');
const progressLabel   = document.getElementById('progressLabel');
const resultWrap      = document.getElementById('resultWrap');

const confirmModal    = document.getElementById('confirmModal');
const confirmModalText = document.getElementById('confirmModalText');
const confirmOkBtn    = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

const passwordModal    = document.getElementById('passwordModal');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const toggleAdminPw    = document.getElementById('toggleAdminPw');
const toggleAdminPwIcon = document.getElementById('toggleAdminPwIcon');
const passwordOkBtn    = document.getElementById('passwordOkBtn');
const passwordCancelBtn = document.getElementById('passwordCancelBtn');
const pwError          = document.getElementById('pwError');
const pwErrorText      = document.getElementById('pwErrorText');


// ── Yardımcı ─────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function showModal(el)  { el.classList.add('visible'); }
function hideModal(el)  { el.classList.remove('visible'); }

function showPwError(msg) {
    pwErrorText.textContent = msg;
    pwError.style.display = 'block';
}
function hidePwError() { pwError.style.display = 'none'; }

function setProgressVisible(show) {
    progressWrap.style.display = show ? 'block' : 'none';
}

function showResult(type, title, detail) {
    const icon = type === 'success'
        ? '<i class="fas fa-circle-check result-icon"></i>'
        : '<i class="fas fa-circle-xmark result-icon"></i>';

    resultWrap.style.display = 'block';
    resultWrap.innerHTML = `
        <div class="result-card ${type}">
            ${icon}
            <div>
                <div class="result-title">${title}</div>
                <div class="result-detail">${detail}</div>
            </div>
        </div>`;
}

function hideResult() {
    resultWrap.style.display = 'none';
    resultWrap.innerHTML = '';
}

function showToast(msg) {
    const toast = document.getElementById('duToast');
    document.getElementById('duToastText').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function setUploading(loading) {
    startUploadBtn.disabled = loading;
    if (loading) {
        startUploadBtn.innerHTML = '<span class="btn-spinner"></span> Yükleniyor...';
    } else {
        startUploadBtn.innerHTML = '<i class="fas fa-database"></i> Veritabanına Ekle';
    }
}


// ── Dosya & Tablo Durumu ──────────────────────────────────────────────────────
let selectedFile  = null;
let selectedTable = null;

function updateStartBtn() {
    startUploadBtn.disabled = !(selectedFile && selectedTable);
}

// ── Tablo Seçimi ──────────────────────────────────────────────────────────────
const optSbert   = document.getElementById('optSbert');
const optEmrecan = document.getElementById('optEmrecan');

function selectTable(tableName) {
    selectedTable = tableName;
    optSbert.classList.toggle('selected',   tableName === 'sbert_projects');
    optEmrecan.classList.toggle('selected', tableName === 'emrecan_projects');
    updateStartBtn();
}

optSbert.addEventListener('click',   () => selectTable('sbert_projects'));
optEmrecan.addEventListener('click', () => selectTable('emrecan_projects'));

// ── Dosya Seçimi ──────────────────────────────────────────────────────────────
function applyFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.pkl')) {
        showResult('error', 'Geçersiz Dosya', 'Yalnızca .pkl uzantılı dosyalar desteklenir.');
        return;
    }
    selectedFile = file;
    fileInfoName.textContent = file.name;
    fileInfoSize.textContent = formatBytes(file.size);
    fileInfoWrap.style.display = 'block';
    uploadZone.classList.add('file-selected');
    uploadZoneTitle.textContent = 'Dosya seçildi';
    uploadZoneSub.textContent   = 'Değiştirmek için tekrar tıklayın veya sürükleyin';
    hideResult();

    // Dosya adından modeli tespit et ve tabloyu otomatik seç
    const fname = file.name.toLowerCase();
    if (fname.includes('sbert'))        selectTable('sbert_projects');
    else if (fname.includes('emrecan')) selectTable('emrecan_projects');
    else updateStartBtn();
}

function clearFile() {
    selectedFile = null;
    pklFileInput.value = '';
    fileInfoWrap.style.display = 'none';
    uploadZone.classList.remove('file-selected');
    uploadZoneTitle.textContent = '.pkl dosyasını buraya sürükleyin veya tıklayın';
    uploadZoneSub.textContent   = 'Desteklenen format: .pkl (pandas DataFrame)';
    hideResult();
    setProgressVisible(false);
    updateStartBtn();
}

pklFileInput.addEventListener('change', () => {
    if (pklFileInput.files.length) applyFile(pklFileInput.files[0]);
});

clearFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
});

// Drag & Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) applyFile(file);
});


// ── Şifre Göster/Gizle ────────────────────────────────────────────────────────
toggleAdminPw.addEventListener('click', () => {
    const isText = adminPasswordInput.type === 'text';
    adminPasswordInput.type = isText ? 'password' : 'text';
    toggleAdminPwIcon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
});


// ── Yükleme Akışı ─────────────────────────────────────────────────────────────

// Adım 1: Butona tıkla → Dosya-tablo uyuşmazlık kontrolü → Uyarı modalı
startUploadBtn.addEventListener('click', () => {
    if (!selectedFile || !selectedTable) return;

    const fname      = selectedFile.name.toLowerCase();
    const hasSbert   = fname.includes('sbert');
    const hasEmrecan = fname.includes('emrecan');

    if (hasEmrecan && selectedTable === 'sbert_projects') {
        showResult('error', 'Tablo Uyuşmazlığı',
            'Dosya adı "emrecan" içeriyor ancak hedef tablo "SBERT" seçili. Lütfen Emrecan/BERT tablosunu seçin.');
        return;
    }
    if (hasSbert && selectedTable === 'emrecan_projects') {
        showResult('error', 'Tablo Uyuşmazlığı',
            'Dosya adı "sbert" içeriyor ancak hedef tablo "Emrecan/BERT" seçili. Lütfen SBERT tablosunu seçin.');
        return;
    }

    const tableLabel = selectedTable === 'sbert_projects' ? 'SBERT (sbert_projects)' : 'Emrecan/BERT (emrecan_projects)';
    confirmModalText.textContent = `"${selectedFile.name}" dosyası ${tableLabel} tablosuna eklenecek. Devam etmek istiyor musunuz?`;
    showModal(confirmModal);
});

// Uyarı modalı — İptal
confirmCancelBtn.addEventListener('click', () => hideModal(confirmModal));
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) hideModal(confirmModal);
});

// Adım 2: Uyarıyı onayla → Şifre modalı
confirmOkBtn.addEventListener('click', () => {
    hideModal(confirmModal);
    adminPasswordInput.value = '';
    hidePwError();
    showModal(passwordModal);
    setTimeout(() => adminPasswordInput.focus(), 120);
});

// Şifre modalı — İptal
passwordCancelBtn.addEventListener('click', () => {
    hideModal(passwordModal);
    adminPasswordInput.value = '';
    hidePwError();
});
passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
        hideModal(passwordModal);
        adminPasswordInput.value = '';
        hidePwError();
    }
});

// Enter tuşu şifre alanında
adminPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') passwordOkBtn.click();
});

// Adım 3: Şifreyi onayla → API çağrısı
passwordOkBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value;
    if (!password) {
        showPwError('Lütfen şifrenizi girin.');
        return;
    }

    hidePwError();
    passwordOkBtn.disabled = true;
    passwordOkBtn.innerHTML = '<span class="btn-spinner"></span> Doğrulanıyor...';

    hideModal(passwordModal);
    setUploading(true);
    hideResult();
    setProgressVisible(true);
    progressFill.style.width = '30%';
    progressLabel.textContent = 'Dosya sunucuya gönderiliyor...';

    const token = localStorage.getItem('lift_admin_token');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('password', password);
    formData.append('table', selectedTable);

    try {
        progressFill.style.width = '60%';
        progressLabel.textContent = 'Veriler işleniyor ve veritabanına ekleniyor...';

        const res = await fetch('/data/upload-pkl', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        const data = await res.json().catch(() => ({}));

        progressFill.style.width = '100%';

        if (!res.ok) {
            progressLabel.textContent = 'Hata oluştu.';
            const detail = data?.detail || `HTTP ${res.status}`;

            if (res.status === 401) {
                showPwError(detail);
                showModal(passwordModal);
            } else {
                showResult('error', 'Yükleme Başarısız', detail);
            }
        } else {
            progressLabel.textContent = 'Tamamlandı!';
            const tableLabel = selectedTable === 'sbert_projects' ? 'SBERT' : 'Emrecan/BERT';
            clearFile();
            showToast(`${data.inserted ?? '?'} proje ${tableLabel} tablosuna başarıyla eklendi.`);
        }

    } catch (err) {
        progressFill.style.width = '100%';
        progressLabel.textContent = 'Bağlantı hatası.';
        showResult('error', 'Sunucuya Bağlanılamadı', 'Backend servisinin çalıştığından emin olun.');
    } finally {
        setUploading(false);
        passwordOkBtn.disabled = false;
        passwordOkBtn.innerHTML = '<i class="fas fa-upload"></i> Yükle';
        adminPasswordInput.value = '';
    }
});
