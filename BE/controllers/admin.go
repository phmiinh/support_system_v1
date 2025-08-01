package controllers

import (
	"awesomeProject/models"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// AdminDashboardStats trả về thống kê tổng quan cho dashboard
func AdminDashboardStats(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	userRole := c.Locals("userRole").(string)

	var totalTickets int64
	var processingTickets int64
	var avgProcessingTime float64

	// Base query - filter by role
	baseQuery := models.DB.Model(&models.Ticket{})
	if userRole == "staff" {
		baseQuery = baseQuery.Where("assigned_to = ?", user.ID)
	}

	// Đếm tổng số ticket
	baseQuery.Count(&totalTickets)

	// Đếm ticket đang xử lý
	processingQuery := models.DB.Model(&models.Ticket{}).Where("status IN ('Mới', 'Đang xử lý', 'Chờ phản hồi')")
	if userRole == "staff" {
		processingQuery = processingQuery.Where("assigned_to = ?", user.ID)
	}
	processingQuery.Count(&processingTickets)

	// Tính thời gian xử lý trung bình (chỉ tính các ticket đã xử lý)
	completedQuery := models.DB.Where("status = 'Đã xử lý' AND resolved_at IS NOT NULL")
	if userRole == "staff" {
		completedQuery = completedQuery.Where("assigned_to = ?", user.ID)
	}

	var completedTickets []models.Ticket
	completedQuery.Find(&completedTickets)

	var totalProcessingTime time.Duration
	for _, ticket := range completedTickets {
		if !ticket.CreatedAt.IsZero() && !ticket.ResolvedAt.IsZero() {
			totalProcessingTime += ticket.ResolvedAt.Sub(ticket.CreatedAt)
		}
	}

	if len(completedTickets) > 0 {
		avgProcessingTime = totalProcessingTime.Hours() / float64(len(completedTickets))
	}

	// Thống kê theo trạng thái
	statusStats := fiber.Map{}
	var statusQuery string
	var statusArgs []interface{}

	if userRole == "staff" {
		statusQuery = `
			SELECT status, COUNT(*) as count 
			FROM tickets 
			WHERE assigned_to = ?
			GROUP BY status
		`
		statusArgs = []interface{}{user.ID}
	} else {
		statusQuery = `
			SELECT status, COUNT(*) as count 
			FROM tickets 
			GROUP BY status
		`
	}

	rows, _ := models.DB.Raw(statusQuery, statusArgs...).Rows()
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		statusStats[status] = count
	}

	// Thống kê số ticket đã nhận trong tháng
	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var ticketsThisMonth int64

	monthlyQuery := models.DB.Model(&models.Ticket{}).Where("created_at >= ?", firstOfMonth)
	if userRole == "staff" {
		monthlyQuery = monthlyQuery.Where("assigned_to = ?", user.ID)
	}
	monthlyQuery.Count(&ticketsThisMonth)

	// Thống kê số ticket đã xử lý trong tháng
	var ticketsResolvedThisMonth int64
	resolvedMonthlyQuery := models.DB.Model(&models.Ticket{}).Where("status = 'Đã xử lý' AND resolved_at >= ?", firstOfMonth)
	if userRole == "staff" {
		resolvedMonthlyQuery = resolvedMonthlyQuery.Where("assigned_to = ?", user.ID)
	}
	resolvedMonthlyQuery.Count(&ticketsResolvedThisMonth)

	// Thống kê nhân viên xuất sắc (xử lý nhiều nhất all time)
	type StaffStat struct {
		StaffID uint
		Name    string
		Email   string
		Count   int
		AvgTime float64
	}
	var staffStats []StaffStat

	// Lấy tất cả nhân viên (admin và staff) và thống kê ticket của họ (all time)
	var staffQuery string
	var staffArgs []interface{}

	if userRole == "staff" {
		// Staff chỉ thấy thống kê của chính mình
		staffQuery = `
			SELECT 
				users.id as staff_id, 
				users.name, 
				users.email, 
				COALESCE(COUNT(tickets.id), 0) as count,
				COALESCE(AVG(CASE 
					WHEN tickets.status = 'Đã xử lý' AND tickets.resolved_at IS NOT NULL 
					THEN TIMESTAMPDIFF(SECOND, tickets.created_at, tickets.resolved_at)/3600 
					ELSE NULL 
				END), 0) as avg_time
			FROM users 
			LEFT JOIN tickets ON users.id = tickets.assigned_to 
			WHERE users.id = ? AND users.role IN ('admin', 'staff')
			GROUP BY users.id, users.name, users.email
			ORDER BY count DESC, avg_time ASC
		`
		staffArgs = []interface{}{user.ID}
	} else {
		// Admin thấy tất cả staff
		staffQuery = `
			SELECT 
				users.id as staff_id, 
				users.name, 
				users.email, 
				COALESCE(COUNT(tickets.id), 0) as count,
				COALESCE(AVG(CASE 
					WHEN tickets.status = 'Đã xử lý' AND tickets.resolved_at IS NOT NULL 
					THEN TIMESTAMPDIFF(SECOND, tickets.created_at, tickets.resolved_at)/3600 
					ELSE NULL 
				END), 0) as avg_time
			FROM users 
			LEFT JOIN tickets ON users.id = tickets.assigned_to 
			WHERE users.role IN ('admin', 'staff')
			GROUP BY users.id, users.name, users.email
			ORDER BY count DESC, avg_time ASC
			LIMIT 5
		`
	}

	models.DB.Raw(staffQuery, staffArgs...).Scan(&staffStats)

	// Tính tỷ lệ giải quyết all time
	var totalResolvedTickets int64
	resolutionQuery := models.DB.Model(&models.Ticket{}).Where("status = 'Đã xử lý'")
	if userRole == "staff" {
		resolutionQuery = resolutionQuery.Where("assigned_to = ?", user.ID)
	}
	resolutionQuery.Count(&totalResolvedTickets)

	resolutionRate := float64(0)
	if totalTickets > 0 {
		resolutionRate = (float64(totalResolvedTickets) / float64(totalTickets)) * 100
	}

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"total_tickets":               totalTickets,
			"processing_tickets":          processingTickets,
			"avg_processing_time":         avgProcessingTime,
			"status_distribution":         statusStats,
			"tickets_this_month":          ticketsThisMonth,
			"tickets_resolved_this_month": ticketsResolvedThisMonth,
			"top_staff":                   staffStats,
			"resolution_rate":             resolutionRate,
		},
	})
}

// AdminUpdateTicketStatus cập nhật trạng thái và ưu tiên của ticket
func AdminUpdateTicketStatus(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID := c.Params("id")
	type UpdateInput struct {
		Status     string `json:"status"`
		PriorityID uint   `json:"priority_id"`
	}
	var input UpdateInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Dữ liệu không hợp lệ",
			"success": false,
		})
	}
	var ticket models.Ticket
	if err := models.DB.First(&ticket, ticketID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Không tìm thấy ticket",
			"success": false,
		})
	}
	if user.Role == "staff" && (ticket.AssignedTo == nil || *ticket.AssignedTo != user.ID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Bạn không có quyền cập nhật ticket này",
			"success": false,
		})
	}
	// Cập nhật trạng thái
	if input.Status != "" {
		ticket.Status = input.Status
		if input.Status == "Đã xử lý" {
			now := time.Now()
			ticket.ResolvedAt = &now
		}
	}
	// Cập nhật ưu tiên
	if input.PriorityID > 0 {
		ticket.PriorityID = input.PriorityID
	}
	if err := models.DB.Save(&ticket).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Không thể cập nhật ticket",
			"success": false,
		})
	}
	// Tạo notification cho user khi trạng thái ticket thay đổi
	if ticket.UserID > 0 && input.Status != "" {
		notifData, _ := json.Marshal(fiber.Map{"ticket_id": ticket.ID, "action": "status", "status": ticket.Status})
		n := models.Notification{
			UserID:  ticket.UserID,
			Type:    "ticket_status",
			Content: "Trạng thái ticket #" + strconv.Itoa(int(ticket.ID)) + " đã thay đổi thành '" + ticket.Status + "'",
			Data:    string(notifData),
		}
		models.DB.Create(&n)
	}
	return c.JSON(fiber.Map{
		"message": "Cập nhật ticket thành công",
		"success": true,
		"ticket":  ticket,
	})
}

// AdminGetTicketDetail trả về chi tiết ticket cho admin
func AdminGetTicketDetail(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID := c.Params("id")
	var ticket models.Ticket
	if err := models.DB.Preload("User").Preload("Assigned").Preload("Category").Preload("Priority").Preload("ProductType").First(&ticket, ticketID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Không tìm thấy ticket",
			"success": false,
		})
	}
	if user.Role == "staff" && (ticket.AssignedTo == nil || *ticket.AssignedTo != user.ID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Bạn không có quyền truy cập ticket này",
			"success": false,
		})
	}
	var cat fiber.Map
	if ticket.CategoryID > 0 {
		cat = fiber.Map{"id": ticket.CategoryID, "name": ticket.Category.Name}
	} else {
		cat = fiber.Map{"id": nil, "name": "Không xác định"}
	}
	var prod fiber.Map
	if ticket.ProductTypeID > 0 {
		prod = fiber.Map{"id": ticket.ProductTypeID, "name": ticket.ProductType.Name}
	} else {
		prod = fiber.Map{"id": nil, "name": "Không xác định"}
	}
	var pri fiber.Map
	if ticket.PriorityID > 0 {
		pri = fiber.Map{"id": ticket.PriorityID, "name": ticket.Priority.Name}
	} else {
		pri = fiber.Map{"id": nil, "name": "Không xác định"}
	}
	resp := fiber.Map{
		"id":              ticket.ID,
		"title":           ticket.Title,
		"description":     ticket.Description,
		"category":        cat,
		"status":          ticket.Status,
		"priority":        pri,
		"created_at":      ticket.CreatedAt,
		"updated_at":      ticket.UpdatedAt,
		"resolved_at":     ticket.ResolvedAt,
		"attachment_path": ticket.AttachmentPath,
		"product_type":    prod,
		"user": fiber.Map{
			"id":    ticket.User.ID,
			"name":  ticket.User.Name,
			"email": ticket.User.Email,
			"role":  ticket.User.Role,
		},
	}
	if ticket.Assigned != nil {
		resp["assigned"] = fiber.Map{
			"id":    ticket.Assigned.ID,
			"name":  ticket.Assigned.Name,
			"email": ticket.Assigned.Email,
			"role":  ticket.Assigned.Role,
		}
	}
	return c.JSON(fiber.Map{
		"success": true,
		"ticket":  resp,
	})
}

// Lấy danh sách user (lọc theo role, keyword)
func AdminListUsers(c *fiber.Ctx) error {
	role := c.Query("role")
	keyword := c.Query("keyword")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	var users []models.User
	query := models.DB.Model(&models.User{})
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if keyword != "" {
		kw := "%" + strings.ToLower(keyword) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?", kw, kw, kw)
	}

	var total int64
	query.Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset((page - 1) * limit).Find(&users).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách user"})
	}
	result := make([]fiber.Map, 0, len(users))
	for _, u := range users {
		result = append(result, fiber.Map{
			"id":          u.ID,
			"name":        u.Name,
			"email":       u.Email,
			"phone":       u.Phone,
			"role":        u.Role,
			"is_verified": u.IsVerified,
			"created_at":  u.CreatedAt,
			"updated_at":  u.UpdatedAt,
		})
	}
	return c.JSON(fiber.Map{
		"users": result,
		"pagination": fiber.Map{
			"total": total,
			"pages": int((total + int64(limit) - 1) / int64(limit)),
		},
	})
}

// Thêm user mới
func AdminCreateUser(c *fiber.Ctx) error {
	type Input struct {
		Name     string `json:"name"`
		Phone    string `json:"phone"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	var input Input
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dữ liệu không hợp lệ"})
	}
	if input.Name == "" || input.Email == "" || input.Password == "" || input.Role == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Thiếu thông tin bắt buộc"})
	}
	var exist models.User
	if err := models.DB.Where("email = ?", input.Email).First(&exist).Error; err == nil {
		return c.Status(409).JSON(fiber.Map{"error": "Email đã tồn tại"})
	}
	hashed := fmt.Sprintf("%x", sha256.Sum256([]byte(input.Password)))
	user := models.User{
		Name:         strings.TrimSpace(input.Name),
		Phone:        input.Phone,
		Email:        strings.ToLower(input.Email),
		PasswordHash: hashed,
		Role:         input.Role,
		IsVerified:   true,
	}
	if err := models.DB.Create(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể tạo user"})
	}
	return c.JSON(fiber.Map{"success": true, "user_id": user.ID})
}

// Sửa user
func AdminUpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	type Input struct {
		Name  string `json:"name"`
		Phone string `json:"phone"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	var input Input
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dữ liệu không hợp lệ"})
	}
	var user models.User
	if err := models.DB.First(&user, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy user"})
	}
	if input.Name != "" {
		user.Name = input.Name
	}
	if input.Phone != "" {
		user.Phone = input.Phone
	}
	if input.Email != "" && input.Email != user.Email {
		var exist models.User
		if err := models.DB.Where("email = ?", input.Email).First(&exist).Error; err == nil && exist.ID != user.ID {
			return c.Status(409).JSON(fiber.Map{"error": "Email đã tồn tại"})
		}
		user.Email = input.Email
	}
	if input.Role != "" {
		user.Role = input.Role
	}
	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể cập nhật user"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// Xóa user
func AdminDeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := models.DB.Delete(&models.User{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể xóa user"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// Đổi vai trò user
func AdminChangeUserRole(c *fiber.Ctx) error {
	id := c.Params("id")
	type Input struct {
		Role string `json:"role"`
	}
	var input Input
	if err := c.BodyParser(&input); err != nil || input.Role == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Dữ liệu không hợp lệ"})
	}
	var user models.User
	if err := models.DB.First(&user, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy user"})
	}
	user.Role = input.Role
	if err := models.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể đổi vai trò user"})
	}
	return c.JSON(fiber.Map{"success": true})
}
