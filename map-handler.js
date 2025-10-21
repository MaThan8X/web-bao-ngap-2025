// map-handler.js (Ver 03 - Chuẩn hóa Chú thích Phiên bản)
// - Sửa lỗi đường dẫn API, bỏ đi phần "/bao-ngap-2025/" không cần thiết.
// - Thêm cơ chế xử lý lỗi tốt hơn để hiển thị thông báo trên console.

// --- CÁC HÀM VÀ BIẾN KHÁC GIỮ NGUYÊN ---
const API_BASE_URL = window.location.origin; // Tự động lấy host hiện tại, ví dụ: http://canhbaongap2025.atwebpages.com
const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
const DEFAULT_ZOOM = 12;

let map;
let markersLayer = L.layerGroup();
let allStations = [];
let editingStationId = null;

/**
 * Xác định trạng thái ngập dựa trên mực nước (cm)
 */
function getStatus(mucnuoc) {
    if (mucnuoc === null || mucnuoc === undefined || isNaN(mucnuoc)) return 'nodata';
    if (mucnuoc >= 40) return 'danger';
    if (mucnuoc >= 20) return 'warn';
    return 'safe';
}

/**
 * Placeholder cho chức năng diễn biến
 */
function getTrend(history) {
    return 'Ổn định';
}

/**
 * Mở Modal cấu hình trạm
 */
function openConfigModal(station = null) {
    const modal = document.getElementById('config-modal');
    const form = document.getElementById('config-form');
    
    editingStationId = station ? station.id : null;
    
    document.getElementById('config-name').value = station?.name || '';
    document.getElementById('config-id').value = station?.id || '';
    document.getElementById('config-lat-lon').value = station ? `${station.lat}, ${station.lon}` : '';
    
    const idInput = document.getElementById('config-id');
    idInput.readOnly = !!station;
    idInput.style.backgroundColor = !!station ? '#e9ecef' : '#fff';

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
            <p style="margin: 0 0 5px 0;"><strong>Mực nước:</strong> ${station.mucnuoc !== null && station.mucnuoc !== undefined ? station.mucnuoc + ' cm' : statusText[status]}</p>
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
            
            const iconHTML = `<div class="water-marker water-marker-${status}"></div>`;
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: iconHTML,
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            });
            
            const marker = L.marker([station.lat, station.lon], { icon: customIcon });
            
            const popupContent = createPopupContent(station);
            marker.bindPopup(popupContent, {
                closeButton: false, 
                offset: L.point(0, -10)
            });
            
            marker.on('mouseover', function() { this.openPopup(); });
            marker.on('mouseout', function() { this.closePopup(); });
            
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
        
        li.innerHTML = `
            <span class="station-item-name">${station.name || 'Chưa đặt tên'}</span>
            <span class="station-item-id">ID: ${station.id} | ${station.mucnuoc !== null && station.mucnuoc !== undefined ? station.mucnuoc + ' cm' : 'No Data'}</span>
        `;
        
        li.addEventListener('click', () => {
            if(station.lat && station.lon){
                 map.setView([station.lat, station.lon], 16);
            }
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
        // === SỬA LỖI TẠI ĐÂY ===
        // Đường dẫn bây giờ chỉ cần là tên file, vì nó nằm cùng cấp với trang web
        const apiUrl = `get-locations.php`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        // Xử lý trường hợp API trả về không phải mảng
        allStations = Array.isArray(data) ? data : [];
        
        allStations.sort((a, b) => a.id.localeCompare(b.id));

        renderSidebar();
        renderMarkers();
        
    } catch (err) {
        console.error('Lỗi nghiêm trọng khi tải dữ liệu trạm:', err);
        // Có thể thêm thông báo cho người dùng ở đây
    }
}

/**
 * Xử lý sự kiện submit form
 */
async function handleFormSubmit(e) {
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
        const url = `save-config.php?${params.toString()}`;
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status === 'success') {
            alert(`Lưu cấu hình thành công cho ID: ${id}`);
            closeConfigModal();
            loadStations(); 
        } else {
            alert('Lỗi khi lưu cấu hình: ' + (json.message || 'Không xác định'));
        }
        
    } catch (err) {
        console.error('Lỗi khi gửi cấu hình:', err);
        alert('Không thể kết nối đến server để lưu cấu hình.');
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Gắn các sự kiện
    document.getElementById('config-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-cancel').addEventListener('click', closeConfigModal);
    document.getElementById('add-station-btn').addEventListener('click', () => openConfigModal(null));
    
    // Tải dữ liệu lần đầu
    loadStations();
    
    // Tự động làm mới dữ liệu sau mỗi 30 giây
    setInterval(loadStations, 30000); 
});

