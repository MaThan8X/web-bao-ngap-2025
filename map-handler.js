// map-handler.js (Ver 16 - Sửa lỗi cứng Modal & Bỏ hiển thị Vol)
// - Sửa lỗi: Đảm bảo Modal Cấu hình hiển thị (sử dụng document.getElementById lại bên trong openConfigModal nếu biến global bị null/undefined).
// - Yêu cầu mới: Loại bỏ thông tin Điện áp (Vol) khỏi Popup và Sidebar.
// - Giữ nguyên: Chức năng Zoom/Setting (Cấu hình) và Marker động.

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    // Khai báo các biến DOM ở phạm vi ngoài để tiện truy cập
    let configModal, configForm, btnCancel, btnAddStation, btnDelete; 

    // --- UTILITY FUNCTIONS ---
    
    function getStatus(mucnuoc) {
        if (mucnuoc === null || isNaN(mucnuoc) || mucnuoc === undefined) return 'nodata';
        if (mucnuoc >= 40) return 'danger';    
        if (mucnuoc >= 20) return 'warn';      
        return 'safe';                         
    }
    
    function getStatusText(status) {
        return {
            'nodata': 'Chưa có dữ liệu',
            'safe': 'An toàn',
            'warn': 'Nguy cơ',
            'danger': 'Nguy hiểm'
        }[status] || 'Không rõ';
    }

    function getTrend() { return 'Ổn định'; }

    function createPopupContent(station) {
        const status = getStatus(station.mucnuoc);
        const statusText = getStatusText(status);

        const trendText = getTrend(station); 

        // Định dạng lại tên trạm nếu bị thiếu
        const stationName = station.name && station.name.trim() !== '' ? station.name : `Trạm ${station.id}`;
        
        return `
            <div class="popup-content">
                <h3 class="${status}">${stationName} (${station.id})</h3>
                <p><strong>Mức nước:</strong> ${station.mucnuoc === undefined || station.mucnuoc === null ? 'N/A' : station.mucnuoc + ' cm'}</p>
                <!-- Đã loại bỏ hiển thị Vol theo yêu cầu -->
                <p><strong>Trạng thái:</strong> <span class="status-label ${status}">${statusText}</span></p>
                <p><strong>Cập nhật cuối:</strong> ${station.last_update ? station.last_update : 'N/A'}</p>
                <p><strong>Xu hướng:</strong> ${trendText}</p>
                <button onclick="window.openConfigModal('${station.id}')" class="btn-config">Cấu hình</button>
            </div>
        `;
    }

    // TỐI ƯU HIỂN THỊ SIDEBAR (Bỏ Vol)
    function createStationItem(station) {
        const status = getStatus(station.mucnuoc);
        const statusText = getStatusText(status);
        const stationName = station.name && station.name.trim() !== '' ? station.name : `Trạm ${station.id} (Chưa cấu hình)`;
        const mucnuocText = station.mucnuoc === undefined || station.mucnuoc === null ? 'N/A' : `${station.mucnuoc} cm`;

        const li = document.createElement('li');
        li.classList.add('station-item', status);
        li.dataset.id = station.id;
        li.dataset.status = status; 
        li.innerHTML = `
            <div class="station-info">
                <span class="status-indicator ${status}"></span>
                <span class="station-name">${stationName}</span>
                <!-- Bỏ hiển thị Vol, chỉ giữ lại Mức nước -->
                <span class="station-id">Mức: ${mucnuocText}</span>
                <span class="station-id status-text ${status}">${statusText}</span>
            </div>
            <div class="station-actions">
                <button class="btn-zoom" title="Phóng to" onclick="window.zoomToStation('${station.id}')">🔍</button>
                <button class="btn-edit" title="Chỉnh sửa" onclick="window.openConfigModal('${station.id}')">⚙️</button>
            </div>
        `;
        return li;
    }

    // --- HANDLERS VÀ MODAL ---

    function renderSidebar(stations) {
        const list = document.getElementById('station-list');
        if (!list) return console.error("LỖI DOM: Không tìm thấy ul#station-list");
        
        // Sắp xếp theo ID (tăng dần)
        stations.sort((a, b) => a.id.localeCompare(b.id));

        list.innerHTML = '';
        stations.forEach(station => {
            list.appendChild(createStationItem(station));
        });
    }

    // Dùng cho nút Zoom trên Sidebar
    window.zoomToStation = function(id) {
        const station = allStations.find(s => s.id === id);
        if (station && map) {
            map.setView([station.lat, station.lon], 16); // Zoom đến cấp độ 16
        }
    };
    
    // Đóng Modal Cấu hình
    function closeConfigModal() {
        if (configModal) {
            configModal.style.display = 'none';
        }
        editingStationId = null;
    }
    
    // Nút Hủy trong Modal cũng gọi hàm này
    window.closeConfigModal = closeConfigModal;

    // Mở Modal Cấu hình (được gọi từ Sidebar/Popup/Nút Thêm mới)
    window.openConfigModal = function(id = null) {
        // Kiểm tra lại Modal một lần nữa, đảm bảo biến configModal không bị null
        if (!configModal) {
            configModal = document.getElementById('config-modal');
        }

        if (!configModal) {
            console.error("LỖI CỨNG DOM: Modal Cấu hình (config-modal) chưa được tìm thấy. Vui lòng kiểm tra index.html.");
            // Thay alert bằng thông báo nội bộ nếu cần
            return;
        }

        editingStationId = id;
        
        // Reset Form
        if(configForm) configForm.reset();
        
        // Cần đảm bảo các trường trong Modal tồn tại
        const configIdInput = document.getElementById('config-id');
        const configNameInput = document.getElementById('config-name');
        const configLatLonInput = document.getElementById('config-lat-lon');

        if (!configIdInput || !configNameInput || !configLatLonInput) {
             console.error("LỖI CẤU TRÚC: Thiếu các trường ID, Tên hoặc Tọa độ trong Modal.");
             return;
        }


        configIdInput.readOnly = false;
        
        if(btnDelete) btnDelete.style.display = 'none'; 
        
        // Nút Thêm Khu Vực Mới (id = null)
        if (id === null) {
            configModal.querySelector('h2').textContent = 'Thêm Khu Vực Giám Sát Mới';
        } else {
            // Nút Chỉnh sửa (id != null)
            const station = allStations.find(s => s.id === id);
            if (!station) {
                console.error(`Không tìm thấy trạm có ID: ${id}`);
                return;
            }
            
            configModal.querySelector('h2').textContent = `Cấu hình Trạm: ${id}`;
            configIdInput.value = station.id || '';
            configNameInput.value = station.name || '';
            
            // Xử lý tọa độ
            let latLonValue = '';
            if (station.lat !== undefined && station.lon !== undefined && station.lat !== null && station.lon !== null) {
                 latLonValue = `${station.lat}, ${station.lon}`;
            }
            configLatLonInput.value = latLonValue;
            
            // Khóa ID lại khi chỉnh sửa
            configIdInput.readOnly = true; 
            if(btnDelete) btnDelete.style.display = 'block';
        }
        
        // Đảm bảo Modal được set display: block (FIXED)
        configModal.style.display = 'block';
    }

    // Xử lý Gửi Form Cấu hình
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const id   = document.getElementById('config-id').value.trim();
        const name = document.getElementById('config-name').value.trim();
        const latLon = document.getElementById('config-lat-lon').value.trim().split(',').map(s => s.trim());
        
        if (latLon.length !== 2) {
            alert('Lỗi: Tọa độ phải nhập dưới dạng "vĩ độ, kinh độ".');
            return;
        }

        const lat = parseFloat(latLon[0]);
        const lon = parseFloat(latLon[1]);

        if (isNaN(lat) || isNaN(lon) || !id || !name) {
             alert('Lỗi: Thông tin ID, Tên, Vĩ độ hoặc Kinh độ không hợp lệ hoặc bị thiếu.');
             return;
        }
        
        const apiUrl = `${API_BASE_URL}/save-config.php?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&lat=${lat}&lon=${lon}`;
        
        // Thêm loading indicator
        const btnSave = document.getElementById('btn-save');
        btnSave.textContent = 'Đang lưu...';
        btnSave.disabled = true;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.status === 'success') {
                alert('Cấu hình đã được lưu thành công.');
                closeConfigModal();
                fetchDataAndRender(); // Tải lại dữ liệu sau khi lưu
            } else {
                alert(`Lỗi khi lưu cấu hình: ${data.message || 'Không rõ'}`);
            }
        } catch (error) {
            console.error('Lỗi Fetch API save-config:', error);
            alert(`Lỗi kết nối hoặc server: ${error.message}`);
        } finally {
            btnSave.textContent = 'Lưu Thay Đổi';
            btnSave.disabled = false;
        }
    }

    // Xử lý Xóa Trạm
    window.handleDeleteStation = async function() {
        const idToDelete = editingStationId;

        if (!idToDelete || !confirm(`Bạn có chắc chắn muốn XÓA trạm ${idToDelete} không? (Thao tác này chỉ xóa cấu hình trạm, dữ liệu gửi từ module SIM vẫn có thể tạo lại trạm.)`)) {
            return;
        }

        const apiUrl = `${API_BASE_URL}/save-config.php?id=${encodeURIComponent(idToDelete)}&action=delete`; 
        
        // Thêm loading indicator
        btnDelete.textContent = 'Đang xóa...';
        btnDelete.disabled = true;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.status === 'success') {
                alert(`Trạm ${idToDelete} đã được xóa thành công.`);
                closeConfigModal();
                fetchDataAndRender(); 
            } else {
                alert(`Lỗi khi xóa trạm: ${data.message || 'Không rõ'}`);
            }
        } catch (error) {
            console.error('Lỗi Fetch API delete-config:', error);
            alert(`Lỗi kết nối hoặc server: ${error.message}`);
        } finally {
            btnDelete.textContent = 'Xóa';
            btnDelete.disabled = false;
        }
    }


    // --- MAP FUNCTIONS ---

    function renderMarkers(stations) {
        markersLayer.clearLayers(); 
        
        stations.forEach(station => {
            // Bỏ qua các trạm không có tọa độ hợp lệ
            if (!station.lat || !station.lon || isNaN(station.lat) || isNaN(station.lon)) {
                return;
            }

            const status = getStatus(station.mucnuoc);
            
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-pin ${status}"></div><div class="marker-label">${station.id}</div>`,
                iconSize: [30, 42], 
                iconAnchor: [15, 42], 
                popupAnchor: [0, -40] 
            });

            const marker = L.marker([station.lat, station.lon], { icon: customIcon })
                .addTo(markersLayer)
                .bindPopup(createPopupContent(station));
            
            const listItem = document.querySelector(`.station-item[data-id="${station.id}"]`);
            if (listItem) {
                listItem.addEventListener('click', (e) => {
                    if (e.target.closest('.station-actions')) return; 
                    marker.openPopup();
                    map.setView([station.lat, station.lon], 16); 
                });
            }
        });
        
        markersLayer.addTo(map);
    }

    // --- FETCH DATA ---

    async function fetchDataAndRender() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-locations.php`);
            
            if (!response.ok) {
                 throw new Error(`Lỗi HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error("Dữ liệu nhận được không phải là một mảng.");
            }
            
            allStations = data;
            
            renderSidebar(allStations);
            renderMarkers(allStations);
            
            console.log(`Đã tải và render thành công ${allStations.length} trạm.`);
            
        } catch (error) {
            console.error("LỖI KHI TẢI DỮ LIỆU:", error);
        }
    }

    // --- KHỞI TẠO ---
    
    function initMap() {
        
        // 1. TÌM KIẾM VÀ GÁN DOM 
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');
        btnDelete = document.getElementById('btn-delete'); 
        
        // Thêm kiểm tra cứng nếu Modal không tìm thấy
        if (!configModal) {
            console.error("LỖI FATAL: Không tìm thấy #config-modal. Vui lòng kiểm tra index.html");
        }

        // --- Bắt đầu Khởi tạo Map ---
        if (!document.getElementById('map') || !L) {
            console.error("LỖI KHỞI TẠO MAP: Không tìm thấy div id='map' hoặc thư viện Leaflet.");
            return;
        }

        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // --- GÁN SỰ KIỆN ---
        if (configForm && btnAddStation && btnCancel && btnDelete) {
            
            // SỰ KIỆN CHO NÚT HỦY (Trong Modal)
            btnCancel.addEventListener('click', closeConfigModal);
            
            // SỰ KIỆN NÚT THÊM KHU VỰC MỚI (FIXED)
            btnAddStation.addEventListener('click', () => {
                window.openConfigModal(null); 
                document.getElementById('config-id').readOnly = false;
            });
            
            // SỰ KIỆN CHO NÚT XÓA (Trong Modal)
            btnDelete.addEventListener('click', window.handleDeleteStation);

            // SỰ KIỆN GỬI FORM
            configForm.addEventListener('submit', handleFormSubmit);

            // SỰ KIỆN ĐÓNG MODAL BẰNG PHÍM ESC
            window.onkeyup = function(event) {
                if (event.key === 'Escape' || event.keyCode === 27) {
                    closeConfigModal();
                }
            };
            
        } else {
             console.error("LỖỖI DOM: KHÔNG THỂ GÁN SỰ KIỆN. Các nút tương tác không được tìm thấy.");
        }

        // --- LẤY DỮ LIỆU LẦN ĐẦU VÀ TỰ ĐỘNG CẬP NHẬT ---
        fetchDataAndRender();
        setInterval(fetchDataAndRender, 60000); 
    }
    
    // Khởi tạo Map và các sự kiện khi DOM đã load hoàn toàn
    window.onload = initMap;
})();
