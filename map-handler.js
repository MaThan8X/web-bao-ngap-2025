// map-handler.js (Ver 06 - Sửa lỗi DOM Ready)
// Bọc toàn bộ code trong sự kiện 'DOMContentLoaded' để đảm bảo HTML đã tải xong
// trước khi JavaScript chạy. Đây là giải pháp triệt để cho lỗi "cannot read properties of null".

document.addEventListener('DOMContentLoaded', function() {
    
    // === CÁC BIẾN TOÀN CỤC ===
    const API_BASE_URL = '.'; // Sử dụng đường dẫn tương đối
    let map;
    let locations = []; // Mảng chứa dữ liệu các trạm từ locations.json
    let markers = {};   // Object để lưu các marker trên bản đồ, key là ID trạm

    // === LỰA CHỌN CÁC PHẦN TỬ DOM ===
    const stationListElement = document.getElementById('station-list');
    const addStationBtn = document.getElementById('add-station-btn');
    const modal = document.getElementById('config-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const configForm = document.getElementById('config-form');
    const modalTitle = document.getElementById('modal-title');
    const configNameInput = document.getElementById('config-name');
    const configIdInput = document.getElementById('config-id');
    const configLatLonInput = document.getElementById('config-lat-lon');
    const deleteBtn = document.getElementById('btn-delete');
    const saveBtn = document.getElementById('btn-save');

    let currentEditingId = null; // Biến để theo dõi trạm đang được chỉnh sửa

    // === CÁC HÀM KHỞI TẠO ===

    /**
     * Khởi tạo bản đồ Leaflet
     */
    function initMap() {
        map = L.map('map').setView([20.2533, 105.9754], 13); // Mặc định ở Ninh Bình
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
    }

    /**
     * Tải dữ liệu cấu hình các trạm từ server
     */
    async function fetchLocations() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-locations.php?_=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            locations = data;
            renderStationList();
            renderMarkers();
        } catch (error) {
            console.error("Không thể tải dữ liệu trạm:", error);
            alert("Lỗi: Không thể tải danh sách các trạm. Vui lòng kiểm tra lại đường truyền.");
        }
    }


    // === CÁC HÀM HIỂN THỊ (RENDER) ===

    /**
     * Hiển thị danh sách các trạm trong sidebar
     */
    function renderStationList() {
        stationListElement.innerHTML = '';
        if (locations.length === 0) {
            stationListElement.innerHTML = '<li class="no-stations">Chưa có trạm nào</li>';
            return;
        }
        locations.forEach(station => {
            const li = document.createElement('li');
            li.className = 'station-item';
            li.dataset.id = station.id;
            li.innerHTML = `
                <span class="station-name">${station.name}</span>
                <span class="station-id-display">ID: ${station.id}</span>
            `;

            // Bấm vào trạm trong danh sách để pan tới bản đồ
            li.addEventListener('click', () => {
                if (markers[station.id]) {
                    map.flyTo(markers[station.id].getLatLng(), 15);
                    markers[station.id].openPopup();
                }
            });

            // Thêm nút sửa
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-edit-station';
            editBtn.textContent = 'Sửa';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click của li
                openModalForEdit(station.id);
            });
            li.appendChild(editBtn);
            
            stationListElement.appendChild(li);
        });
    }

    /**
     * Hiển thị các marker trên bản đồ
     */
    function renderMarkers() {
        // Xóa các marker cũ
        Object.values(markers).forEach(marker => marker.remove());
        markers = {};

        locations.forEach(station => {
            const [lat, lon] = station.latLon.split(',').map(Number);
            
            // Xác định màu của marker dựa trên trạng thái
            let iconUrl;
            switch (station.status) {
                case 'normal':
                    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
                    break;
                case 'warning':
                    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png';
                    break;
                case 'danger':
                    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
                    break;
                default:
                    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png';
            }

            const customIcon = L.icon({
                iconUrl: iconUrl,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                shadowSize: [41, 41]
            });

            const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
            
            // Tạo nội dung popup
            const popupContent = `
                <b>${station.name}</b><br>
                <b>ID:</b> ${station.id}<br>
                <b>Mực nước:</b> ${station.waterLevel !== null ? station.waterLevel + ' cm' : 'Chưa có dữ liệu'}<br>
                <b>Trạng thái:</b> ${station.status || 'Chưa xác định'}<br>
                <em>Cập nhật lúc: ${station.lastUpdate || 'N/A'}</em>
            `;
            marker.bindPopup(popupContent);

            markers[station.id] = marker;
        });
    }

    // === CÁC HÀM XỬ LÝ MODAL ===

    /**
     * Mở modal để thêm trạm mới
     */
    function openModalForAdd() {
        currentEditingId = null;
        configForm.reset();
        modalTitle.textContent = 'Thêm Địa Điểm Mới';
        deleteBtn.style.display = 'none'; // Ẩn nút xóa khi thêm mới
        configIdInput.disabled = false; // Cho phép sửa ID khi thêm mới
        modal.style.display = 'flex';
    }
    
    /**
     * Mở modal để chỉnh sửa một trạm đã có
     * @param {string} stationId ID của trạm cần sửa
     */
    function openModalForEdit(stationId) {
        const station = locations.find(s => s.id === stationId);
        if (!station) return;

        currentEditingId = stationId;
        modalTitle.textContent = 'Chỉnh Sửa Địa Điểm';
        
        configNameInput.value = station.name;
        configIdInput.value = station.id;
        configLatLonInput.value = station.latLon;
        
        configIdInput.disabled = true; // Không cho phép sửa ID
        deleteBtn.style.display = 'inline-block'; // Hiện nút xóa khi sửa
        modal.style.display = 'flex';
    }

    /**
     * Đóng modal
     */
    function closeModal() {
        modal.style.display = 'none';
    }

    // === CÁC HÀM XỬ LÝ SỰ KIỆN ===

    /**
     * Xử lý khi form được submit (lưu/thêm mới)
     * @param {Event} event
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        const stationData = {
            name: configNameInput.value.trim(),
            id: currentEditingId || configIdInput.value.trim().toUpperCase(),
            latLon: configLatLonInput.value.trim(),
            isNew: !currentEditingId
        };

        if (!stationData.name || !stationData.id || !stationData.latLon) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/save-config.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(stationData),
            });
            const result = await response.json();

            if (result.status === 'success') {
                closeModal();
                await fetchLocations(); // Tải lại danh sách sau khi lưu
            } else {
                throw new Error(result.error || 'Lỗi không xác định');
            }
        } catch (error) {
            console.error("Lỗi khi lưu cấu hình:", error);
            alert(`Lỗi: ${error.message}`);
        }
    }

    /**
     * Xử lý khi nhấn nút xóa
     */
    async function handleDelete() {
        if (!currentEditingId) return;

        if (!confirm(`Bạn có chắc chắn muốn xóa trạm "${currentEditingId}" không?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/save-config.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: currentEditingId, delete: true }),
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                closeModal();
                await fetchLocations(); // Tải lại danh sách
            } else {
                throw new Error(result.error || 'Lỗi không xác định');
            }
        } catch (error) {
            console.error("Lỗi khi xóa trạm:", error);
            alert(`Lỗi: ${error.message}`);
        }
    }


    // === GÁN CÁC SỰ KIỆN ===
    addStationBtn.addEventListener('click', openModalForAdd);
    closeModalBtn.addEventListener('click', closeModal);
    configForm.addEventListener('submit', handleFormSubmit);
    deleteBtn.addEventListener('click', handleDelete);
    // Đóng modal khi click ra ngoài
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // === KHỞI CHẠY ỨNG DỤNG ===
    initMap();
    fetchLocations();

    // Tự động làm mới dữ liệu sau mỗi 30 giây
    setInterval(fetchLocations, 30000);
});

