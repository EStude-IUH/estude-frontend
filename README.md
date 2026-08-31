# EStude Frontend

Frontend Next.js cho luồng đăng ký, đăng nhập và trang tổng quan EStude.

## Chạy dự án

1. Sao chép `.env.example` thành `.env.local` nếu API không chạy tại địa chỉ mặc định.
2. Chạy `npm install`.
3. Chạy `npm run dev`.
4. Mở `http://localhost:3000`.

Backend mặc định được gọi tại `http://localhost:5000/api/v1`. Khi production, đặt `NEXT_PUBLIC_API_URL=https://api.estude.io.vn/api/v1`.

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

Middleware nhận diện portal từ hostname production (`admin.estude.io.vn`, `teacher.estude.io.vn`, `student.estude.io.vn`) hoặc cổng local. Mỗi origin gọi endpoint auth tương ứng và dùng refresh cookie riêng, nên có thể mở đồng thời nhiều portal mà không ghi đè phiên.
