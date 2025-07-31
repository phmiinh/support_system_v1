package routes

import (
	"awesomeProject/controllers"
	"awesomeProject/middlewares"

	"github.com/gofiber/fiber/v2"
)

// RegisterAPIRoutes registers all API routes for the application.
func RegisterAPIRoutes(app *fiber.App) {
	app.Post("/login", controllers.Login)
	app.Post("/register", controllers.Register)
	app.Post("/login/2fa", controllers.Login2FA)
	app.Post("/refresh-token", controllers.RefreshToken)
	app.Post("/verify-email", controllers.VerifyEmail)
	app.Post("/resend-verification-email", controllers.ResendVerificationEmail)
	app.Post("/forgot-password", controllers.ForgotPassword)
	app.Post("/reset-password", controllers.ResetPassword)

	//User routes
	authRequired := app.Group("/user")
	authRequired.Use(middlewares.JWTMiddleware)
	authRequired.Get("/knowledge-base", controllers.GetKnowledgeBaseList)
	authRequired.Get("/knowledge-base/:slug", controllers.GetKnowledgeBaseDetail)
	authRequired.Post("/logout", controllers.Logout)
	authRequired.Get("/profile", controllers.GetMyProfile)
	authRequired.Put("/profile", controllers.UpdateMyProfile)
	authRequired.Post("/profile/change-password", controllers.ChangeMyPassword)
	authRequired.Post("/profile/2fa/setup", controllers.Setup2FA)
	authRequired.Post("/profile/2fa/enable", controllers.Enable2FA)
	authRequired.Post("/profile/2fa/disable", controllers.Disable2FA)
	authRequired.Post("/tickets", controllers.CreateTicket)
	authRequired.Get("/tickets", controllers.GetMyTickets)
	authRequired.Get("/tickets/:id", controllers.GetTicketDetail)
	authRequired.Get("/tickets/:id/comments", controllers.GetTicketComments)
	authRequired.Post("/tickets/:id/comments", controllers.PostTicketComment)
	authRequired.Put("/tickets/:id", controllers.UpdateMyTicket)
	authRequired.Delete("/tickets/:id", controllers.DeleteMyTicket)
	authRequired.Get("/notifications", controllers.UserGetNotifications)
	authRequired.Post("/notifications/:id/read", controllers.UserReadNotification)
	authRequired.Get("/dashboard/stats", controllers.UserDashboardStats)

	// Public API cho FE lấy danh sách thuộc tính ticket
	app.Get("/ticket-categories", controllers.GetTicketCategories)
	app.Get("/ticket-product-types", controllers.GetTicketProductTypes)
	app.Get("/ticket-priorities", controllers.GetTicketPriorities)

	// Admin routes
	adminRequired := app.Group("/admin")
	adminRequired.Use(middlewares.AdminMiddleware)
	adminRequired.Get("/dashboard/stats", controllers.AdminDashboardStats)
	adminRequired.Get("/tickets", controllers.AdminGetTickets)
	adminRequired.Get("/tickets/:id", controllers.AdminGetTicketDetail)
	adminRequired.Put("/tickets/:id/status", controllers.AdminUpdateTicketStatus)
	adminRequired.Get("/tickets/:id/comments", controllers.GetTicketComments)
	adminRequired.Post("/tickets/:id/comments", controllers.PostTicketComment)
	adminRequired.Get("/staff", controllers.GetAssignableStaff)
	adminRequired.Put("/tickets/:id/assign", controllers.AssignTicket)
	adminRequired.Get("/users", controllers.AdminListUsers)
	adminRequired.Post("/users", controllers.AdminCreateUser)
	adminRequired.Put("/users/:id", controllers.AdminUpdateUser)
	adminRequired.Delete("/users/:id", controllers.AdminDeleteUser)
	adminRequired.Put("/users/:id/role", controllers.AdminChangeUserRole)
	adminRequired.Get("/notifications", controllers.AdminGetNotifications)
	adminRequired.Post("/notifications/:id/read", controllers.AdminReadNotification)
	adminRequired.Get("/knowledge-base", controllers.AdminGetKnowledgeBaseList)
	adminRequired.Post("/knowledge-base", controllers.AdminCreateKnowledgeBase)
	adminRequired.Put("/knowledge-base/:id", controllers.AdminUpdateKnowledgeBase)
	adminRequired.Delete("/knowledge-base/:id", controllers.AdminDeleteKnowledgeBase)

	// CRUD thuộc tính ticket
	adminRequired.Get("/ticket-categories", controllers.GetAllTicketCategories)
	adminRequired.Post("/ticket-categories", controllers.CreateTicketCategory)
	adminRequired.Put("/ticket-categories/:id", controllers.UpdateTicketCategory)
	adminRequired.Delete("/ticket-categories/:id", controllers.DeleteTicketCategory)
	adminRequired.Get("/ticket-priorities", controllers.GetAllTicketPriorities)
	adminRequired.Post("/ticket-priorities", controllers.CreateTicketPriority)
	adminRequired.Put("/ticket-priorities/:id", controllers.UpdateTicketPriority)
	adminRequired.Delete("/ticket-priorities/:id", controllers.DeleteTicketPriority)
	adminRequired.Get("/ticket-product-types", controllers.GetAllTicketProductTypes)
	adminRequired.Post("/ticket-product-types", controllers.CreateTicketProductType)
	adminRequired.Put("/ticket-product-types/:id", controllers.UpdateTicketProductType)
	adminRequired.Delete("/ticket-product-types/:id", controllers.DeleteTicketProductType)
}
