package middlewares

import (
	"awesomeProject/auth"
	"awesomeProject/models"

	"github.com/gofiber/fiber/v2"
)

// AdminMiddleware kiểm tra quyền admin/staff
func AdminMiddleware(c *fiber.Ctx) error {
	// Check Authorization header first
	authHeader := c.Get("Authorization")
	var token string

	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	} else {
		// Fallback to cookies
		token = c.Cookies("access_token")
	}

	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy token xác thực",
			"success": false,
		})
	}

	// Parse token
	claims, err := auth.ParseToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Token không hợp lệ",
			"success": false,
		})
	}

	// Lấy user ID từ token
	userID := uint(claims["user_id"].(float64))
	// Kiểm tra user trong database
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy người dùng",
			"success": false,
		})
	}

	// Kiểm tra role
	if user.Role != "admin" && user.Role != "staff" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Không có quyền truy cập trang quản trị",
			"success": false,
		})
	}

	// Lưu thông tin user vào context để sử dụng sau
	c.Locals("user", user)
	c.Locals("userID", userID)

	return c.Next()
}
