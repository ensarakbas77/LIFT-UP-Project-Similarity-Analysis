/**
 * LIFT UP Admin — Login Page Script
 *
 * - POST /auth/login endpoint'ine istek atar
 * - Başarılı girişte JWT token'ı localStorage'a kaydeder
 * - Dashboard'a yönlendirir
 */

const API_BASE = '';

// ── DOM Referansları ─────────────────────────────────────────────
const form = document.getElementById('loginForm');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const alertBox = document.getElementById('loginAlert');
const alertMsg = document.getElementById('loginAlertMsg');
const togglePwdBtn = document.getElementById('togglePassword');
const togglePwdIco = document.getElementById('togglePasswordIcon');

// ── Şifre Göster/Gizle ───────────────────────────────────────────
togglePwdBtn.addEventListener('click', () => {
    const isPassword = passwordEl.type === 'password';
    passwordEl.type = isPassword ? 'text' : 'password';
    togglePwdIco.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
});

// ── Alert Yardımcı Fonksiyonları ─────────────────────────────────
function showAlert(message, type = 'error') {
    alertMsg.textContent = message;
    alertBox.className = 'login-alert show' + (type === 'success' ? ' alert-success' : '');
    const icon = alertBox.querySelector('.alert-icon');
    icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} alert-icon`;
}

function hideAlert() {
    alertBox.className = 'login-alert';
}

// ── Loading State ────────────────────────────────────────────────
function setLoading(loading) {
    loginBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'flex';
    btnLoader.style.display = loading ? 'flex' : 'none';
}

// ── Oturum Kontrolü (sayfa yüklendiğinde) ───────────────────────
(function checkExistingSession() {
    const token = localStorage.getItem('lift_admin_token');
    if (!token) return;

    // Token varsa /auth/me ile doğrula
    fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (res.ok) {
                window.location.replace('/dashboard');   // Zaten giriş yapmış → dashboard
            } else {
                localStorage.removeItem('lift_admin_token');
                localStorage.removeItem('lift_admin_user');
            }
        })
        .catch(() => {
            // Sunucu hatası — sessizce geç
        });
})();

// ── Form Submit ──────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) {
        showAlert('Lütfen kullanıcı adı ve şifrenizi girin.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            // FastAPI hata detayı
            const detail = data?.detail || 'Giriş başarısız. Lütfen tekrar deneyin.';
            showAlert(detail);
            setLoading(false);
            return;
        }

        // Başarılı giriş
        localStorage.setItem('lift_admin_token', data.access_token);
        localStorage.setItem('lift_admin_user', JSON.stringify(data.user));

        showAlert('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');

        // Kısa gecikmeyle dashboard'a yönlendir
        setTimeout(() => {
            window.location.replace('/dashboard');
        }, 900);

    } catch (err) {
        showAlert('Sunucuya bağlanılamadı. Backend servisinin çalıştığından emin olun.');
        setLoading(false);
        console.error('[Login] Hata:', err);
    }
});

// ── Enter tuşu desteği ───────────────────────────────────────────
[usernameEl, passwordEl].forEach(el => {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
    });
});

// ── Input temizleme ───────────────────────────────────────────────
[usernameEl, passwordEl].forEach(el => {
    el.addEventListener('input', hideAlert);
});
