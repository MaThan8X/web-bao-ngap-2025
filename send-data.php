<?php
// send-data.php (Ver 03 - Hỗ trợ chuỗi query A7600 và Tích hợp Nhiệt độ Mô phỏng)
// Nhận chuỗi: ?id=F01790;date=15/05/2025;time=16:25;mucnuoc=10;vol=125;
// Tự lấy nhiệt độ (temp) bằng cách mô phỏng.

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Ho_Chi_Minh');

// Đường dẫn tới file lưu trữ trạng thái cấu hình
$dataFile = __DIR__ . '/locations.json';

// --- HÀM 1: LẤY NHIỆT ĐỘ THỰC TẾ (MÔ PHỎNG) ---
// *******************************************************************
// CHÚ Ý: CHỦ NHÂN CẦN THAY THẾ HÀM NÀY BẰNG API CALL THỰC TẾ (VD: OpenWeatherMap)
// Sau khi có API Key, Chủ nhân hãy thay thế bằng cURL hoặc file_get_contents 
// để gọi đến API thời tiết sử dụng $lat và $lon.
// *******************************************************************
function getRealTimeTemperature($lat, $lon) {
    // Mô phỏng nhiệt độ thực tế của miền Bắc Việt Nam (25-35 độ C)
    // Sử dụng tọa độ để tạo độ ngẫu nhiên nhỏ (tính năng phụ)
    $baseTemp = 28; // Nhiệt độ cơ bản (Celsius)
    $noise = (($lat + $lon) * 100) % 5; // Độ ngẫu nhiên nhỏ dựa trên tọa độ
    $temp = $baseTemp + 0.5 + ($noise * 0.5) - 2;
    return round($temp, 1);
}

// --- 2. Lấy và Phân tích dữ liệu từ thiết bị (Chuỗi không tiêu chuẩn) ---
$queryString = $_SERVER['QUERY_STRING'] ?? '';
$data = [];

// Phân tích chuỗi query bằng dấu chấm phẩy (;)
$pairs = explode(';', $queryString);
foreach ($pairs as $pair) {
    $pair = trim($pair);
    if (strpos($pair, '=') !== false) {
        list($key, $value) = explode('=', $pair, 2);
        $data[trim($key)] = trim($value);
    }
}

// Lọc và chuẩn hóa dữ liệu
$id      = $data['id'] ?? '';
$mucnuoc = filter_var($data['mucnuoc'] ?? null, FILTER_VALIDATE_INT);
$vol     = filter_var($data['vol'] ?? null, FILTER_VALIDATE_FLOAT);
$received_date = $data['date'] ?? null;
$received_time = $data['time'] ?? null;

// --- 3. Kiểm tra điều kiện bắt buộc ---
if (!$id) {
    http_response_code(400); 
    echo json_encode(['status' => 'error', 'message' => 'Missing required parameter: id']);
    exit;
}

if ($mucnuoc === null && $vol === null) {
    http_response_code(400); 
    echo json_encode(['status' => 'error', 'message' => 'Missing measurement data (mucnuoc or vol)']);
    exit;
}

// --- 4. Đọc và giải mã dữ liệu hiện có (locations.json) ---
$locations = [];
$stationIndex = -1;

if (file_exists($dataFile)) {
    $jsonContent = file_get_contents($dataFile);
    $locations = json_decode($jsonContent, true);
    if (!is_array($locations)) {
        $locations = [];
    }
}

// --- 5. Tìm và cập nhật trạng thái của trạm ---
foreach ($locations as $index => &$station) {
    if (($station['id'] ?? '') === $id) {
        $stationIndex = $index;
        
        // Lấy tọa độ để tính nhiệt độ
        $lat = $station['lat'] ?? 0; 
        $lon = $station['lon'] ?? 0;
        
        // Cập nhật Mực nước và Điện áp
        if ($mucnuoc !== null) {
            $station['mucnuoc'] = (int)$mucnuoc;
        }
        if ($vol !== null) {
            $station['vol'] = (float)$vol;
        }
        
        // LẤY VÀ CẬP NHẬT NHIỆT ĐỘ TỪ MÔ PHỎNG
        $station['temp'] = getRealTimeTemperature($lat, $lon); 
        
        // Cập nhật thời gian nhận
        if ($received_date && $received_time) {
            $date_parts = explode('/', $received_date);
            if (count($date_parts) === 3) {
                $formatted_date = "{$date_parts[2]}-{$date_parts[1]}-{$date_parts[0]}";
                $station['last_update'] = $formatted_date . ' ' . $received_time . ':00';
            } else {
                 $station['last_update'] = date('Y-m-d H:i:s');
            }
        } else {
            $station['last_update'] = date('Y-m-d H:i:s');
        }
        
        break;
    }
}
unset($station); 

// --- 6. Xử lý khi ID không tồn tại trong cấu hình ---
if ($stationIndex === -1) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Station ID not found in configuration: ' . $id]);
    exit;
}

// --- 7. Ghi dữ liệu đã cập nhật vào file (Cần CHMOD 777) ---
$json_flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
if (defined('JSON_NUMERIC_CHECK')) {
    $json_flags |= JSON_NUMERIC_CHECK;
}

if (false !== @file_put_contents($dataFile, json_encode($locations, $json_flags))) {
    echo json_encode(['status' => 'success', 'message' => 'Data updated for id: ' . $id]);
} else {
    http_response_code(500); 
    $error = error_get_last()['message'] ?? 'Failed to write data. Check file permissions (chmod 777).';
    echo json_encode(['status' => 'error', 'message' => 'Failed to write data: ' . $error]);
}
