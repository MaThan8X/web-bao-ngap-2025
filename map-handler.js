// map-handler.js (Ver 15 - Force No-Cache Headers)
// - Fix: Thêm headers no-cache vào fetch request...

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; 
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    let configModal, configForm, btnCancel, btnAddStation; 

    function getStatus(mucnuoc) {
        if (mucnuoc === null || isNaN(mucnuoc)) return 'nodata';
        if (mucnuoc >= 40) return 'danger';    
        if (mucnuoc >= 20) return 'warn';      
        return 'safe';                         
    }
    
    function getTrend() { return 'Ổn định'; }

    function createPopupContent(station) {
        const status = getStatus(station.mucnuoc);
        const statusText = {
            'nodata': 'Chưa có dữ liệu',
            'safe': 'An toàn',
            'warn': 'Cảnh báo ngập',
            'danger': 'Nguy hiểm ngập'
        };
        
        const tempDisplay = station.temp !== undefined ? `${station.temp} °C` : 'N/A';
        
        return `
            <div style="font-family: Arial, sans-serif; min-width: 150px;">
                <p style="margin: 0 0 5px 0;"><strong>Địa điểm:</strong> ${station.name || 'Chưa đặt tên'}</p>
                <p style="margin: 0 0 5px 0;"><strong>ID Thiết bị:</strong> ${station.id}</p>
                <p style="margin: 0 0 5px 0;"><strong>Mực nước:</strong> ${station.mucnuoc !== null ? station.mucnuoc + ' cm' : statusText[status]}</p>
                <p style="margin: 0 0 5px 0;"><strong>Nhiệt độ:</strong> ${tempDisplay}</p>
                <p style="margin: 0 0 5px 0;"><strong>Diễn biến:</strong> ${getTrend()}</p>
                <p style="margin: 0; font-size: 0.8em; color: #666;">Cập nhật: ${station.last_update || 'N/A'}</p>
            </div>
        `;
    }

    function openConfigModal(station = null) {
        editingStationId = station ? station.id : null;
        document.getElementById('config-name').value = station?.name || '';
        document.getElementById('config-id').value = station?.id || '';
        document.getElementById('config-lat-lon').value = station ? `${station.lat}, ${station.lon}` : '';
        
        document.getElementById('config-id').readOnly = !!station;
        document.getElementById('config-id').placeholder = station ? '' : 'ID Duy nhất (VD: F01234)';
        configModal.querySelector('h2').textContent = station ? `Sửa Cấu Hình: ${station.name}` : 'Thêm Khu Vực Mới';
        configModal.style.display = 'flex';
    }

    function closeConfigModal() {
        configModal.style.display = 'none';
        configForm.reset();
        editingStationId = null;
    }

    function renderMarkers() {
        markersLayer.clearLayers();
        allStations.forEach(station => {
            if (station.lat && station.lon) {
                const status = getStatus(station.mucnuoc);
                const iconHTML = `<div class="water-marker water-marker-${status}"></div>`;
                const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: iconHTML,
                    iconSize: [25, 25], 
                    iconAnchor: [15, 15] 
                });
                
                const marker = L.marker([station.lat, station.lon], { icon: customIcon });
                const popupContent = createPopupContent(station);
                marker.bindPopup(popupContent, { closeButton: false, offset: L.point(0, -10) });
                
                marker.on('mouseover', function(e) { this.openPopup(); });
                marker.on('mouseout', function(e) {
                    setTimeout(() => {
                        if (!e.target._popup._isOpen) return;
                        e.target._popup.getElement().addEventListener('mouseout', () => {
                            this.closePopup();
                        });
                    }, 50);
                });
                markersLayer.addLayer(marker);
            }
        });
        map.addLayer(markersLayer);
    }

    function renderSidebar() {
        const list = document.getElementById('station-list');
        list.innerHTML = '';
        allStations.forEach(station => {
            const status = getStatus(station.mucnuoc);
            const tempDisplay = station.temp !== undefined ? `${station.temp} °C` : 'N/A';
            
            const li = document.createElement('li');
            li.className = `station-item`;
            li.dataset.id = station.id;
            li.dataset.status = status; 
            
            li.innerHTML = `
                <span class="station-item-name">${station.name || 'Chưa đặt tên'}</span>
                <span class="station-item-id">ID: ${station.id} | Nước: ${station.mucnuoc !== null ? station.mucnuoc + ' cm' : 'No Data'} | Nhiệt độ: ${tempDisplay}</span>
            `;
            li.addEventListener('click', () => {
                map.setView([station.lat, station.lon], 16);
                openConfigModal(station);
            });
            list.appendChild(li);
        });
    }

    async function loadStations() {
        try {
            // [FIX CACHE]: Thêm timestamp và header no-cache
            const cacheBuster = `?v=${new Date().getTime()}`;
            const res = await fetch(`${API_BASE_URL}/get-locations.php${cacheBuster}`, {
                cache: "no-store", // Bắt buộc không dùng cache
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!res.ok) {
                console.error(`Lỗi tải dữ liệu: HTTP ${res.status}`);
                return;
            }
            allStations = await res.json();
            
            if (!Array.isArray(allStations)) allStations = [];
            allStations.sort((a, b) => a.id.localeCompare(b.id));

            renderSidebar();
            renderMarkers();
            
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu trạm:', err);
        }
    }

    // --- FORM SUBMIT ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('config-id').value.trim();
        const name = document.getElementById('config-name').value.trim();
        const latLon = document.getElementById('config-lat-lon').value.trim();
        const [latStr, lonStr] = latLon.split(',').map(s => s.trim());
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        
        if (!id || !name || isNaN(lat) || isNaN(lon)) {
            alert('Vui lòng điền đầy đủ và đúng định dạng.');
            return;
        }

        try {
            const params = new URLSearchParams({ id, name, lat, lon });
            const url = `${API_BASE_URL}/save-config.php?${params.toString()}`;
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.status === 'success') {
                alert(`Lưu thành công ID: ${id}`);
                closeConfigModal();
                loadStations(); 
            } else {
                alert('Lỗi: ' + (json.message || 'Không xác định'));
            }
        } catch (err) {
            alert('Lỗi kết nối: ' + err.message);
        }
    };

    // --- INIT ---
    window.onload = function init() {
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');
        
        if (!document.getElementById('map') || !L) return;

        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        if (configForm && btnAddStation && btnCancel) { 
            btnCancel.addEventListener('click', closeConfigModal);
            btnAddStation.addEventListener('click', () => {
                openConfigModal(null);
                document.getElementById('config-id').readOnly = false;
            });
            configForm.addEventListener('submit', handleFormSubmit);
        }

        loadStations();
        setInterval(loadStations, 30000); 
    };
})();
