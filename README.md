# CoffeeRow Lab — Nghiên cứu cà phê theo hàng tại Việt Nam

Website nghiên cứu tương tác, tiếng Việt, xây dựng trên WIN11-181 (29/10/2026).

## Mục tiêu
Giải thích khác biệt giữa bố trí cây theo hàng và tính khả thi của cơ giới hóa trong điều kiện Việt Nam. Nền tảng không đưa ra kết luận năng suất từ mật độ và không thay thế tư vấn nông học.

## Tính năng
- Trang nghiên cứu responsive, minh họa vườn cà phê bằng SVG, không cần tài khoản.
- Ba kịch bản: truyền thống **3 × 3 m** (ví dụ), WASI **3,2 × 1,5 m** (theo tài liệu [1]), hàng dày giả định **3,5 × 0,8 m** (không phải khuyến cáo).
- Tính số cây dự kiến theo diện tích, khoảng cách và tỷ lệ đất chừa làm đường/hạ tầng.
- Sơ đồ tương tác mặt bằng; cảnh báo ở độ dốc lớn; xuất CSV có chú thích.
- Đề cương theo dõi thử nghiệm và nguồn tài liệu gốc.

## Chạy thử
Mở `index.html` hoặc khởi động web server trong thư mục dự án:
```sh
python -m http.server 8768
```
Truy cập `http://localhost:8768/`. Không có bundler hoặc backend.

## Kiểm thử
```sh
node --test tests/calculator.test.cjs
node --check app.js
```

## Cơ sở tính
```
density = 10000 / (row_spacing_m * tree_spacing_m)
net_area_ha = area_ha * (1 - infrastructure_percent / 100)
estimated_trees = floor(density * net_area_ha)
```
Số cây lý thuyết không phản ánh hình dạng thửa, rìa lô, đầu hàng, tổn thất cây, giống, tán, xói mòn hay đường tiếp cận. Bản vẽ SVG chỉ là minh họa mặt bằng tương đối.

## Giới hạn nghiên cứu
- Nghiên cứu [1] là **quy trình tái canh cà phê vối theo hướng cơ giới hóa** của WASI, Quyết định 81/QĐ-VNLT (SPQG), ngày 30/12/2020, trang 4: hố cách hố 1,5 m, hàng cách hàng 3,2 m, mật độ 2.080 hố/ha theo cách làm tròn của tài liệu. Phạm vi quy trình còn yêu cầu các điều kiện đất/vườn cụ thể và độ dốc dưới 10 độ; không tự suy rộng cho mọi vườn.
- [2] nhấn mạnh quy hoạch hành lang máy, mật độ, chọn giống, chi phí dài hạn tại Brazil.
- [4] là công trình về **Arabica** tại Brazil, không suy diễn kết quả định lượng cho **Robusta** ở Việt Nam.
- Ví dụ 3,5 × 0,8 m chỉ để so sánh hình học; không trích là quy trình áp dụng chính thức.
- Kết quả mô phỏng **không phải** chỉ số năng suất, hiệu quả kinh tế, hoặc độ an toàn vận hành máy.

## Nguồn
1. WASI, Quyết định 81/QĐ-VNLT (SPQG) (2020): https://wasi.org.vn/wp-content/uploads/2021/11/QUYET-DINH-BAN-HANH-QUY-TRINH-TAI-CANH-CA-PHE-VOI-2020.pdf
2. Embrapa, Planejamento do Plantio: https://www.atermaisdigital.cnptia.embrapa.br/web/cafe/planejamento-do-plantio
3. World Coffee Research, Vietnam: https://worldcoffeeresearch.org/countries/vietnam
4. Pesquisa Agropecuária Brasileira, Crescimento, produtividade e bienalidade do cafeeiro em função do espaçamento de cultivo: https://apct.sede.embrapa.br/pab/pt_BR/article/view/8586

## Phát triển
HTML/CSS/JS thuần, không cần cài dependencies. GitHub Pages có thể xuất bản ngay từ nhánh `main` bằng Settings → Pages → Deploy from a branch; vì GitHub Actions đang hạn chế, không có workflow CI tự động.

**License:** MIT.

## Bản V2 — Field Twin / Tưới / Kinh tế (29/10/2026)

Bản V2 mở rộng nhưng không thay đổi kiến trúc tĩnh HTML/CSS/JS, tương thích GitHub Pages:
- Phối cảnh không gian 3D dựng bằng Canvas 2D và phép chiếu 3D thủ công; kéo chuột xoay, cuộn thu/phóng, lưu ảnh PNG. **Không có dữ liệu địa hình đo đạc, DEM/GIS hoặc độ sâu đất**.
- Đổi hướng hàng ngang dốc (theo đường đồng mức) so với dọc dốc để hỗ trợ thảo luận xói mòn; không tự đưa kết luận cho thực địa.
- Đường ống nhỏ giọt, lưu lượng và thể tích tính từ số cây, số đầu tưới, lưu lượng/đầu, số giờ; chưa tính áp lực, tổn thất, năng lực bơm hay phân khu.
- Kiểm tra hình học danh nghĩa độ rộng hành lang thiết bị và diện tích quay đầu, không xác nhận an toàn thực tế hay cho phép máy hoạt động.
- Sơ đồ một thiết bị chăm sóc di chuyển trong hành lang. **Không mô phỏng máy thu hoạch tự động Robusta**; quy trình WASI 2021 mô tả cắt cành mang quả đưa vào máy tuốt.
- Dòng tiền **giả định**: sản lượng nhân, giá, chi phí năm, vốn ban đầu và số năm tùy chỉnh; biểu đồ tiền tích lũy. Không bao gồm giai đoạn kiến thiết, thay đổi năng suất theo tuổi, giá, thuế, chiết khấu hoặc rủi ro thị trường.
- Tải kịch bản JSON và biểu đồ phối cảnh PNG.

### Điều kiện áp dụng đúng của WASI 2021
Quyết định 97/QĐ-TT-CCN ngày **11/05/2021**, quy trình **canh tác tổng hợp cà phê vối tái canh theo hướng cơ giới hóa** [5]:
- Áp dụng tại khu vực **độ dốc < 10°**, với **vườn có diện tích > 2 ha**, ngoài những điều kiện bắt buộc về vườn cây, kế hoạch tái canh, đất và rễ;
- Cây cách cây **1,5 m**, hàng cách hàng **3,2 m** (tài liệu làm tròn **2.080 hố/ha**);
- Kỹ thuật nuôi ba thân luân phiên, tưới nhỏ giọt, cơ giới hóa một số khâu.
Các thử nghiệm của ứng dụng chỉ kiểm tra **hai điều kiện hình học sơ bộ**; không có đủ dữ liệu xác nhận khu đất đáp ứng toàn bộ quy trình. Đừng nhầm độ dốc theo **độ (°)** với phần trăm (%).

5. Cục Trồng trọt / WASI, Quyết định 97/QĐ-TT-CCN (2021): https://wasi.org.vn/wp-content/uploads/2021/11/QUYET-DINH-CONG-NHAN-TBKT-QUY-TRINH-TAI-CANH-THEO-HUONG-CO-GIOI-HOA.pdf
6. Embrapa, Planejamento do Plantio: https://www.atermaisdigital.cnptia.embrapa.br/web/cafe/planejamento-do-plantio

### Kiểm thử V2
```sh
node --test tests/*.test.cjs
node --check app.js
node --check field-engine.js
node --check lab-v2.js
```

Cấu trúc file: `field-engine.js` là module tính toán thuần, testable trong Node, còn `lab-v2.js` có điều khiển DOM/Canvas. Cả hai được nạp tĩnh và không thu thập dữ liệu người dùng.
