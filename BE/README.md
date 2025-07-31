# Support System Backend

## Cấu hình SMTP cho gửi email xác thực

Tạo file `.env` hoặc cấu hình biến môi trường cho server với các giá trị sau:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
SMTP_FROM=Support System <your@email.com> # (tùy chọn)
```

- SMTP_HOST: Địa chỉ SMTP server (ví dụ: smtp.gmail.com)
- SMTP_PORT: Cổng SMTP (thường là 587 cho TLS)
- SMTP_USER: Tài khoản email gửi đi
- SMTP_PASS: Mật khẩu ứng dụng hoặc mật khẩu email
- SMTP_FROM: (tùy chọn) Tên hiển thị người gửi, nếu không có sẽ dùng SMTP_USER

Sau khi cấu hình, khi người dùng đăng ký sẽ nhận được email xác thực tài khoản. 