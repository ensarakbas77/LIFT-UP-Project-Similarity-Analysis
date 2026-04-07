// ============================================
// LIFT UP Admin — Dashboard Logic
// Tüm sayfalarda ortak çalışır
// ============================================

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
    if (h >= 5 && h < 12)       el.textContent = '☀️ Günaydın!';
    else if (h >= 12 && h < 17) el.textContent = '🌤️ İyi günler!';
    else if (h >= 17 && h < 21) el.textContent = '🌇 İyi akşamlar!';
    else                         el.textContent = '🌙 İyi geceler!';
}
setGreeting();

// ── Sidebar Push Toggle ──────────────────────────────────────────────────────
// Sidebar varsayılan AÇIK. Hamburger butonu collapsed class'ını toggle eder.
const adminSidebar    = document.getElementById('adminSidebar');
const pushContent     = document.getElementById('pushContent');
const toggleBtn       = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (!adminSidebar) return;
    const isNowCollapsed = adminSidebar.classList.toggle('collapsed');
    if (pushContent) pushContent.classList.toggle('full-width', isNowCollapsed);
    // Overlay yalnızca mobilde (768px altı) gösterilsin
    if (sidebarOverlay && window.innerWidth <= 768) {
        sidebarOverlay.classList.toggle('visible', !isNowCollapsed);
    }
}

if (toggleBtn)      toggleBtn.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

// ── Sistem Durumu (API health check) ────────────────────────────────────────
async function checkSystemStatus() {
    const apiVal = document.getElementById('apiStatus');
    const dot    = document.querySelector('.sidebar-status-dot');
    const text   = document.querySelector('.sidebar-status-text');

    try {
        const res = await fetch('/health', {
            signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
            if (dot)    { dot.className = 'sidebar-status-dot ok'; }
            if (text)   { text.textContent = 'Sistem aktif'; }
            if (apiVal) { apiVal.textContent = 'Aktif'; apiVal.style.color = '#10b981'; }
        } else { throw new Error(); }
    } catch {
        if (dot)    { dot.className = 'sidebar-status-dot err'; }
        if (text)   { text.textContent = 'Bağlantı yok'; }
        if (apiVal) { apiVal.textContent = 'Offline'; apiVal.style.color = '#ef4444'; }
    }
}

checkSystemStatus();
setInterval(checkSystemStatus, 30_000);
