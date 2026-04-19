/**
 * LIFT UP Admin — Data Management
 * Veritabanı sorgulama, arama ve yıl bazlı filtreleme
 */

document.addEventListener('DOMContentLoaded', () => {

    const tableBody      = document.getElementById('projectsTableBody');
    const searchInput    = document.getElementById('searchInput');
    const yearFilter     = document.getElementById('yearFilter');
    const clearBtn       = document.getElementById('clearFiltersBtn');
    const resultsBadge   = document.getElementById('resultsBadge');
    const pageInfo       = document.getElementById('pageInfo');
    const prevBtn        = document.getElementById('prevBtn');
    const nextBtn        = document.getElementById('nextBtn');

    let allProjects      = [];
    let filteredProjects = [];
    let currentPage      = 1;
    const itemsPerPage   = 10;

    // ── Veri Çek ─────────────────────────────────────────────────────────────
    fetchProjects();

    function fetchProjects() {
        fetch('/api/projects/')
            .then(res => {
                if (!res.ok) throw new Error('API Bağlantı Hatası');
                return res.json();
            })
            .then(data => {
                allProjects = data;
                applyFilters();
            })
            .catch(err => {
                console.log('Dummy veri ile devam ediliyor:', err);
                allProjects = generateMockData();
                applyFilters();
            });
    }

    // ── Filtre Uygula ─────────────────────────────────────────────────────────
    function applyFilters() {
        const query   = searchInput.value.toLowerCase().trim();
        const yearVal = yearFilter.value;

        filteredProjects = allProjects.filter(p => {
            // Yıl filtresi
            const yearMatch = !yearVal || (p.year && p.year === yearVal);

            // Metin araması (başlık, özet, anahtar kelime)
            const textMatch = !query ||
                (p.title    && p.title.toLowerCase().includes(query))    ||
                (p.abstract && p.abstract.toLowerCase().includes(query)) ||
                (p.keywords && p.keywords.toLowerCase().includes(query));

            return yearMatch && textMatch;
        });

        currentPage = 1;
        updateClearBtn();
        updateResultsBadge();
        renderTable();
    }

    // ── Temizle Butonu Durumu ─────────────────────────────────────────────────
    function updateClearBtn() {
        const isFiltered = searchInput.value.trim() || yearFilter.value;
        clearBtn.disabled = !isFiltered;
    }

    // ── Sonuç Rozeti ──────────────────────────────────────────────────────────
    function updateResultsBadge() {
        const isFiltered = searchInput.value.trim() || yearFilter.value;
        resultsBadge.textContent = `${filteredProjects.length} proje`;
        resultsBadge.classList.toggle('filtered', !!isFiltered);
    }

    // ── Yıl Select Görünümü ───────────────────────────────────────────────────
    function syncYearSelectStyle() {
        yearFilter.classList.toggle('active-filter', !!yearFilter.value);
    }

    // ── Event Dinleyicileri ───────────────────────────────────────────────────
    searchInput.addEventListener('input', applyFilters);

    yearFilter.addEventListener('change', () => {
        syncYearSelectStyle();
        applyFilters();
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        yearFilter.value  = '';
        syncYearSelectStyle();
        applyFilters();
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderTable(); }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; renderTable(); }
    });

    // ── Tablo Render ──────────────────────────────────────────────────────────
    function renderTable() {
        tableBody.innerHTML = '';

        if (filteredProjects.length === 0) {
            const isFiltered = searchInput.value.trim() || yearFilter.value;
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5">
                        <div style="color:#94a3b8;">
                            <i class="fas fa-search-minus fa-2x mb-3 d-block"></i>
                            <strong style="color:#64748b;">${isFiltered ? 'Filtreye uygun proje bulunamadı.' : 'Henüz proje yok.'}</strong><br>
                            ${isFiltered ? '<small>Farklı bir arama deneyin ya da filtreleri temizleyin.</small>' : ''}
                        </div>
                    </td>
                </tr>`;
            pageInfo.innerText = 'Gösterilen: 0 proje';
            prevBtn.disabled   = true;
            nextBtn.disabled   = true;
            return;
        }

        const startIndex  = (currentPage - 1) * itemsPerPage;
        const endIndex    = startIndex + itemsPerPage;
        const currentData = filteredProjects.slice(startIndex, endIndex);

        currentData.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-semibold text-secondary">#${p.id}</td>
                <td>
                    <span class="badge rounded-pill px-3 py-2"
                        style="background:rgba(0,163,224,.1);color:var(--tusas-blue);border:1px solid rgba(0,163,224,.2);font-weight:700;letter-spacing:.3px;">
                        ${p.year}
                    </span>
                </td>
                <td class="fw-bold" style="color:var(--tusas-navy)">${p.title}</td>
                <td class="text-center">
                    <button class="btn btn-sm text-nowrap btn-outline-info rounded-pill px-3 fw-semibold shadow-sm"
                        onclick="showProjectDetails(${p.id})">
                        <i class="fas fa-eye me-1"></i> Detay
                    </button>
                </td>`;
            tableBody.appendChild(row);
        });

        const totalItems  = filteredProjects.length;
        const totalPages  = Math.ceil(totalItems / itemsPerPage);
        pageInfo.innerText = `Toplam ${totalItems} projeden ${startIndex + 1}–${Math.min(endIndex, totalItems)} arası gösteriliyor`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // ── Mock Veri ─────────────────────────────────────────────────────────────
    function generateMockData() {
        const years = ['2020-2021', '2021-2022', '2022-2023', '2023-2024'];
        const data  = [];
        for (let i = 1; i <= 666; i++) {
            data.push({
                id:       i + 1000,
                year:     years[i % 4],
                title:    `Havacılık ve Uzay Sanayiinde ${i}. Nesil Yapısal Tasarım Yaklaşımları`,
                abstract: `Bu projede havacılık sektöründe kullanılan kompozit malzemelerin dayanıklılık analizleri yapılmış ve sonlu elemanlar yöntemi ile modellemeler gerçekleştirilmiştir. Proje ${i} numaralı çalışma kapsamında değerlendirilmektedir.`,
                keywords: 'Kompozit, Sonlu Elemanlar, Dayanç Analizi, Otonom, Aerodinamik'
            });
        }
        return data;
    }

    // ── Modal ─────────────────────────────────────────────────────────────────
    window.showProjectDetails = function (projectId) {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        document.getElementById('modalId').innerText      = project.id;
        document.getElementById('modalYear').innerText    = project.year;
        document.getElementById('modalTitle').innerText   = project.title    || 'Başlık Yok';
        document.getElementById('modalAbstract').innerText = project.abstract || 'Özet bulunamadı.';

        const keys   = (project.keywords || '').split(',').map(k => k.trim()).filter(k => k);
        const keyHtml = keys.map(k =>
            `<span class="badge bg-primary px-3 py-2 fs-6 mb-1 me-1 shadow-sm">${k}</span>`
        ).join('');
        document.getElementById('modalKeywords').innerHTML = keyHtml || '<span class="text-muted">Bulunamadı</span>';

        const modalEl = document.getElementById('projectDetailModal');
        new bootstrap.Modal(modalEl).show();
    };

});
