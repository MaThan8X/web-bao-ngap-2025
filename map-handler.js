// map-handler.js (Ver 01 - Map Logic & API Handler)
// - Khởi tạo Bản đồ Leaflet.
// - Xử lý hiển thị danh sách trạm và marker.
// - Xử lý Modal/Form cấu hình trạm.

const API_BASE_URL = window.location.origin; // Tự động lấy host hiện tại
const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
const DEFAULT_ZOOM = 12;

let map;
let markersLayer = L.layerGroup(); // Layer chứa tất cả các marker
let allStations = []; // Mảng lưu trữ dữ liệu trạng thái và cấu hình
let editingStationId = null; // ID của trạm đang được chỉnh sửa

// --- UTILITY FUNCTIONS ---

/**
 * Xác định trạng thái ngập dựa trên mực nước (cm)
 * @param {number} mucnuoc 
 * @returns {string} 'safe', 'warn', 'danger', 'nodata'
 */
function getStatus(mucnuoc) {
    if (mucnuoc === null || isNaN(mucnuoc)) return 'nodata';
    if (mucnuoc >= 40) return 'danger';    // Đỏ: >= 40cm
    if (mucnuoc >= 20) return 'warn';      // Vàng: 20cm đến < 40cm
    return 'safe';                         // Xanh: < 20cm
}

/**
 * Xác định diễn biến (Tăng/Giảm)
 * LƯU Ý: Chức năng này đòi hỏi dữ liệu lịch sử (5 lần đo) 
 * mà API hiện tại KHÔNG CUNG CẤP. Ở đây chỉ là placeholder.
 * Cần nâng cấp API get-locations.php sau này.
 * @returns {string} 'Ổn định', 'Đang tăng', 'Đang giảm'
 */
function getTrend(history) {
    // Tạm thời luôn trả về Ổn định, cần nâng cấp backend để có dữ liệu lịch sử
    return 'Ổn định';
}

/**
 * Mở Modal cấu hình trạm
 * @param {object | null} station - Dữ liệu trạm nếu đang chỉnh sửa, null nếu thêm mới
 */
function openConfigModal(station = null) {
    const modal = document.getElementById('config-modal');
    const form = document.getElementById('config-form');
    
    // Đặt ID đang chỉnh sửa
    editingStationId = station ? station.id : null;
    
    document.getElementById('config-name').value = station?.name || '';
    document.getElementById('config-id').value = station?.id || '';
    document.getElementById('config-lat-lon').value = station ? `${station.lat}, ${station.lon}` : '';
    
    // Nếu đang sửa (station !== null), không cho sửa ID
    document.getElementById('config-id').readOnly = !!station;
    document.getElementById('config-id').placeholder = station ? '' : 'ID Duy nhất (VD: F01234)';
    
    // Đổi tiêu đề
    modal.querySelector('h2').textContent = station ? `Sửa Cấu Hình: ${station.name}` : 'Thêm Khu Vực Mới';
    
    modal.style.display = 'flex';
}

/**
 * Đóng Modal cấu hình trạm
 */
function closeConfigModal() {
    document.getElementById('config-modal').style.display = 'none';
    document.getElementById('config-form').reset();
    editingStationId = null;
}

// --- RENDERING & MAP LOGIC ---

/**
 * Tạo nội dung Popup khi di chuyển chuột vào Marker
 */
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

/**
 * Render các Marker lên bản đồ
 */
function renderMarkers() {
    markersLayer.clearLayers();
    
    allStations.forEach(station => {
        if (station.lat && station.lon) {
            const status = getStatus(station.mucnuoc);
            
            // 1. Tạo Custom Icon (Marker hình tròn)
            const iconHTML = `<div class="water-marker water-marker-${status}"></div>`;
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: iconHTML,
                iconSize: [25, 25], // Kích thước của div.water-marker
                iconAnchor: [15, 15] // Căn giữa
            });
            
            // 2. Tạo Marker
            const marker = L.marker([station.lat, station.lon], { icon: customIcon });
            
            // 3. Gắn Popup (hiển thị khi di chuyển chuột - mouseover)
            const popupContent = createPopupContent(station);
            marker.bindPopup(popupContent, {
                closeButton: false, 
                offset: L.point(0, -10)
            });
            
            // Xử lý sự kiện di chuyển chuột vào/ra
            marker.on('mouseover', function(e) {
                this.openPopup();
            });
            marker.on('mouseout', function(e) {
                // Đóng popup sau một khoảng trễ nhỏ để tránh nháy
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

/**
 * Render danh sách trạm ra Sidebar
 */
function renderSidebar() {
    const list = document.getElementById('station-list');
    list.innerHTML = '';
    
    allStations.forEach(station => {
        const status = getStatus(station.mucnuoc);
        const li = document.createElement('li');
        li.className = `station-item station-item-${status}`;
        li.dataset.id = station.id;
        li.dataset.lat = station.lat;
        li.dataset.lon = station.lon;
        
        li.innerHTML = `
            <span class="station-item-name">${station.name || 'Chưa đặt tên'}</span>
            <span class="station-item-id">ID: ${station.id} | ${station.mucnuoc !== null ? station.mucnuoc + ' cm' : 'No Data'}</span>
        `;
        
        // Sự kiện click sidebar: zoom bản đồ và mở Modal cấu hình
        li.addEventListener('click', () => {
            // Zoom tới vị trí trạm
            map.setView([station.lat, station.lon], 16);
            // Mở modal cấu hình
            openConfigModal(station);
        });
        
        list.appendChild(li);
    });
}

/**
 * Hàm chính để fetch dữ liệu, render sidebar và marker
 */
async function loadStations() {
    try {
        const res = await fetch(`${API_BASE_URL}/bao-ngap-2025/get-locations.php`);
        allStations = await res.json();
        
        // Sort theo ID để dễ quản lý
        allStations.sort((a, b) => a.id.localeCompare(b.id));

        renderSidebar();
        renderMarkers();
        
        // Thiết lập tâm bản đồ lần đầu tiên
        if (allStations.length > 0) {
            // Tâm Bản đồ sẽ là nơi có tọa độ của Khu Vực 1 (phần tử đầu tiên)
            const khuVuc1 = allStations[0]; 
            map.setView([khuVuc1.lat, khuVuc1.lon], DEFAULT_ZOOM);
        }
        
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu trạm:', err);
    }
}

// --- FORM HANDLING ---

document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('config-id').value.trim();
    const name = document.getElementById('config-name').value.trim();
    const latLon = document.getElementById('config-lat-lon').value.trim();
    
    // Tách lat, lon
    const [latStr, lonStr] = latLon.split(',').map(s => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    
    if (!id || !name || isNaN(lat) || isNaN(lon)) {
        alert('Vui lòng điền đầy đủ và đúng định dạng các trường.');
        return;
    }

    try {
        const params = new URLSearchParams({ id, name, lat, lon });
        const url = `${API_BASE_URL}/bao-ngap-2025/save-config.php?${params.toString()}`;
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status === 'success') {
            alert(`Lưu cấu hình thành công cho ID: ${id}`);
            closeConfigModal();
            // Tải lại dữ liệu và render
            loadStations(); 
        } else {
            alert('Lỗi khi lưu cấu hình: ' + (json.message || 'Không xác định'));
        }
        
    } catch (err) {
        console.error('Lỗi khi gửi cấu hình:', err);
        alert('Không thể kết nối đến server để lưu cấu hình.');
    }
});

document.getElementById('btn-cancel').addEventListener('click', closeConfigModal);

document.getElementById('add-station-btn').addEventListener('click', () => {
    // Mở Modal để thêm trạm mới
    openConfigModal(null);
    // Cho phép sửa ID khi thêm mới
    document.getElementById('config-id').readOnly = false;
});


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo Bản đồ (Google Maps/vntraffic.app thường dùng nền OpenStreetMap)
    map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    // Thêm Tile Layer (OpenStreetMap)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Tải dữ liệu trạm lần đầu
    loadStations();
    
    // Tự động làm mới dữ liệu sau mỗi 30 giây (Giả lập cập nhật)
    setInterval(loadStations, 30000); 
});
