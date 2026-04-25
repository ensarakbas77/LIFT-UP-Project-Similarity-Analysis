// ============================================
// LIFT UP Admin — Settings Page Logic
// ============================================

// ── Toast Bildirimi ───────────────────────────────────────────────────────────
const settingsToast = document.getElementById('settingsToast');
const toastIcon     = document.getElementById('toastIcon');
const toastTitle    = document.getElementById('toastTitle');
const toastMessage  = document.getElementById('toastMessage');

let toastTimer = null;

/**
 * @param {'success'|'error'} type
 * @param {string} title
 * @param {string} message
 */
function showToast(type, title, message) {
    // Önceki timer varsa iptal et
    if (toastTimer) clearTimeout(toastTimer);

    // Sınıfları sıfırla
    settingsToast.className = 'settings-toast';
    settingsToast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');

    toastTitle.textContent   = title;
    toastMessage.textContent = message;
    toastIcon.className = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation';

    // Göster
    requestAnimationFrame(() => {
        requestAnimationFrame(() => settingsToast.classList.add('show'));
    });

    // 4 saniye sonra gizle
    toastTimer = setTimeout(() => {
        settingsToast.classList.remove('show');
    }, 4500);
}


// ── Mevcut Kullanıcı Bilgisini Yükle ─────────────────────────────────────────
function loadCurrentUserInfo() {
    const raw = localStorage.getItem('lift_admin_user');
    const tokenRaw = localStorage.getItem('lift_admin_token');

    if (!raw) return;

    try {
        const user = JSON.parse(raw);

        // Avatar alanı
        const displayName  = document.getElementById('currentDisplayName');
        const displayEmail = document.getElementById('currentDisplayEmail');
        if (displayName)  displayName.textContent  = user.username || user.full_name || 'Admin';
        if (displayEmail) displayEmail.textContent = user.email || '—';

        // Sağ panel bilgi satırları
        const infoUserId   = document.getElementById('infoUserId');
        const infoUsername = document.getElementById('infoUsername');
        const infoEmail    = document.getElementById('infoEmail');
        if (infoUserId)   infoUserId.textContent   = user.id   || '—';
        if (infoUsername) infoUsername.textContent  = user.username || '—';
        if (infoEmail)    infoEmail.textContent     = user.email    || '—';

        // Token bilgisi
        if (tokenRaw) {
            try {
                const payload = JSON.parse(atob(tokenRaw.split('.')[1]));
                const exp = payload.exp;
                if (exp) {
                    const expDate = new Date(exp * 1000);
                    const expEl = document.getElementById('infoTokenExp');
                    if (expEl) {
                        expEl.textContent = expDate.toLocaleString('tr-TR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        });
                    }
                    // Kalan süreyi hesapla
                    const remaining = exp - Date.now() / 1000;
                    const tokenStatusEl = document.getElementById('infoTokenStatus');
                    if (tokenStatusEl) {
                        if (remaining > 0) {
                            tokenStatusEl.textContent = 'Aktif';
                            tokenStatusEl.style.cssText = 'background:rgba(16,185,129,.12);color:#059669;border:1px solid rgba(16,185,129,.25);';
                        } else {
                            tokenStatusEl.textContent = 'Süresi Dolmuş';
                            tokenStatusEl.style.cssText = 'background:rgba(239,68,68,.12);color:#dc2626;border:1px solid rgba(239,68,68,.25);';
                        }
                    }
                }
            } catch (_) { /* token decode hatası */ }
        }

    } catch (e) { /* JSON parse hatası */ }
}

loadCurrentUserInfo();


// ── İkinci Çıkış Butonu ───────────────────────────────────────────────────────
const logoutBtn2 = document.getElementById('logoutBtn2');
if (logoutBtn2) {
    logoutBtn2.addEventListener('click', () => {
        if (typeof adminLogout === 'function') adminLogout();
    });
}


// ── API İsteği Yardımcısı ─────────────────────────────────────────────────────
async function callUpdateProfile(payload) {
    const token = localStorage.getItem('lift_admin_token');
    const res = await fetch('/auth/update-profile', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
    }
    return data;
}


// ── Butonu Yükleme Durumunda Göster ──────────────────────────────────────────
function setButtonLoading(btn, loading, originalHTML) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> İşleniyor...';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}


// ── localStorage Kullanıcı Bilgisini Güncelle ─────────────────────────────────
function updateLocalUser(updates) {
    const raw = localStorage.getItem('lift_admin_user');
    if (!raw) return;
    try {
        const user = JSON.parse(raw);
        Object.assign(user, updates);
        localStorage.setItem('lift_admin_user', JSON.stringify(user));
    } catch (_) { }
}


// ── Profil Formu (Kullanıcı Adı + E-posta) ───────────────────────────────────
const profileForm    = document.getElementById('profileForm');
const profileSaveBtn = document.getElementById('profileSaveBtn');
const profileSaveBtnOriginalHTML = profileSaveBtn ? profileSaveBtn.innerHTML : '';

if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameVal = document.getElementById('usernameInput').value.trim();
        const emailVal    = document.getElementById('emailInput').value.trim();

        // En az bir alan dolu olmalı
        if (!usernameVal && !emailVal) {
            showToast('error', 'Eksik Bilgi', 'Güncellemek istediğiniz en az bir alanı doldurun.');
            return;
        }

        // E-posta format kontrolü
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            showToast('error', 'Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi girin.');
            return;
        }

        const payload = {};
        if (usernameVal) payload.username = usernameVal;
        if (emailVal)    payload.email    = emailVal;

        setButtonLoading(profileSaveBtn, true, profileSaveBtnOriginalHTML);

        try {
            await callUpdateProfile(payload);

            // localStorage güncelle
            updateLocalUser(payload);

            // UI'daki görünür alanları güncelle
            loadCurrentUserInfo();

            // Sidebar'daki kullanıcı adını güncelle
            const nameEl  = document.getElementById('sidebarUserName');
            const emailEl = document.getElementById('sidebarUserEmail');
            const raw = localStorage.getItem('lift_admin_user');
            if (raw) {
                const user = JSON.parse(raw);
                if (nameEl)  nameEl.textContent  = user.username || user.full_name || 'Admin';
                if (emailEl) emailEl.textContent = user.email || '';
            }

            // Formu temizle
            document.getElementById('usernameInput').value = '';
            document.getElementById('emailInput').value    = '';

            showToast('success', 'Profil Güncellendi', 'Kullanıcı adı ve/veya e-postanız başarıyla kaydedildi.');
        } catch (err) {
            showToast('error', 'Güncelleme Başarısız', err.message || 'Sunucuya bağlanırken bir hata oluştu.');
        } finally {
            setButtonLoading(profileSaveBtn, false, profileSaveBtnOriginalHTML);
        }
    });
}


// ── Şifre Güç Göstergesi ──────────────────────────────────────────────────────
const newPasswordInput = document.getElementById('newPasswordInput');
const pwStrengthFill   = document.getElementById('pwStrengthFill');
const pwStrengthLabel  = document.getElementById('pwStrengthLabel');

function measurePasswordStrength(pw) {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6)  score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels = [
        { label: '',              color: '#e2e8f0', pct: 0   },
        { label: 'Çok Zayıf',    color: '#ef4444', pct: 20  },
        { label: 'Zayıf',        color: '#f97316', pct: 40  },
        { label: 'Orta',         color: '#f59e0b', pct: 60  },
        { label: 'Güçlü',        color: '#10b981', pct: 80  },
        { label: 'Çok Güçlü 💪', color: '#059669', pct: 100 },
    ];
    return levels[score];
}

if (newPasswordInput) {
    newPasswordInput.addEventListener('input', () => {
        const pw = newPasswordInput.value;
        const { label, color, pct } = measurePasswordStrength(pw);
        if (pwStrengthFill) {
            pwStrengthFill.style.width      = `${pct}%`;
            pwStrengthFill.style.background = color;
        }
        if (pwStrengthLabel) {
            pwStrengthLabel.textContent = label;
            pwStrengthLabel.style.color = color;
        }
        // Eşleşme kontrolünü de güncelle
        checkPasswordMatch();
    });
}

// ── Şifre Eşleşme Kontrolü ────────────────────────────────────────────────────
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const pwMatchLabel         = document.getElementById('pwMatchLabel');

function checkPasswordMatch() {
    if (!confirmPasswordInput || !newPasswordInput) return;
    const pw1 = newPasswordInput.value;
    const pw2 = confirmPasswordInput.value;
    if (!pw2) {
        if (pwMatchLabel) { pwMatchLabel.textContent = ''; }
        return;
    }
    if (pw1 === pw2) {
        if (pwMatchLabel) { pwMatchLabel.textContent = '✓ Şifreler eşleşiyor'; pwMatchLabel.style.color = '#10b981'; }
    } else {
        if (pwMatchLabel) { pwMatchLabel.textContent = '✗ Şifreler eşleşmiyor'; pwMatchLabel.style.color = '#ef4444'; }
    }
}

if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
}


// ── Şifre Göster/Gizle ────────────────────────────────────────────────────────
function setupToggle(btnId, inputId) {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        btn.querySelector('i').className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
}

setupToggle('toggleNewPw',     'newPasswordInput');
setupToggle('toggleConfirmPw', 'confirmPasswordInput');


// ── Şifre Formu ──────────────────────────────────────────────────────────────
const passwordForm    = document.getElementById('passwordForm');
const passwordSaveBtn = document.getElementById('passwordSaveBtn');
const passwordSaveBtnOriginalHTML = passwordSaveBtn ? passwordSaveBtn.innerHTML : '';

if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPw     = document.getElementById('newPasswordInput').value;
        const confirmPw = document.getElementById('confirmPasswordInput').value;

        if (!newPw) {
            showToast('error', 'Eksik Bilgi', 'Lütfen yeni şifrenizi girin.');
            return;
        }
        if (newPw.length < 6) {
            showToast('error', 'Şifre Çok Kısa', 'Şifreniz en az 6 karakter olmalıdır.');
            return;
        }
        if (newPw !== confirmPw) {
            showToast('error', 'Şifreler Eşleşmiyor', 'Girdiğiniz şifreler birbirinden farklı.');
            return;
        }

        setButtonLoading(passwordSaveBtn, true, passwordSaveBtnOriginalHTML);

        try {
            await callUpdateProfile({ new_password: newPw });

            // Formu sıfırla
            document.getElementById('newPasswordInput').value     = '';
            document.getElementById('confirmPasswordInput').value = '';
            if (pwStrengthFill)  { pwStrengthFill.style.width = '0%'; }
            if (pwStrengthLabel) { pwStrengthLabel.textContent = ''; }
            if (pwMatchLabel)    { pwMatchLabel.textContent = ''; }

            showToast('success', 'Şifre Değiştirildi',
                'Şifreniz başarıyla güncellendi. Bir sonraki girişinizde yeni şifrenizi kullanın.');
        } catch (err) {
            showToast('error', 'Şifre Güncellenemedi', err.message || 'Sunucuya bağlanırken bir hata oluştu.');
        } finally {
            setButtonLoading(passwordSaveBtn, false, passwordSaveBtnOriginalHTML);
        }
    });
}
