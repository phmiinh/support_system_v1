package controllers

import (
	"crypto/sha256"
	"fmt"
	"strings"

	"awesomeProject/models"
	"bytes"
	"encoding/base64"
	"image/png"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

// GetMyProfile retrieves the profile details of the authenticated user.
// This function assumes that JWTMiddleware has already extracted the user object
// and stored it in c.Locals("user").
func GetMyProfile(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(models.User) // Lấy user object từ JWT middleware
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy User trong token. Vui lòng đăng nhập lại.",
			"success": false,
		})
	}

	// Trả về thông tin người dùng (không bao gồm PasswordHash)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"user": fiber.Map{
			"id":                 user.ID,
			"name":               user.Name,
			"phone":              user.Phone,
			"email":              user.Email,
			"role":               user.Role,
			"is_verified":        user.IsVerified,
			"two_factor_enabled": user.TwoFactorEnabled,
			"created_at":         user.CreatedAt,
			"updated_at":         user.UpdatedAt,
		},
	})
}

// UpdateMyProfile updates the personal information of the authenticated user.
func UpdateMyProfile(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(models.User)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy User trong token. Vui lòng đăng nhập lại.",
			"success": false,
		})
	}

	type UpdateProfileInput struct {
		Name  string `json:"name"`
		Phone string `json:"phone"`
		Email string `json:"email"` // Cho phép cập nhật email, nhưng cần xử lý unique
	}

	var input UpdateProfileInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu cập nhật không hợp lệ.",
			"success": false,
		})
	}

	// Cập nhật thông tin
	user.Name = strings.TrimSpace(input.Name)
	user.Phone = input.Phone

	// Xử lý cập nhật email (nếu có và khác email cũ)
	if strings.ToLower(input.Email) != user.Email {
		// Kiểm tra email mới có bị trùng không
		var existingUser models.User
		if err := models.DB.Where("email = ?", strings.ToLower(input.Email)).First(&existingUser).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"message": "Email mới đã được sử dụng bởi tài khoản khác.",
				"success": false,
			})
		}
		user.Email = strings.ToLower(input.Email)
		// Bạn có thể thêm logic xác minh email lại ở đây nếu cần
		user.IsVerified = false // Đặt lại trạng thái xác minh nếu email thay đổi
	}

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể cập nhật thông tin người dùng.",
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Cập nhật thông tin thành công!",
		"success": true,
		"user": fiber.Map{ // Trả về thông tin đã cập nhật
			"id":                 user.ID,
			"name":               user.Name,
			"phone":              user.Phone,
			"email":              user.Email,
			"role":               user.Role,
			"is_verified":        user.IsVerified,
			"two_factor_enabled": user.TwoFactorEnabled,
			"created_at":         user.CreatedAt,
			"updated_at":         user.UpdatedAt,
		},
	})
}

// ChangeMyPassword allows the authenticated user to change their password.
func ChangeMyPassword(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(models.User)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy User trong token. Vui lòng đăng nhập lại.",
			"success": false,
		})
	}

	type ChangePasswordInput struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}

	var input ChangePasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu thay đổi mật khẩu không hợp lệ.",
			"success": false,
		})
	}

	// Xác minh mật khẩu cũ
	hashedOld := sha256.Sum256([]byte(input.OldPassword))
	if user.PasswordHash != fmt.Sprintf("%x", hashedOld) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Mật khẩu cũ không đúng.",
			"success": false,
		})
	}

	// Hash mật khẩu mới và cập nhật
	hashedNew := sha256.Sum256([]byte(input.NewPassword))
	user.PasswordHash = fmt.Sprintf("%x", hashedNew)

	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể cập nhật mật khẩu.",
			"success": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Mật khẩu đã được thay đổi thành công!",
		"success": true,
	})
}

// 2FA: Setup - trả về secret và QR code
func Setup2FA(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(models.User)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Chưa đăng nhập", "success": false})
	}
	// Nếu đã có secret thì dùng lại, chưa có thì sinh mới
	secret := user.TwoFactorSecret
	if secret == "" {
		secretKey, err := totp.Generate(totp.GenerateOpts{
			Issuer:      "Support System",
			AccountName: user.Email,
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"message": "Không thể tạo secret 2FA", "success": false})
		}
		user.TwoFactorSecret = secretKey.Secret()
		models.DB.Save(&user)
	}
	// Tạo QR code
	key, _ := otp.NewKeyFromURL("otpauth://totp/Support%20System:" + user.Email + "?secret=" + user.TwoFactorSecret + "&issuer=Support%20System")
	img, _ := key.Image(200, 200)
	var buf bytes.Buffer
	w := base64.NewEncoder(base64.StdEncoding, &buf)
	_ = png.Encode(w, img)
	w.Close()
	qrBase64 := buf.String()
	return c.JSON(fiber.Map{
		"success": true,
		"secret":  user.TwoFactorSecret,
		"qr":      "data:image/png;base64," + qrBase64,
	})
}

// 2FA: Enable - xác thực mã OTP và bật 2FA
func Enable2FA(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(models.User)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Chưa đăng nhập", "success": false})
	}
	type Input struct {
		Code string `json:"code"`
	}
	var input Input
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"message": "Thiếu mã xác thực", "success": false})
	}
	if user.TwoFactorSecret == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Chưa setup 2FA", "success": false})
	}
	if !totp.Validate(input.Code, user.TwoFactorSecret) {
		return c.Status(400).JSON(fiber.Map{"message": "Mã xác thực không đúng", "success": false})
	}
	user.TwoFactorEnabled = true
	models.DB.Save(&user)
	return c.JSON(fiber.Map{"success": true, "message": "Đã bật xác thực 2 lớp!"})
}

// 2FA: Disable - xác thực mã OTP và tắt 2FA
func Disable2FA(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(models.User)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Chưa đăng nhập", "success": false})
	}
	type Input struct {
		Code string `json:"code"`
	}
	var input Input
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"message": "Thiếu mã xác thực", "success": false})
	}
	if user.TwoFactorSecret == "" || !user.TwoFactorEnabled {
		return c.Status(400).JSON(fiber.Map{"message": "Bạn chưa bật 2FA", "success": false})
	}
	if !totp.Validate(input.Code, user.TwoFactorSecret) {
		return c.Status(400).JSON(fiber.Map{"message": "Mã xác thực không đúng", "success": false})
	}
	user.TwoFactorEnabled = false
	user.TwoFactorSecret = ""
	models.DB.Save(&user)
	return c.JSON(fiber.Map{"success": true, "message": "Đã tắt xác thực 2 lớp!"})
}
