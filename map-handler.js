// map-handler.js (Ver 13 - Fix lỗi Modal Cấu hình không hiển thị & Tối ưu Marker)
// - Sửa lỗi: Đảm bảo Modal Cấu hình được hiển thị (display='block') khi gọi openConfigModal(null) (khắc phục lỗi nút "Thêm Khu Vực Mới").
// - Bổ sung: Thêm window.closeConfigModal để nút Hủy trong Modal hoạt động.
// - Cải tiến: Thêm xử lý để bỏ qua các trạm thiếu tọa độ khi render Marker (khắc phục lỗi mất Điểm tròn động nếu dữ liệu sai).

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
            'warn': 'Nguy cơ',
            'danger': 'Nguy hiểm'
        }[status];

        const trendText = getTrend(station); 

        // Định dạng lại tên trạm nếu bị thiếu
        const stationName = station.name && station.name.trim() !== '' ? station.name : `Trạm ${station.id}`;
        
        // Dùng window.openConfigModal vì nó được khai báo global (trong IIFE này)
        return `
            <div class="popup-content">
                <h3 class="${status}">${stationName} (${station.id})</h3>
                <p><strong>Mức nước:</strong> ${station.mucnuoc} cm</p>
                <p><strong>Điện áp:</strong> ${station.vol} V</p>
                <p><strong>Trạng thái:</strong> <span class="status-label ${status}">${statusText}</span></p>
                <p><strong>Cập nhật cuối:</strong> ${station.last_update ? station.last_update : 'N/A'}</p>
                <p><strong>Xu hướng:</strong> ${trendText}</p>
                <button onclick="window.openConfigModal('${station.id}')" class="btn-config">Cấu hình</button>
            </div>
        `;
    }

    function createStationItem(station) {
        const status = getStatus(station.mucnuoc);
        const stationName = station.name && station.name.trim() !== '' ? station.name : `Trạm ${station.id} (Chưa cấu hình)`;

        const li = document.createElement('li');
        li.classList.add('station-item', status);
        li.dataset.id = station.id;
        li.dataset.status = status; 
        li.innerHTML = `
            <div class="station-info">
                <span class="status-indicator ${status}"></span>
                <span class="station-name">${stationName}</span>
                <span class="station-id">ID: ${station.id}</span>
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
    
    // Nút Hủy trong Modal cũng gọi hàm này (Đã bổ sung vào window)
    window.closeConfigModal = closeConfigModal;

    // Mở Modal Cấu hình (được gọi từ Sidebar/Popup/Nút Thêm mới)
    window.openConfigModal = function(id = null) {
        editingStationId = id;
        
        // Reset Form
        configForm.reset();
        document.getElementById('config-id').readOnly = false;
        
        // Lấy lại nút delete (cần đảm bảo nó được gán DOM ở initMap)
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
            document.getElementById('config-id').value = station.id || '';
            document.getElementById('config-name').value = station.name || '';
            
            // Xử lý tọa độ: Nếu lat/lon có sẵn, hiển thị nó
            let latLonValue = '';
            if (station.lat && station.lon) {
                 latLonValue = `${station.lat}, ${station.lon}`;
            } else if (station.lat) {
                 latLonValue = `${station.lat}, `; // Chỉ có Lat
            } else if (station.lon) {
                 latLonValue = ` , ${station.lon}`; // Chỉ có Lon
            }
            document.getElementById('config-lat-lon').value = latLonValue;
            
            // Khóa ID lại khi chỉnh sửa
            document.getElementById('config-id').readOnly = true; 
            if(btnDelete) btnDelete.style.display = 'block';
        }
        
        // Fix lỗi: Đảm bảo Modal được set display: block (nếu DOM tồn tại)
        if (configModal) {
            configModal.style.display = 'block';
        } else {
            console.error("LỖI KHÔNG TÌM THẤY: configModal");
        }
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

        if (isNaN(lat) || isNaN(lon)) {
             alert('Lỗi: Vĩ độ hoặc Kinh độ không hợp lệ.');
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

        // Action 'delete' được xử lý trong save-config.php (Ver 03)
        // Lưu ý: Gửi action delete để server xử lý
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
                fetchDataAndRender(); // Tải lại dữ liệu sau khi xóa
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

    // Xử lý Render Markers lên bản đồ
    function renderMarkers(stations) {
        markersLayer.clearLayers(); // Xóa các marker cũ
        
        stations.forEach(station => {
            // Bỏ qua các trạm không có tọa độ hợp lệ (Khắc phục lỗi mất Điểm tròn động)
            if (!station.lat || !station.lon || isNaN(station.lat) || isNaN(station.lon)) {
                console.warn(`Bỏ qua trạm ${station.id} vì thiếu hoặc sai tọa độ.`);
                return;
            }

            const status = getStatus(station.mucnuoc);
            
            // Định nghĩa icon (CSS đã được cập nhật để tạo hiệu ứng động)
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-pin ${status}"></div><div class="marker-label">${station.id}</div>`,
                iconSize: [30, 42], 
                iconAnchor: [15, 42], 
                popupAnchor: [0, -40] 
            });

            // Tạo marker
            const marker = L.marker([station.lat, station.lon], { icon: customIcon })
                .addTo(markersLayer)
                .bindPopup(createPopupContent(station));
            
            // Xử lý sự kiện click trên Sidebar để mở Popup của Marker
            const listItem = document.querySelector(`.station-item[data-id="${station.id}"]`);
            if (listItem) {
                listItem.addEventListener('click', (e) => {
                    // Ngăn chặn sự kiện click lan truyền từ các nút bên trong (Zoom/Edit)
                    if (e.target.closest('.station-actions')) return; 
                    marker.openPopup();
                    map.setView([station.lat, station.lon], 16); // Đồng thời zoom vào
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
            
            // 1. Render Sidebar (Giao diện đã được làm đẹp trong styles.css Ver 05)
            renderSidebar(allStations);
            
            // 2. Render Markers (Hiệu ứng điểm tròn động đã được thêm trong styles.css Ver 05)
            renderMarkers(allStations);
            
            console.log(`Đã tải và render thành công ${allStations.length} trạm.`);
            
        } catch (error) {
            console.error("LỖI KHI TẢI DỮ LIỆU:", error);
            // Có thể hiển thị thông báo lỗi lên giao diện
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
            
            // SỰ KIỆN NÚT THÊM KHU VỰC MỚI (Fix lỗi)
            btnAddStation.addEventListener('click', () => {
                window.openConfigModal(null); // Gọi hàm mở modal ở chế độ thêm mới
                document.getElementById('config-id').readOnly = false;
            });
            
            // SỰ KIỆN CHO NÚT XÓA (Trong Modal)
            btnDelete.addEventListener('click', window.handleDeleteStation);

            // SỰ KIỆN GỬI FORM
            configForm.addEventListener('submit', handleFormSubmit);
            
        } else {
             // Debug log chi tiết hơn để kiểm tra DOM
             console.error("LỖI DOM: Các nút tương tác (Modal/Sidebar) không được tìm thấy.");
             console.log({ configForm, btnAddStation, btnCancel, btnDelete });
        }

        // --- LẤY DỮ LIỆU LẦN ĐẦU VÀ TỰ ĐỘNG CẬP NHẬT ---
        fetchDataAndRender();
        // Cập nhật sau mỗi 60 giây
        setInterval(fetchDataAndRender, 60000); 
    }
    
    // Khởi tạo Map và các sự kiện khi DOM đã load hoàn toàn
    window.onload = initMap;
})();
