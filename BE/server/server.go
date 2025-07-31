package server

import (
	"awesomeProject/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func NewServer() *fiber.App {
	app := fiber.New(fiber.Config{
		BodyLimit: 100 * 1024 * 1024, // 100MB
	})
	// Cho phép CORS cho static files (uploads)
	app.Use("/uploads", cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,HEAD,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Range",
		ExposeHeaders:    "Content-Disposition, Content-Type, Content-Length",
		AllowCredentials: false,
	}))
	// Trả static file với header cho phép xem trực tiếp
	app.Static("/uploads", "./uploads", fiber.Static{
		Browse:        false,
		Download:      false,
		CacheDuration: 0,
	})
	// CORS cho API
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))
	routes.RegisterAPIRoutes(app)
	return app
}
