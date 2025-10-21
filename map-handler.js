// map-handler.js  (Ver 12 - Fix Sidebar Logic & Animation)

có thấy cod

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    // Các biến DOM sẽ được gán trong init()
    let configModal, configForm, btnCancel, btnAddStation; 

    // --- UTILITY FUNCTIONS ---
    
    function getStatus(mucnuoc) {
        if (mucnuoc === null || isNaN(mucnuoc)) return 'nodata';
        if (mucnuoc >= 40) return 'danger';    
        if (mucnuoc >= 20) return 'warn';      
        return 'safe';                         
    }

    function getTrend() {
        return 'Ổn định'; // Giữ nguyên, cần dữ liệu lịch sử để tính
    }

    function createPopupContent(station) {
        const status = getStatus(station.mucnuoc);
        const statusText = {
            'nodata': 'Chưa có dữ liệu',
            'safe': 'An toàn',
            'warn': 'Cảnh báo ngập',
            'danger': 'Nguy hiểm ngập'
        };
        
        return `
            <div style="font-family: Arial, sans-serif; min-width: 150px;">
                <p style="margin: 0 0 5px 0;"><strong>Địa điểm:</strong> ${station.name || 'Chưa đặt tên'}</p>
                <p style="margin: 0 0 5px 0;"><strong>ID Thiết bị:</strong> ${station.id}</p>
                <p style="margin: 0 0 5px 0;"><strong>Mực nước:</strong> ${station.mucnuoc !== null ? station.mucnuoc + ' cm' : statusText[status]}</p>
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


    // --- RENDERING & MAP LOGIC ---
    
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
                
                // Mở popup khi click vào marker
                marker.on('click', function(e) {
                    this.openPopup();
                    openConfigModal(station); // Mở Modal khi click vào marker
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
            
            // Sử dụng button thay vì li để thống nhất style với #add-station-btn
            const btn = document.createElement('button');
            btn.className = `station-item`;
            btn.dataset.id = station.id;
            btn.dataset.status = status; // Dùng cho CSS
            
            btn.innerHTML = `
                <span class="station-item-name">${station.name || 'Chưa đặt tên'}</span>
                <span class="station-item-id">ID: ${station.id} | ${station.mucnuoc !== null ? station.mucnuoc + ' cm' : 'No Data'}</span>
            `;
            
            btn.addEventListener('click', () => {
                map.setView([station.lat, station.lon], 16);
                openConfigModal(station);
            });
            
            list.appendChild(btn);
        });
    }

    async function loadStations() {
        try {
            const res = await fetch(`${API_BASE_URL}/get-locations.php`);
            // Kiểm tra nếu API trả về lỗi hoặc JSON rỗng/không hợp lệ
            if (!res.ok) {
                console.error("Lỗi khi fetch dữ liệu trạm:", res.statusText);
                return;
            }
            allStations = await res.json();
            
            // Nếu JSON không phải mảng, đặt lại là mảng rỗng
            if (!Array.isArray(allStations)) allStations = []; 
            
            allStations.sort((a, b) => a.id.localeCompare(b.id));

            renderSidebar();
            renderMarkers();
            
            let center = DEFAULT_CENTER;
            let zoom = DEFAULT_ZOOM;
            
            if (allStations.length > 0) {
                const khuVuc1 = allStations.find(s => s.lat && s.lon); 
                if (khuVuc1) {
                    center = [khuVuc1.lat, khuVuc1.lon];
                    zoom = 16; 
                }
            }
            map.setView(center, zoom); 
            
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu trạm:', err);
        }
    }

    // --- FORM HANDLING ---

    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('config-id').value.trim();
        const name = document.getElementById('config-name').value.trim();
        const latLon = document.getElementById('config-lat-lon').value.trim();
        
        const [latStr, lonStr] = latLon.split(',').map(s => s.trim());
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        
        if (!id || !name || isNaN(lat) || isNaN(lon)) {
            alert('Vui lòng điền đầy đủ và đúng định dạng các trường.');
            return;
        }

        try {
            const params = new URLSearchParams({ id, name, lat, lon });
            const url = `${API_BASE_URL}/save-config.php?${params.toString()}`;
            
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.status === 'success') {
                alert(`Lưu cấu hình thành công cho ID: ${id}`);
                closeConfigModal();
                loadStations(); 
            } else {
                // [FIX LỖI LƯU] Báo cáo lỗi cụ thể từ PHP
                alert('Lỗi khi lưu cấu hình: ' + (json.message || 'Không xác định'));
            }
            
        } catch (err) {
            console.error('Lỗi khi gửi cấu hình:', err);
            alert('Không thể kết nối đến server để lưu cấu hình. (Kiểm tra quyền ghi file 777)');
        }
    });

    // --- KHỐI KHỞI TẠO CHÍNH (Chạy sau khi trang tải xong) ---
    window.onload = function init() {
        
        // 1. TÌM KIẾM VÀ GÁN DOM CHẮC CHẮN
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');
        
        // 2. KHỞI TẠO MAP
        if (!document.getElementById('map') || !L) {
            console.error("LỖI KHỞI TẠO MAP: Không tìm thấy div id='map' hoặc thư viện Leaflet.");
            return;
        }

        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 3. GÁN SỰ KIỆN (Bây giờ chắc chắn rằng các phần tử đã được gán giá trị)
        if (btnAddStation) { 
            configModal.querySelector('.modal-overlay').addEventListener('click', (e) => {
                if (e.target === configModal) closeConfigModal();
            });

            btnCancel.addEventListener('click', closeConfigModal);
            
            btnAddStation.addEventListener('click', () => {
                openConfigModal(null);
                document.getElementById('config-id').readOnly = false;
            });
        } else {
             console.error("LỖI: Nút Thêm Khu Vực Mới (#add-station-btn) bị thiếu.");
        }
        

        // 4. TẢI DỮ LIỆU LẦN ĐẦU
        loadStations();
        setInterval(loadStations, 30000); 
    };

})();
