package controllers

import (
	"crypto/sha256"
	"fmt"
	"math/rand"
	"os"
	"regexp"
	"strings"
	"unicode"

	"gopkg.in/gomail.v2"

	"awesomeProject/auth"
	"awesomeProject/models"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp/totp"
)

// Validation functions
func validateFullName(fullName string) error {
	// Kiểm tra độ dài (6-20 ký tự)
	if len(fullName) < 6 || len(fullName) > 20 {
		return fmt.Errorf("FULLNAME_LENGTH_ERROR")
	}

	return nil
}

func validateUsername(username string) error {
	// Kiểm tra độ dài (6-20 ký tự)
	if len(username) < 6 || len(username) > 20 {
		return fmt.Errorf("USERNAME_LENGTH_ERROR")
	}

	// Kiểm tra ký tự cho phép (chữ cái không dấu, số, dấu gạch dưới, dấu gạch ngang)
	validUsernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !validUsernameRegex.MatchString(username) {
		return fmt.Errorf("USERNAME_CHARS_ERROR")
	}

	// Kiểm tra từ khóa nhạy cảm
	reservedKeywords := []string{"admin", "moderator", "support", "system", "root", "user", "guest", "test", "demo"}
	usernameLower := strings.ToLower(username)
	for _, keyword := range reservedKeywords {
		if usernameLower == keyword {
			return fmt.Errorf("USERNAME_RESERVED_ERROR:%s", keyword)
		}
	}

	// Kiểm tra tính duy nhất
	var existingUser models.User
	if err := models.DB.Where("name = ?", username).First(&existingUser).Error; err == nil {
		return fmt.Errorf("USERNAME_EXISTS_ERROR")
	}

	return nil
}

func validateEmail(email string) error {
	// Kiểm tra định dạng email
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("EMAIL_FORMAT_ERROR")
	}

	// Kiểm tra tính duy nhất
	var existingUser models.User
	if err := models.DB.Where("email = ?", strings.ToLower(email)).First(&existingUser).Error; err == nil {
		return fmt.Errorf("EMAIL_EXISTS_ERROR")
	}

	return nil
}

func validatePassword(password string) error {
	if len(password) < 8 || len(password) > 24 {
		return fmt.Errorf("PASSWORD_LENGTH_ERROR")
	}

	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case strings.ContainsRune("!@#$%^&*()_+-=[]{}|;':\",./<>?", char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return fmt.Errorf("PASSWORD_UPPERCASE_ERROR")
	}
	if !hasLower {
		return fmt.Errorf("PASSWORD_LOWERCASE_ERROR")
	}
	if !hasNumber {
		return fmt.Errorf("PASSWORD_NUMBER_ERROR")
	}
	if !hasSpecial {
		return fmt.Errorf("PASSWORD_SPECIAL_ERROR")
	}

	return nil
}

// Error message mapping function
func getErrorMessage(errCode string, lang string) string {
	errorMessages := map[string]map[string]string{
		"FULLNAME_LENGTH_ERROR": {
			"en": "Full name must be between 6 and 20 characters",
			"vi": "Họ và tên phải có độ dài từ 6 đến 20 ký tự",
		},
		"USERNAME_LENGTH_ERROR": {
			"en": "Username must be between 6 and 20 characters",
			"vi": "Tên người dùng phải có độ dài từ 6 đến 20 ký tự",
		},
		"USERNAME_CHARS_ERROR": {
			"en": "Username can only contain letters without accents, numbers, underscore (_) and hyphen (-)",
			"vi": "Tên người dùng chỉ được chứa chữ cái không dấu, số, dấu gạch dưới (_) và dấu gạch ngang (-)",
		},
		"USERNAME_RESERVED_ERROR": {
			"en": "Username cannot use reserved keyword: %s",
			"vi": "Tên người dùng không được sử dụng từ khóa: %s",
		},
		"USERNAME_EXISTS_ERROR": {
			"en": "Username already exists",
			"vi": "Tên người dùng đã tồn tại",
		},
		"EMAIL_FORMAT_ERROR": {
			"en": "Invalid email format",
			"vi": "Định dạng email không hợp lệ",
		},
		"EMAIL_EXISTS_ERROR": {
			"en": "Email already exists in the system",
			"vi": "Email đã tồn tại trong hệ thống",
		},
		"PASSWORD_LENGTH_ERROR": {
			"en": "Password must be between 8 and 24 characters",
			"vi": "Mật khẩu phải có độ dài từ 8 đến 24 ký tự",
		},
		"PASSWORD_UPPERCASE_ERROR": {
			"en": "Password must contain at least one uppercase letter",
			"vi": "Mật khẩu phải chứa ít nhất một chữ hoa",
		},
		"PASSWORD_LOWERCASE_ERROR": {
			"en": "Password must contain at least one lowercase letter",
			"vi": "Mật khẩu phải chứa ít nhất một chữ thường",
		},
		"PASSWORD_NUMBER_ERROR": {
			"en": "Password must contain at least one number",
			"vi": "Mật khẩu phải chứa ít nhất một số",
		},
		"PASSWORD_SPECIAL_ERROR": {
			"en": "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)",
			"vi": "Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*()_+-=[]{}|;':\",./<>?)",
		},
		"SMTP_CONFIG_ERROR": {
			"en": "Missing SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS)",
			"vi": "Thiếu cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)",
		},
		"EMAIL_SEND_ERROR": {
			"en": "Cannot send verification email. Please try again later!",
			"vi": "Không thể gửi email xác thực. Vui lòng thử lại sau!",
		},
		"REGISTRATION_SUCCESS": {
			"en": "Registration successful! Please check your email to verify your account.",
			"vi": "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
		},
		"INVALID_DATA": {
			"en": "Invalid data provided.",
			"vi": "Dữ liệu không hợp lệ.",
		},
		"USER_NOT_FOUND": {
			"en": "User not found.",
			"vi": "Không tìm thấy người dùng.",
		},
		"CANNOT_CREATE_RESET_TOKEN": {
			"en": "Cannot create reset password token.",
			"vi": "Không thể tạo mã reset password.",
		},
		"RESET_PASSWORD_EMAIL_SENT": {
			"en": "Reset password email sent! Please check your email.",
			"vi": "Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra email.",
		},
		"INVALID_RESET_TOKEN": {
			"en": "Invalid reset token or expired.",
			"vi": "Mã reset password không hợp lệ hoặc đã hết hạn.",
		},
		"CANNOT_UPDATE_PASSWORD": {
			"en": "Cannot update password.",
			"vi": "Không thể cập nhật mật khẩu.",
		},
		"PASSWORD_RESET_SUCCESS": {
			"en": "Password reset successful!",
			"vi": "Đặt lại mật khẩu thành công!",
		},
		"INVALID_RESET_CODE": {
			"en": "Invalid reset code or expired.",
			"vi": "Mã đặt lại không hợp lệ hoặc đã hết hạn.",
		},
		"RESET_CODE_VALID": {
			"en": "Reset code is valid.",
			"vi": "Mã đặt lại hợp lệ.",
		},
		"INVALID_LOGIN_CREDENTIALS": {
			"en": "Email or password is incorrect!",
			"vi": "Email hoặc mật khẩu không đúng!",
		},
	}

	if messages, exists := errorMessages[errCode]; exists {
		if message, exists := messages[lang]; exists {
			return message
		}
		// Fallback to English if language not found
		return messages["en"]
	}

	// Fallback for unknown error codes
	return errCode
}

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
		return fmt.Errorf("SMTP_CONFIG_ERROR")
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

// Gửi email reset password
func sendResetPasswordEmail(to, token string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = smtpUser
	}

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("SMTP_CONFIG_ERROR")
	}

	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", "[Support System] Reset Password")
	m.SetBody("text/html", fmt.Sprintf(`
		<html>
		<body>
			<h2>Reset Password</h2>
			<p>You have requested to reset your password.</p>
			<p>Your reset code is: <strong>%s</strong></p>
			<p>Please use this code to reset your password.</p>
			<p>If you didn't request this, please ignore this email.</p>
			<br>
			<p>Best regards,</p>
			<p>Support System Team</p>
		</body>
		</html>
	`, token))

	d := gomail.NewDialer(smtpHost, 587, smtpUser, smtpPass)
	d.SSL = false

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
		Language string `form:"language"` // Add language parameter
	}

	var input RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Không thể đọc dữ liệu từ form!",
			"success": false,
		})
	}

	// Default to Vietnamese if no language specified
	lang := "vi"
	if input.Language != "" {
		lang = input.Language
	}

	// Validation
	if err := validateFullName(input.Name); err != nil {
		errCode := err.Error()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage(errCode, lang),
			"success": false,
		})
	}

	if err := validateEmail(input.Email); err != nil {
		errCode := err.Error()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage(errCode, lang),
			"success": false,
		})
	}

	if err := validatePassword(input.Password); err != nil {
		errCode := err.Error()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage(errCode, lang),
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
			"message": getErrorMessage("EMAIL_EXISTS_ERROR", lang),
			"success": false,
		})
	}

	// Gửi email xác thực
	if err := sendVerificationEmail(user.Email, verifyToken); err != nil {
		msg := getErrorMessage("EMAIL_SEND_ERROR", lang)
		if strings.Contains(err.Error(), "SMTP_CONFIG_ERROR") {
			msg = getErrorMessage("SMTP_CONFIG_ERROR", lang)
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": msg,
			"success": false,
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": getErrorMessage("REGISTRATION_SUCCESS", lang),
		"success": true,
	})
}

// Login handles user login.
func Login(c *fiber.Ctx) error {
	type LoginInput struct {
		Email    string `form:"email"`
		Password string `form:"password"`
		Language string `form:"language"`
	}

	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Không thể đọc dữ liệu từ form!",
			"success": false,
		})
	}

	// Default to Vietnamese if no language specified
	lang := "vi"
	if input.Language != "" {
		lang = input.Language
	}

	var user models.User
	if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{ // 401 Unauthorized
			"message": getErrorMessage("INVALID_LOGIN_CREDENTIALS", lang),
			"success": false,
		})
	}

	hashed := sha256.Sum256([]byte(input.Password))
	if user.PasswordHash != fmt.Sprintf("%x", hashed) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{ // 401 Unauthorized
			"message": getErrorMessage("INVALID_LOGIN_CREDENTIALS", lang),
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

	accessToken, err := auth.GenerateAccessToken(user.ID, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể tạo access token.",
			"success": false,
		})
	}

	refreshToken, err := auth.GenerateRefreshToken(user.ID, user.Role)
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
		SameSite: "Lax",
		Secure:   false,
		Domain:   "", // Let browser set domain automatically
	})

	// Set access token in HttpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   15 * 60, // 15 minutes
		SameSite: "Lax",
		Secure:   false,
		Domain:   "", // Let browser set domain automatically
	})

	// Trả về JSON thành công thay vì Redirect
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Đăng nhập thành công!",
		"success": true,
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

	// Lấy user để có role
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy người dùng.",
			"success": false,
		})
	}

	newAccess, err := auth.GenerateAccessToken(userID, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể tạo access token mới.",
			"success": false,
		})
	}

	// Set new access token in HttpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    newAccess,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   15 * 60, // 15 minutes
		SameSite: "Lax",
		Secure:   false,
		Domain:   "", // Let browser set domain automatically
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Đã cấp lại access token mới!",
		"success": true,
	})
}

// Logout - blacklist token
func Logout(c *fiber.Ctx) error {
	// Lấy token từ header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Token không được cung cấp",
		})
	}

	// Tách "Bearer " khỏi token
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == authHeader {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Token không hợp lệ",
		})
	}

	// Thêm token vào blacklist
	auth.BlacklistToken(tokenStr)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Đăng xuất thành công",
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
	accessToken, err := auth.GenerateAccessToken(user.ID, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Không thể tạo access token.", "success": false})
	}
	refreshToken, err := auth.GenerateRefreshToken(user.ID, user.Role)
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
		Email    string `json:"email"`
		Language string `json:"language"`
	}

	var input ForgotPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage("INVALID_DATA", "vi"),
			"success": false,
		})
	}

	lang := "vi"
	if input.Language != "" {
		lang = input.Language
	}

	var user models.User
	if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": getErrorMessage("USER_NOT_FOUND", lang),
			"success": false,
		})
	}

	// Tạo mã reset password
	resetToken := fmt.Sprintf("%06d", rand.Intn(1000000))
	user.VerifyToken = resetToken

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": getErrorMessage("CANNOT_CREATE_RESET_TOKEN", lang),
			"success": false,
		})
	}

	// Gửi email reset password
	go func() {
		err := sendResetPasswordEmail(user.Email, resetToken)
		if err != nil {
			fmt.Printf("[MAIL ERROR] To: %s | Subject: Reset Password | Error: %v\n", user.Email, err)
		}
	}()

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": getErrorMessage("RESET_PASSWORD_EMAIL_SENT", lang),
		"success": true,
	})
}

// ResetPassword handles password reset
func ResetPassword(c *fiber.Ctx) error {
	type ResetPasswordInput struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
		Language    string `json:"language"`
	}

	var input ResetPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage("INVALID_DATA", "vi"),
			"success": false,
		})
	}

	lang := "vi"
	if input.Language != "" {
		lang = input.Language
	}

	// Validate password
	if err := validatePassword(input.NewPassword); err != nil {
		errCode := err.Error()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage(errCode, lang),
			"success": false,
		})
	}

	var user models.User
	if err := models.DB.Where("verify_token = ?", input.Token).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": getErrorMessage("INVALID_RESET_TOKEN", lang),
			"success": false,
		})
	}

	// Hash mật khẩu mới
	hashed := sha256.Sum256([]byte(input.NewPassword))
	user.PasswordHash = fmt.Sprintf("%x", hashed)
	user.VerifyToken = "" // Xóa token sau khi sử dụng

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": getErrorMessage("CANNOT_UPDATE_PASSWORD", lang),
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": getErrorMessage("PASSWORD_RESET_SUCCESS", lang),
		"success": true,
	})
}

// VerifyResetCode verifies the reset code before allowing password reset
func VerifyResetCode(c *fiber.Ctx) error {
	type VerifyResetCodeInput struct {
		Email    string `json:"email"`
		Code     string `json:"code"`
		Language string `json:"language"`
	}

	var input VerifyResetCodeInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": getErrorMessage("INVALID_DATA", "vi"),
			"success": false,
		})
	}

	lang := "vi"
	if input.Language != "" {
		lang = input.Language
	}

	var user models.User
	if err := models.DB.Where("email = ? AND verify_token = ?", strings.ToLower(input.Email), input.Code).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": getErrorMessage("INVALID_RESET_CODE", lang),
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": getErrorMessage("RESET_CODE_VALID", lang),
		"success": true,
	})
}

// TestAuth endpoint để kiểm tra authentication
func TestAuth(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	return c.JSON(fiber.Map{
		"message": "Authentication working!",
		"success": true,
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}
