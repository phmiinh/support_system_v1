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
	}

	if token == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}

	claims, err := auth.ParseToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("Token không hợp lệ hoặc đã hết hạn")
	}

	userID := uint(claims["user_id"].(float64))
	c.Locals("user_id", userID)

	// Lấy đầy đủ thông tin user từ DB và set vào context
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("User not found")
	}
	c.Locals("user", user)
	return c.Next()
}
