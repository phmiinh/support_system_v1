package middlewares

import (
	"awesomeProject/auth"
	"awesomeProject/models"

	"github.com/gofiber/fiber/v2"
)

func JWTMiddleware(c *fiber.Ctx) error {
	// Check Authorization header first
	authHeader := c.Get("Authorization")
	var token string

	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	} else {
		// Fallback to cookies
		token = c.Cookies("access_token")
		if token == "" {
			token = c.Cookies("refresh_token") // Try refresh token as fallback
		}
	}

	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthorized - No token provided",
			"success": false,
		})
	}

	claims, err := auth.ParseToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Token không hợp lệ hoặc đã hết hạn",
			"success": false,
		})
	}

	userID := uint(claims["user_id"].(float64))
	c.Locals("user_id", userID)

	// Lấy đầy đủ thông tin user từ DB và set vào context
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "User not found",
			"success": false,
		})
	}
	c.Locals("user", user)
	return c.Next()
}
