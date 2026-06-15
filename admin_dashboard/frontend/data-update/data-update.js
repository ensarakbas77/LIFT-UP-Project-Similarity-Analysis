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

const confirmModal     = document.getElementById('confirmModal');
const confirmModalText = document.getElementById('confirmModalText');
const confirmOkBtn     = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

const passwordModal      = document.getElementById('passwordModal');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const toggleAdminPw      = document.getElementById('toggleAdminPw');
const toggleAdminPwIcon  = document.getElementById('toggleAdminPwIcon');
const passwordOkBtn      = document.getElementById('passwordOkBtn');
const passwordCancelBtn  = document.getElementById('passwordCancelBtn');
const pwError            = document.getElementById('pwError');
const pwErrorText        = document.getElementById('pwErrorText');


// ── Yardımcı ─────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024)    return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function showModal(el) { el.classList.add('visible'); }
function hideModal(el) { el.classList.remove('visible'); }

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


// ── Dosya Durumu ──────────────────────────────────────────────────────────────
let selectedFile = null;

function updateStartBtn() {
    startUploadBtn.disabled = !selectedFile;
}

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
    updateStartBtn();
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

// Adım 1: Butona tıkla → Uyarı modalı
startUploadBtn.addEventListener('click', () => {
    if (!selectedFile) return;
    confirmModalText.textContent = `"${selectedFile.name}" dosyası projects tablosuna eklenecek. Devam etmek istiyor musunuz?`;
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
            clearFile();
            showToast(`${data.inserted ?? '?'} proje başarıyla eklendi.`);
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


// ============================================
// CSV → Otomatik Embedding Yükleme (bağımsız blok)
// --------------------------------------------
// Yukarıdaki .pkl mantığından tamamen izoledir; yalnızca ortak yardımcılar
// (formatBytes, showModal, hideModal, showToast) yeniden kullanılır.
// ============================================
(function () {
    const csvFileInput    = document.getElementById('csvFileInput');
    const csvUploadZone   = document.getElementById('csvUploadZone');
    const csvUploadTitle  = document.getElementById('csvUploadTitle');
    const csvUploadSub    = document.getElementById('csvUploadSub');
    const csvFileInfoWrap = document.getElementById('csvFileInfoWrap');
    const csvFileInfoName = document.getElementById('csvFileInfoName');
    const csvFileInfoSize = document.getElementById('csvFileInfoSize');
    const csvClearFileBtn = document.getElementById('csvClearFileBtn');
    const csvStartBtn     = document.getElementById('csvStartBtn');
    const csvProgressWrap  = document.getElementById('csvProgressWrap');
    const csvProgressFill  = document.getElementById('csvProgressFill');
    const csvProgressLabel = document.getElementById('csvProgressLabel');
    const csvResultWrap    = document.getElementById('csvResultWrap');

    const csvConfirmModal     = document.getElementById('csvConfirmModal');
    const csvConfirmModalText = document.getElementById('csvConfirmModalText');
    const csvConfirmOkBtn     = document.getElementById('csvConfirmOkBtn');
    const csvConfirmCancelBtn = document.getElementById('csvConfirmCancelBtn');

    const csvPasswordModal      = document.getElementById('csvPasswordModal');
    const csvAdminPasswordInput = document.getElementById('csvAdminPasswordInput');
    const csvToggleAdminPw      = document.getElementById('csvToggleAdminPw');
    const csvToggleAdminPwIcon  = document.getElementById('csvToggleAdminPwIcon');
    const csvPasswordOkBtn      = document.getElementById('csvPasswordOkBtn');
    const csvPasswordCancelBtn  = document.getElementById('csvPasswordCancelBtn');
    const csvPwError            = document.getElementById('csvPwError');
    const csvPwErrorText        = document.getElementById('csvPwErrorText');

    let selectedCsvFile = null;

    function csvShowPwError(msg) { csvPwErrorText.textContent = msg; csvPwError.style.display = 'block'; }
    function csvHidePwError() { csvPwError.style.display = 'none'; }
    function csvSetProgressVisible(show) { csvProgressWrap.style.display = show ? 'block' : 'none'; }

    function csvShowResult(type, title, detail) {
        const icon = type === 'success'
            ? '<i class="fas fa-circle-check result-icon"></i>'
            : '<i class="fas fa-circle-xmark result-icon"></i>';
        csvResultWrap.style.display = 'block';
        csvResultWrap.innerHTML = `
            <div class="result-card ${type}">
                ${icon}
                <div>
                    <div class="result-title">${title}</div>
                    <div class="result-detail">${detail}</div>
                </div>
            </div>`;
    }
    function csvHideResult() { csvResultWrap.style.display = 'none'; csvResultWrap.innerHTML = ''; }

    function csvSetUploading(loading) {
        csvStartBtn.disabled = loading;
        csvStartBtn.innerHTML = loading
            ? '<span class="btn-spinner"></span> İşleniyor...'
            : '<i class="fas fa-wand-magic-sparkles"></i> Embedding Üret ve Ekle';
    }

    function csvUpdateStartBtn() { csvStartBtn.disabled = !selectedCsvFile; }

    function applyCsvFile(file) {
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            csvShowResult('error', 'Geçersiz Dosya', 'Yalnızca .csv uzantılı dosyalar desteklenir.');
            return;
        }
        selectedCsvFile = file;
        csvFileInfoName.textContent = file.name;
        csvFileInfoSize.textContent = formatBytes(file.size);
        csvFileInfoWrap.style.display = 'block';
        csvUploadZone.classList.add('file-selected');
        csvUploadTitle.textContent = 'Dosya seçildi';
        csvUploadSub.textContent   = 'Değiştirmek için tekrar tıklayın veya sürükleyin';
        csvHideResult();
        csvUpdateStartBtn();
    }

    function clearCsvFile() {
        selectedCsvFile = null;
        csvFileInput.value = '';
        csvFileInfoWrap.style.display = 'none';
        csvUploadZone.classList.remove('file-selected');
        csvUploadTitle.textContent = '.csv dosyasını buraya sürükleyin veya tıklayın';
        csvUploadSub.textContent   = 'Desteklenen format: .csv (PDF Veri Çıkarıcı çıktısı)';
        csvHideResult();
        csvSetProgressVisible(false);
        csvUpdateStartBtn();
    }

    csvFileInput.addEventListener('change', () => {
        if (csvFileInput.files.length) applyCsvFile(csvFileInput.files[0]);
    });

    csvClearFileBtn.addEventListener('click', (e) => { e.stopPropagation(); clearCsvFile(); });

    // Drag & Drop
    csvUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); csvUploadZone.classList.add('drag-over'); });
    csvUploadZone.addEventListener('dragleave', () => csvUploadZone.classList.remove('drag-over'));
    csvUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        csvUploadZone.classList.remove('drag-over');
        const file = e.dataTransfer?.files?.[0];
        if (file) applyCsvFile(file);
    });

    // Şifre göster/gizle
    csvToggleAdminPw.addEventListener('click', () => {
        const isText = csvAdminPasswordInput.type === 'text';
        csvAdminPasswordInput.type = isText ? 'password' : 'text';
        csvToggleAdminPwIcon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
    });

    // Adım 1: butona tıkla → onay modalı
    csvStartBtn.addEventListener('click', () => {
        if (!selectedCsvFile) return;
        csvConfirmModalText.textContent =
            `"${selectedCsvFile.name}" dosyasındaki projeler için embedding üretilip projects tablosuna eklenecek. ` +
            `Bu işlem (CPU'da) biraz sürebilir. Devam edilsin mi?`;
        showModal(csvConfirmModal);
    });

    csvConfirmCancelBtn.addEventListener('click', () => hideModal(csvConfirmModal));
    csvConfirmModal.addEventListener('click', (e) => { if (e.target === csvConfirmModal) hideModal(csvConfirmModal); });

    // Adım 2: onayla → şifre modalı
    csvConfirmOkBtn.addEventListener('click', () => {
        hideModal(csvConfirmModal);
        csvAdminPasswordInput.value = '';
        csvHidePwError();
        showModal(csvPasswordModal);
        setTimeout(() => csvAdminPasswordInput.focus(), 120);
    });

    // Şifre modalı — iptal
    csvPasswordCancelBtn.addEventListener('click', () => {
        hideModal(csvPasswordModal);
        csvAdminPasswordInput.value = '';
        csvHidePwError();
    });
    csvPasswordModal.addEventListener('click', (e) => {
        if (e.target === csvPasswordModal) {
            hideModal(csvPasswordModal);
            csvAdminPasswordInput.value = '';
            csvHidePwError();
        }
    });

    csvAdminPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') csvPasswordOkBtn.click();
    });

    // Adım 3: şifreyi onayla → API çağrısı
    csvPasswordOkBtn.addEventListener('click', async () => {
        const password = csvAdminPasswordInput.value;
        if (!password) { csvShowPwError('Lütfen şifrenizi girin.'); return; }

        csvHidePwError();
        csvPasswordOkBtn.disabled = true;
        csvPasswordOkBtn.innerHTML = '<span class="btn-spinner"></span> Doğrulanıyor...';

        hideModal(csvPasswordModal);
        csvSetUploading(true);
        csvHideResult();
        csvSetProgressVisible(true);
        csvProgressFill.style.width = '25%';
        csvProgressLabel.textContent = 'Dosya sunucuya gönderiliyor...';

        const token = localStorage.getItem('lift_admin_token');
        const formData = new FormData();
        formData.append('file', selectedCsvFile);
        formData.append('password', password);

        try {
            csvProgressFill.style.width = '60%';
            csvProgressLabel.textContent = 'Embedding üretiliyor (bu işlem biraz sürebilir)...';

            const res = await fetch('/data/upload-csv', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            csvProgressFill.style.width = '100%';

            if (!res.ok) {
                csvProgressLabel.textContent = 'Hata oluştu.';
                const detail = data?.detail || `HTTP ${res.status}`;
                if (res.status === 401) {
                    csvShowPwError(detail);
                    showModal(csvPasswordModal);
                } else {
                    csvShowResult('error', 'Yükleme Başarısız', detail);
                }
            } else {
                csvProgressLabel.textContent = 'Tamamlandı!';
                clearCsvFile();
                const skippedMsg = data.skipped ? ` (${data.skipped} satır atlandı)` : '';
                showToast(`${data.inserted ?? '?'} proje başarıyla eklendi.${skippedMsg}`);
            }
        } catch (err) {
            csvProgressFill.style.width = '100%';
            csvProgressLabel.textContent = 'Bağlantı hatası.';
            csvShowResult('error', 'Sunucuya Bağlanılamadı', 'Backend servisinin çalıştığından emin olun.');
        } finally {
            csvSetUploading(false);
            csvPasswordOkBtn.disabled = false;
            csvPasswordOkBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Üret ve Ekle';
            csvAdminPasswordInput.value = '';
        }
    });
})();
