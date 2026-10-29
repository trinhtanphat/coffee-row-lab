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
- Nghiên cứu [1] là **quy trình tái canh cà phê vối theo hướng cơ giới hóa** của WASI, Quyết định 81/QĐ-VNLT (SPQG), ngày 30/12/2020, trang 4: hố cách hố 1,5 m, hàng cách hàng 3,2 m, mật độ 2.080 hố/ha theo cách làm tròn của tài liệu. Phạm vi quy trình còn yêu cầu các điều kiện đất/vườn cụ thể và độ dốc dưới 15 độ; không tự suy rộng cho mọi vườn.
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
