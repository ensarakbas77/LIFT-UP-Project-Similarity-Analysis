// ============================================
// LIFT UP Admin — Dashboard Logic
// Tüm sayfalarda ortak çalışır
// ============================================

// ── Auth Guard ───────────────────────────────────────────────────────────────
// Dashboard sayfaları: token yoksa /'e yönlendir
(function authGuard() {
    if (window.location.pathname === '/' || window.location.pathname === '/login') return;

    const token = localStorage.getItem('lift_admin_token');
    if (!token) {
        window.location.replace('/');
        return;
    }

    // Token süresi dolmuş mu kontrol et (JWT payload decode)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            localStorage.removeItem('lift_admin_token');
            localStorage.removeItem('lift_admin_user');
            window.location.replace('/');
        }
    } catch (e) {
        // Token bozuksa temizle
        localStorage.removeItem('lift_admin_token');
        localStorage.removeItem('lift_admin_user');
        window.location.replace('/');
    }
})();

// ── Kullanıcı Bilgisini Göster ───────────────────────────────────────────────
(function renderUserInfo() {
    const raw = localStorage.getItem('lift_admin_user');
    if (!raw) return;
    try {
        const user = JSON.parse(raw);
        const nameEl = document.getElementById('sidebarUserName');
        const emailEl = document.getElementById('sidebarUserEmail');
        if (nameEl) nameEl.textContent = user.full_name || user.username || 'Admin';
        if (emailEl) emailEl.textContent = user.email || '';
    } catch (e) { /* sessizce geç */ }
})();

// ── Çıkış Yap ────────────────────────────────────────────────────────────────
function adminLogout() {
    // Sunucuya bildir (best-effort)
    const token = localStorage.getItem('lift_admin_token');
    if (token) {
        fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { });
    }
    localStorage.removeItem('lift_admin_token');
    localStorage.removeItem('lift_admin_user');
    window.location.replace('/');
}

// Çıkış butonuna tıklama
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);

// ── Saat ────────────────────────────────────────────────────────────────────
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = document.getElementById('topbarTime');
    if (el) el.textContent = timeStr;
    const nc = document.getElementById('navClock');
    if (nc) nc.textContent = timeStr;
}
setInterval(updateTime, 1000);
updateTime();

// ── Karşılama Mesajı ─────────────────────────────────────────────────────────
function setGreeting() {
    const el = document.getElementById('greeting');
    if (!el) return;
    const h = new Date().getHours();
    if (h >= 5 && h < 12) el.textContent = '☀️ Günaydın!';
    else if (h >= 12 && h < 17) el.textContent = '🌤️ İyi günler!';
    else if (h >= 17 && h < 21) el.textContent = '🌇 İyi akşamlar!';
    else el.textContent = '🌙 İyi geceler!';
}
setGreeting();

// ── Sidebar Push Toggle ──────────────────────────────────────────────────────
const adminSidebar = document.getElementById('adminSidebar');
const pushContent = document.getElementById('pushContent');
const toggleBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (!adminSidebar) return;
    const isNowCollapsed = adminSidebar.classList.toggle('collapsed');
    if (pushContent) pushContent.classList.toggle('full-width', isNowCollapsed);
    if (sidebarOverlay && window.innerWidth <= 768) {
        sidebarOverlay.classList.toggle('visible', !isNowCollapsed);
    }
}

if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

// ── Sistem Durumu (API health check) ────────────────────────────────────────
async function checkSystemStatus() {
    const apiVal = document.getElementById('apiStatus');
    const dot = document.querySelector('.sidebar-status-dot');
    const text = document.querySelector('.sidebar-status-text');

    try {
        const res = await fetch('/health', {
            signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
            if (dot) { dot.className = 'sidebar-status-dot ok'; }
            if (text) { text.textContent = 'Sistem aktif'; }
            if (apiVal) { apiVal.textContent = 'Aktif'; apiVal.style.color = '#10b981'; }
        } else { throw new Error(); }
    } catch {
        if (dot) { dot.className = 'sidebar-status-dot err'; }
        if (text) { text.textContent = 'Bağlantı yok'; }
        if (apiVal) { apiVal.textContent = 'Offline'; apiVal.style.color = '#ef4444'; }
    }
}

checkSystemStatus();
setInterval(checkSystemStatus, 30_000);
