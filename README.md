# EStude Frontend

Frontend Next.js cho luồng đăng ký, đăng nhập và trang tổng quan EStude.

## Chạy dự án

1. Sao chép `.env.example` thành `.env.local` nếu API không chạy tại địa chỉ mặc định.
2. Chạy `npm install`.
3. Chạy `npm run dev`.
4. Mở `http://localhost:3000`.

Backend mặc định được gọi tại `http://localhost:5000/api/v1`. Backend cần bật `REFRESH_COOKIE_ENABLED=true` để phiên đăng nhập được khôi phục an toàn sau khi tải lại trang.

## Khu vực theo vai trò

- `ADMIN`: `/admin/dashboard`
- `TEACHER`: `/teacher/dashboard`
- `STUDENT`: `/student/dashboard`

Route `/dashboard` được giữ để tự chuyển người dùng về đúng khu vực theo vai trò.

## Chạy nhiều vai trò khi phát triển

- `npm run serve` hoặc `npm run serve:all`: chạy đồng thời Admin, Teacher và Student.
- `npm run serve:admin`: Admin tại `http://localhost:3000`.
- `npm run serve:teacher`: Teacher tại `http://localhost:3001`.
- `npm run serve:student`: Student tại `http://localhost:3002`.

`serve:all` dùng một Next.js dev server và hai proxy nhẹ để tiết kiệm RAM nhưng vẫn giữ đủ HMR trên cả ba cổng. Khi chạy riêng, mỗi vai trò sử dụng thư mục cache Next.js độc lập.
