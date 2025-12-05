// map-handler.js (Ver 17 - Add Config Button to Sidebar)
// - Fix: Hiển thị nút ⚙️ trong danh sách trạm.

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; 
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    let configModal, configForm, btnCancel, btnAddStation; 

    // --- UTILITY FUNCTIONS ---
    // Hàm global để gọi từ popup nếu cần
    window.editStation = function(stationId) {
        const station = allStations.find(s => s.id === stationId);
        if (station) {
            openConfigModal(station);
        }
    };

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
        
        // Thêm nút Cấu hình vào Popup
        return `
            <div style="font-family: Arial, sans-serif; min-width: 180px;">
                <h3 style="margin: 0 0 5px 0; color: #007bff; font-size: 1.1em;">${station.name || 'Chưa đặt tên'}</h3>
                <p style="margin: 3px 0;"><strong>ID:</strong> ${station.id}</p>
                <p style="margin: 3px 0;"><strong>Nước:</strong> ${station.mucnuoc !== null ? station.mucnuoc + ' cm' : statusText[status]}</p>
                <p style="margin: 3px 0;"><strong>Nhiệt độ:</strong> ${tempDisplay}</p>
                <p style="margin: 3px 0; font-size: 0.85em; color: #666;">${station.last_update || 'N/A'}</p>
                <div style="text-align: right; margin-top: 8px; border-top: 1px solid #eee; padding-top: 5px;">
                    <button onclick="window.editStation('${station.id}')" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">⚙️ Cấu hình</button>
                </div>
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
            
            // Layout HTML cho item sidebar với nút sửa
            li.innerHTML = `
                <div class="station-info">
                    <span class="station-item-name">${station.name || 'Chưa đặt tên'}</span>
                    <span class="station-item-id">ID: ${station.id} | ${station.mucnuoc !== null ? station.mucnuoc + 'cm' : '--'} | ${tempDisplay}</span>
                </div>
                <button class="btn-edit-sidebar" title="Cài đặt điểm này">⚙️</button>
            `;
            
            // Sự kiện Click vào dòng -> Di chuyển map
            li.addEventListener('click', () => {
                map.setView([station.lat, station.lon], 16);
            });
            
            // Sự kiện Click nút Sửa -> Mở Modal (Ngăn không cho kích hoạt click dòng)
            const btnEdit = li.querySelector('.btn-edit-sidebar');
            btnEdit.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngừng lan truyền sự kiện để không di chuyển map
                openConfigModal(station);
            });
            
            list.appendChild(li);
        });
    }

    async function loadStations() {
        try {
            const cacheBuster = `?v=${new Date().getTime()}`;
            const res = await fetch(`${API_BASE_URL}/get-locations.php${cacheBuster}`, {
                cache: "no-store",
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
            });
            
            if (!res.ok) return;
            allStations = await res.json();
            
            if (!Array.isArray(allStations)) allStations = [];
            allStations.sort((a, b) => a.id.localeCompare(b.id));

            renderSidebar();
            renderMarkers();
            
        } catch (err) {
            console.error('Lỗi tải dữ liệu:', err);
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
