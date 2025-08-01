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

	// Lấy user ID và role từ token
	userID := uint(claims["user_id"].(float64))
	role := claims["role"].(string)

	// Kiểm tra role
	if role != "admin" && role != "staff" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Không có quyền truy cập trang quản trị",
			"success": false,
		})
	}

	// Kiểm tra user trong database để đảm bảo user vẫn tồn tại
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Không tìm thấy người dùng",
			"success": false,
		})
	}

	// Lưu thông tin user vào context để sử dụng sau
	c.Locals("user", user)
	c.Locals("userID", userID)
	c.Locals("userRole", role)

	return c.Next()
}

// StaffRestrictedMiddleware chặn quyền truy cập của staff vào các trang quản lý
func StaffRestrictedMiddleware(c *fiber.Ctx) error {
	userRole := c.Locals("userRole").(string)

	if userRole == "staff" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Bạn không có quyền truy cập trang này",
			"success": false,
		})
	}

	return c.Next()
}
