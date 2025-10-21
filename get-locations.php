<?php
// get-locations.php (Ver 01 - Dự án Web Báo Ngập 2025)
// Nhiệm vụ: Đọc và trả về toàn bộ nội dung của file locations.json.
// File này chỉ chứa trạng thái MỚI NHẤT của mỗi trạm.
// Nó thay thế cho get-data.php nặng nề ở hệ thống cũ.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // Cho phép CORS nếu cần

$dataFile = __DIR__ . '/locations.json';

// Kiểm tra sự tồn tại của file và trả về nội dung
if (file_exists($dataFile)) {
    // Đọc toàn bộ nội dung file locations.json
    $jsonContent = file_get_contents($dataFile);
    
    // Trả về nội dung JSON
    echo $jsonContent;
} else {
    // Trường hợp file chưa tồn tại, trả về mảng rỗng
    http_response_code(200);
    echo json_encode([]);
}

?>
