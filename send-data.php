<?php
// send-data.php (Ver 04 - Fix Update Logic & Parse String A7600)
// Nhận chuỗi: ?id=F01790;date=15/05/2025;time=16:25;mucnuoc=10;vol=125;
// Cập nhật locations.json chính xác.

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Ho_Chi_Minh');

$dataFile = __DIR__ . '/locations.json';

// --- HÀM MÔ PHỎNG NHIỆT ĐỘ ---
function getRealTimeTemperature($lat, $lon) {
    // Mô phỏng nhiệt độ miền Bắc (20-35 độ C)
    // Dùng lat/lon để tạo sự khác biệt nhỏ giữa các trạm
    $baseTemp = 28; 
    $noise = (($lat + $lon) * 100) % 5; 
    $temp = $baseTemp + ($noise * 0.5) - 1.5;
    return round($temp, 1);
}

// --- 1. PHÂN TÍCH DỮ LIỆU TỪ THIẾT BỊ ---
$queryString = $_SERVER['QUERY_STRING'] ?? '';
$data = [];

// Xử lý chuỗi query A7600 (phân tách bằng ;)
if (strpos($queryString, ';') !== false) {
    $pairs = explode(';', $queryString);
    foreach ($pairs as $pair) {
        $pair = trim($pair);
        if (strpos($pair, '=') !== false) {
            list($key, $value) = explode('=', $pair, 2);
            $data[trim($key)] = trim($value);
        }
    }
} else {
    // Fallback: Xử lý chuỗi tiêu chuẩn (&) nếu thiết bị gửi đúng chuẩn
    $data = $_GET;
}

// Lấy dữ liệu
$id = isset($data['id']) ? trim($data['id']) : '';
$mucnuoc = isset($data['mucnuoc']) ? filter_var($data['mucnuoc'], FILTER_VALIDATE_INT) : null;
$vol = isset($data['vol']) ? filter_var($data['vol'], FILTER_VALIDATE_FLOAT) : null;
$received_date = $data['date'] ?? null;
$received_time = $data['time'] ?? null;

// --- 2. KIỂM TRA ĐIỀU KIỆN ---
if (!$id) {
    http_response_code(400); 
    echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
    exit;
}

// --- 3. ĐỌC DỮ LIỆU CŨ ---
$locations = [];
if (file_exists($dataFile)) {
    $jsonContent = @file_get_contents($dataFile);
    $locations = json_decode($jsonContent, true);
    if (!is_array($locations)) $locations = [];
}

// --- 4. CẬP NHẬT TRẠM ---
$found = false;
foreach ($locations as &$station) {
    if (isset($station['id']) && $station['id'] === $id) {
        
        // Cập nhật giá trị đo
        if ($mucnuoc !== null) $station['mucnuoc'] = $mucnuoc;
        if ($vol !== null) $station['vol'] = $vol;
        
        // Cập nhật Nhiệt độ (Mô phỏng)
        $lat = $station['lat'] ?? 0;
        $lon = $station['lon'] ?? 0;
        $station['temp'] = getRealTimeTemperature($lat, $lon);
        
        // Cập nhật Thời gian
        if ($received_date && $received_time) {
            // Chuyển format DD/MM/YYYY -> YYYY-MM-DD
            $dParts = explode('/', $received_date);
            if (count($dParts) === 3) {
                $station['last_update'] = "{$dParts[2]}-{$dParts[1]}-{$dParts[0]} {$received_time}:00";
            } else {
                $station['last_update'] = date('Y-m-d H:i:s');
            }
        } else {
            $station['last_update'] = date('Y-m-d H:i:s');
        }
        
        $found = true;
        break; // Dừng vòng lặp khi tìm thấy
    }
}
unset($station); // Ngắt tham chiếu

// --- 5. XỬ LÝ KHI KHÔNG TÌM THẤY ID ---
if (!$found) {
    // Tùy chọn: Có thể tự động tạo trạm mới nếu muốn, hoặc báo lỗi.
    // Ở đây ta báo lỗi để đảm bảo chỉ cập nhật trạm đã cấu hình.
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Station ID not found: ' . $id]);
    exit;
}

// --- 6. GHI FILE ---
$json_flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
if (defined('JSON_NUMERIC_CHECK')) $json_flags |= JSON_NUMERIC_CHECK;

if (@file_put_contents($dataFile, json_encode($locations, $json_flags))) {
    echo json_encode(['status' => 'success', 'message' => 'Updated ID: ' . $id]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Write failed']);
}
