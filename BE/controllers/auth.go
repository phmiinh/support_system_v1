package controllers

import (
	"crypto/sha256"
	"fmt"
	"math/rand"
	"os"
	"strings"

	"gopkg.in/gomail.v2"

	"awesomeProject/auth"
	"awesomeProject/models"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp/totp"
)

// Gửi email xác thực thực tế bằng gomail
func sendVerificationEmail(to, token string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = smtpUser
	}

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("Thiếu cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)")
	}

	port := 587
	if smtpPort != "" {
		fmt.Sscanf(smtpPort, "%d", &port)
	}

	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", "Xác thực tài khoản Support System")
	m.SetBody("text/html", fmt.Sprintf("<p>Chào bạn,</p><p>Mã xác thực tài khoản của bạn là: <b>%s</b></p><p>Vui lòng nhập mã này để hoàn tất đăng ký.</p>", token))

	d := gomail.NewDialer(smtpHost, port, smtpUser, smtpPass)

	err := d.DialAndSend(m)
	if err != nil {
		return err
	}

	return nil
}

// Register handles user registration.
func Register(c *fiber.Ctx) error {
	type RegisterInput struct {
		Name     string `form:"name"`
		Phone    string `form:"phone"`
		Email    string `form:"email"`
		Password string `form:"password"`
	}

	var input RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Không thể đọc dữ liệu từ form!",
			"success": false,
		})
	}

	hashed := sha256.Sum256([]byte(input.Password))

	// Tạo mã xác thực ngẫu nhiên (sử dụng crypto/rand thay vì math/rand)
	verifyToken := fmt.Sprintf("%06d", rand.Intn(1000000)) // 6 số

	user := models.User{
		Name:         strings.TrimSpace(input.Name),
		Phone:        input.Phone,
		Email:        strings.ToLower(input.Email),
		PasswordHash: fmt.Sprintf("%x", hashed),
		Role:         "customer",
		IsVerified:   false,
		VerifyToken:  verifyToken,
	}

	if err := models.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "Email đã tồn tại, vui lòng dùng email khác!",
			"success": false,
		})
	}

	// Gửi email xác thực
	if err := sendVerificationEmail(user.Email, verifyToken); err != nil {
		msg := "Không thể gửi email xác thực. Vui lòng thử lại sau!"
		if strings.Contains(err.Error(), "SMTP") || strings.Contains(err.Error(), "cấu hình") {
			msg = "Lỗi cấu hình SMTP: " + err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": msg,
			"success": false,
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
		"success": true,
	})
}

// Login handles user login.
func Login(c *fiber.Ctx) error {
	type LoginInput struct {
		Email    string `form:"email"`
		Password string `form:"password"`
	}

	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Không thể đọc dữ liệu từ form!",
			"success": false,
		})
	}

	var user models.User
	if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{ // 401 Unauthorized
			"message": "Email hoặc mật khẩu không đúng!", // Gộp chung thông báo để tránh đoán email
			"success": false,
		})
	}

	hashed := sha256.Sum256([]byte(input.Password))
	if user.PasswordHash != fmt.Sprintf("%x", hashed) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{ // 401 Unauthorized
			"message": "Email hoặc mật khẩu không đúng!", // Gộp chung thông báo để tránh đoán mật khẩu
			"success": false,
		})
	}

	if user.TwoFactorEnabled {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"require_2fa": true,
			"user_id":     user.ID,
			"message":     "Yêu cầu mã xác thực 2FA",
			"success":     true,
		})
	}

	accessToken, err := auth.GenerateAccessToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể tạo access token.",
			"success": false,
		})
	}

	refreshToken, err := auth.GenerateRefreshToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể tạo refresh token.",
			"success": false,
		})
	}

	// Set refresh token in HttpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
		SameSite: "Lax",       // Use Lax for localhost
		Secure:   false,       // Set to false for localhost
		Domain:   "localhost", // Explicitly set domain
	})

	fmt.Printf("Login: Set refresh_token cookie: %s\n", refreshToken)

	// Trả về JSON thành công thay vì Redirect
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":      "Đăng nhập thành công!",
		"success":      true,
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"user": fiber.Map{
			"id":                 user.ID,
			"name":               user.Name,
			"email":              user.Email,
			"role":               user.Role,
			"is_verified":        user.IsVerified,
			"two_factor_enabled": user.TwoFactorEnabled,
		},
	})
}

// RefreshToken handles refreshing the access token using a refresh token.
func RefreshToken(c *fiber.Ctx) error {
	token := c.Cookies("refresh_token")
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy refresh token. Vui lòng đăng nhập lại.",
			"success": false,
		})
	}

	claims, err := auth.ParseToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Refresh token không hợp lệ. Vui lòng đăng nhập lại.",
			"success": false,
		})
	}

	userID := uint(claims["user_id"].(float64))
	newAccess, err := auth.GenerateAccessToken(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể tạo access token mới.",
			"success": false,
		})
	}

	// Don't set access token in cookie - it will be returned in JSON for localStorage

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":     "Đã cấp lại access token mới!",
		"success":     true,
		"accessToken": newAccess,
	})
}

// Logout clears user cookies and logs them out.
func Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		SameSite: "Lax", // Use Lax for localhost
		Secure:   false, // Set to false for localhost
		HTTPOnly: true,
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Đăng xuất thành công!",
		"success": true,
	})
}

// Xác thực email
func VerifyEmail(c *fiber.Ctx) error {
	type VerifyInput struct {
		Email string `json:"email"`
		Token string `json:"token"`
	}

	var input VerifyInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu không hợp lệ.",
			"success": false,
		})
	}

	var user models.User
	if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Không tìm thấy người dùng.",
			"success": false,
		})
	}

	if user.IsVerified {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Tài khoản đã được xác thực trước đó.",
			"success": true,
		})
	}

	if user.VerifyToken != input.Token {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Mã xác thực không đúng.",
			"success": false,
		})
	}

	user.IsVerified = true
	user.VerifyToken = ""
	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể cập nhật trạng thái xác thực.",
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Xác thực email thành công!",
		"success": true,
	})
}

// Login2FA handles 2FA login.
func Login2FA(c *fiber.Ctx) error {
	type Input struct {
		UserID uint   `json:"user_id"`
		Code   string `json:"code"`
	}
	var input Input
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Dữ liệu không hợp lệ.", "success": false})
	}
	var user models.User
	if err := models.DB.First(&user, input.UserID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Không tìm thấy user.", "success": false})
	}
	if !user.TwoFactorEnabled || user.TwoFactorSecret == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Tài khoản chưa bật 2FA.", "success": false})
	}
	if !totp.Validate(input.Code, user.TwoFactorSecret) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Mã xác thực 2FA không đúng.", "success": false})
	}
	accessToken, err := auth.GenerateAccessToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Không thể tạo access token.", "success": false})
	}
	refreshToken, err := auth.GenerateRefreshToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Không thể tạo refresh token.", "success": false})
	}
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   15 * 60,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
	})
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":      "Đăng nhập thành công!",
		"success":      true,
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"user": fiber.Map{
			"id":                 user.ID,
			"name":               user.Name,
			"email":              user.Email,
			"role":               user.Role,
			"is_verified":        user.IsVerified,
			"two_factor_enabled": user.TwoFactorEnabled,
		},
	})
}

// ResendVerificationEmail gửi lại email xác thực
func ResendVerificationEmail(c *fiber.Ctx) error {
	type ResendInput struct {
		Email string `json:"email"`
	}

	var input ResendInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu không hợp lệ.",
			"success": false,
		})
	}

	var user models.User
	if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Không tìm thấy người dùng với email này.",
			"success": false,
		})
	}

	if user.IsVerified {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Tài khoản đã được xác thực trước đó.",
			"success": true,
		})
	}

	// Tạo mã xác thực mới
	verifyToken := fmt.Sprintf("%06d", rand.Intn(1000000))
	user.VerifyToken = verifyToken

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể cập nhật mã xác thực.",
			"success": false,
		})
	}

	// Gửi email xác thực
	if err := sendVerificationEmail(user.Email, verifyToken); err != nil {
		msg := "Không thể gửi email xác thực. Vui lòng thử lại sau!"
		if strings.Contains(err.Error(), "SMTP") || strings.Contains(err.Error(), "cấu hình") {
			msg = "Lỗi cấu hình SMTP: " + err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": msg,
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Đã gửi lại mã xác thực! Vui lòng kiểm tra email.",
		"success": true,
	})
}

// ForgotPassword handles password reset request
func ForgotPassword(c *fiber.Ctx) error {
	type ForgotPasswordInput struct {
		Email string `json:"email"`
	}

	var input ForgotPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu không hợp lệ.",
			"success": false,
		})
	}

	var user models.User
	if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Không tìm thấy người dùng với email này.",
			"success": false,
		})
	}

	// Tạo mã reset password
	resetToken := fmt.Sprintf("%06d", rand.Intn(1000000))
	user.VerifyToken = resetToken

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể tạo mã reset password.",
			"success": false,
		})
	}

	// Gửi email reset password
	go func() {
		err := sendVerificationEmail(user.Email, resetToken)
		if err != nil {
			fmt.Printf("[MAIL ERROR] To: %s | Subject: Reset Password | Error: %v\n", user.Email, err)
		}
	}()

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Đã gửi mã reset password! Vui lòng kiểm tra email.",
		"success": true,
	})
}

// ResetPassword handles password reset
func ResetPassword(c *fiber.Ctx) error {
	type ResetPasswordInput struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}

	var input ResetPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu không hợp lệ.",
			"success": false,
		})
	}

	var user models.User
	if err := models.DB.Where("verify_token = ?", input.Token).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Mã reset password không hợp lệ hoặc đã hết hạn.",
			"success": false,
		})
	}

	// Hash mật khẩu mới
	hashed := sha256.Sum256([]byte(input.NewPassword))
	user.PasswordHash = fmt.Sprintf("%x", hashed)
	user.VerifyToken = "" // Xóa token sau khi sử dụng

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể cập nhật mật khẩu.",
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Đặt lại mật khẩu thành công!",
		"success": true,
	})
}
