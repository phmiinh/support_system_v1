package controllers

import (
	"awesomeProject/models"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gopkg.in/gomail.v2"
)

func sendTicketEmail(to, subject, body string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = smtpUser
	}
	port := 587
	if smtpPort != "" {
		fmt.Sscanf(smtpPort, "%d", &port)
	}
	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)
	d := gomail.NewDialer(smtpHost, port, smtpUser, smtpPass)
	return d.DialAndSend(m)
}

func CreateTicket(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)

	title := c.FormValue("title")
	description := c.FormValue("description")
	categoryID, err := strconv.ParseUint(c.FormValue("category_id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID category không hợp lệ"})
	}
	productTypeID, err := strconv.ParseUint(c.FormValue("product_type_id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID product type không hợp lệ"})
	}
	priorityID, err := strconv.ParseUint(c.FormValue("priority_id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID priority không hợp lệ"})
	}

	// Xử lý file đính kèm (nếu có)
	var attachmentPath string
	fileHeader, err := c.FormFile("attachment")
	if err == nil && fileHeader != nil {
		// Tạo thư mục uploads/tickets nếu chưa có
		uploadDir := "uploads/tickets"
		os.MkdirAll(uploadDir, os.ModePerm)
		// Đặt tên file duy nhất
		timestamp := strconv.FormatInt(time.Now().UnixNano(), 10)
		ext := filepath.Ext(fileHeader.Filename)
		filename := "ticket_" + timestamp + ext
		filePath := filepath.Join(uploadDir, filename)
		if err := c.SaveFile(fileHeader, filePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Lưu file thất bại"})
		}
		attachmentPath = "/uploads/tickets/" + filename
	}

	ticket := models.Ticket{
		UserID:         user.ID,
		Title:          title,
		Description:    description,
		CategoryID:     uint(categoryID),
		ProductTypeID:  uint(productTypeID),
		PriorityID:     uint(priorityID),
		Status:         "Mới",
		AttachmentPath: attachmentPath,
	}

	if err := models.DB.Create(&ticket).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Tạo ticket thất bại"})
	}
	// Gửi email xác nhận nếu user đã xác thực
	if user.IsVerified && user.Email != "" {
		subject := fmt.Sprintf("[Support] Ticket mới #%d: %s", ticket.ID, ticket.Title)
		body := fmt.Sprintf("<p>Xin chào %s,</p><p>Bạn đã tạo ticket thành công với tiêu đề: <b>%s</b></p><p><b>Loại ticket:</b> %s<br><b>Loại sản phẩm:</b> %s<br><b>Mức độ ưu tiên:</b> %s</p><p><b>Nội dung:</b> %s</p><p>Chúng tôi sẽ phản hồi sớm nhất có thể.</p>", user.Name, ticket.Title, ticket.Category.Name, ticket.ProductType.Name, ticket.Priority.Name, ticket.Description)
		go func() {
			err := sendTicketEmail(user.Email, subject, body)
			if err != nil {
				fmt.Printf("[MAIL ERROR] To: %s | Subject: %s | Error: %v\n", user.Email, subject, err)
			}
		}()
	}
	// Gửi email cho tất cả admin đã xác thực
	var admins []models.User
	models.DB.Where("role = ?", "admin").Where("is_verified = ?", true).Find(&admins)
	for _, admin := range admins {
		if admin.Email != "" {
			subject := fmt.Sprintf("[Support] Ticket mới #%d: %s", ticket.ID, ticket.Title)
			body := fmt.Sprintf("<p>Admin thân mến,</p><p>Khách hàng <b>%s</b> vừa tạo ticket mới: <b>%s</b></p><p><b>Loại ticket:</b> %s<br><b>Loại sản phẩm:</b> %s<br><b>Mức độ ưu tiên:</b> %s</p><p><b>Nội dung:</b> %s</p>", user.Name, ticket.Title, ticket.Category.Name, ticket.ProductType.Name, ticket.Priority.Name, ticket.Description)
			go func(email, subject, body string) {
				err := sendTicketEmail(email, subject, body)
				if err != nil {
					fmt.Printf("[MAIL ERROR] To: %s | Subject: %s | Error: %v\n", email, subject, err)
				}
			}(admin.Email, subject, body)
		}
		// Tạo notification cho admin
		n := models.Notification{
			UserID:  admin.ID,
			Type:    "ticket_new",
			Content: fmt.Sprintf("Ticket mới #%d: %s từ %s", ticket.ID, ticket.Title, user.Name),
			Data:    fmt.Sprintf(`{"ticket_id":%d,"user_id":%d}`, ticket.ID, user.ID),
		}
		models.DB.Create(&n)
	}
	return c.JSON(fiber.Map{"success": true, "ticket": ticket})
}

func GetMyTickets(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	status := c.Query("status")
	priority := c.Query("priority")
	priorityID := c.Query("priority_id")
	categoryID := c.Query("category_id")
	category := c.Query("category")
	productType := c.Query("product_type")
	productTypeID := c.Query("product_type_id")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	var tickets []models.Ticket
	query := models.DB.Preload("User").Preload("Assigned").Preload("Category").Preload("Priority").Preload("ProductType")

	// Filter by user role
	if user.Role == "staff" {
		query = query.Where("assigned_to = ?", user.ID)
	} else if user.Role == "customer" {
		query = query.Where("user_id = ?", user.ID)
	}

	// Apply filters
	if status != "" && status != "Tất cả" {
		query = query.Where("status = ?", status)
	}
	if priorityID != "" {
		if id, err := strconv.Atoi(priorityID); err == nil {
			query = query.Where("priority_id = ?", id)
		}
	} else if priority != "" && priority != "Tất cả" {
		query = query.Joins("JOIN ticket_priorities ON tickets.priority_id = ticket_priorities.id").Where("ticket_priorities.name = ?", priority)
	}
	if categoryID != "" {
		if id, err := strconv.Atoi(categoryID); err == nil {
			query = query.Where("category_id = ?", id)
		}
	} else if category != "" && category != "Tất cả" {
		query = query.Joins("JOIN ticket_categories ON tickets.category_id = ticket_categories.id").Where("ticket_categories.name = ?", category)
	}
	if productTypeID != "" {
		if id, err := strconv.Atoi(productTypeID); err == nil {
			query = query.Where("product_type_id = ?", id)
		}
	} else if productType != "" && productType != "Tất cả" {
		query = query.Joins("JOIN ticket_product_types ON tickets.product_type_id = ticket_product_types.id").Where("ticket_product_types.name = ?", productType)
	}
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("title LIKE ? OR description LIKE ?", searchTerm, searchTerm)
	}
	if fromDate != "" {
		if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if toDate != "" {
		if t, err := time.Parse("2006-01-02", toDate); err == nil {
			query = query.Where("created_at < ?", t.Add(24*time.Hour))
		}
	}

	// Count total for pagination
	total := int64(0)
	countQuery := models.DB.Model(&models.Ticket{})
	if user.Role == "staff" {
		countQuery = countQuery.Where("assigned_to = ?", user.ID)
	} else if user.Role == "customer" {
		countQuery = countQuery.Where("user_id = ?", user.ID)
	}
	if status != "" && status != "Tất cả" {
		countQuery = countQuery.Where("status = ?", status)
	}
	if priorityID != "" {
		if id, err := strconv.Atoi(priorityID); err == nil {
			countQuery = countQuery.Where("priority_id = ?", id)
		}
	} else if priority != "" && priority != "Tất cả" {
		countQuery = countQuery.Joins("JOIN ticket_priorities ON tickets.priority_id = ticket_priorities.id").Where("ticket_priorities.name = ?", priority)
	}
	if categoryID != "" {
		if id, err := strconv.Atoi(categoryID); err == nil {
			countQuery = countQuery.Where("category_id = ?", id)
		}
	} else if category != "" && category != "Tất cả" {
		countQuery = countQuery.Joins("JOIN ticket_categories ON tickets.category_id = ticket_categories.id").Where("ticket_categories.name = ?", category)
	}
	if productTypeID != "" {
		if id, err := strconv.Atoi(productTypeID); err == nil {
			countQuery = countQuery.Where("product_type_id = ?", id)
		}
	} else if productType != "" && productType != "Tất cả" {
		countQuery = countQuery.Joins("JOIN ticket_product_types ON tickets.product_type_id = ticket_product_types.id").Where("ticket_product_types.name = ?", productType)
	}
	if search != "" {
		searchTerm := "%" + search + "%"
		countQuery = countQuery.Where("title LIKE ? OR description LIKE ?", searchTerm, searchTerm)
	}
	if fromDate != "" {
		if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			countQuery = countQuery.Where("created_at >= ?", t)
		}
	}
	if toDate != "" {
		if t, err := time.Parse("2006-01-02", toDate); err == nil {
			countQuery = countQuery.Where("created_at < ?", t.Add(24*time.Hour))
		}
	}

	countQuery.Count(&total)

	// Apply pagination and ordering
	if err := query.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&tickets).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách ticket"})
	}
	// Lấy comment mới nhất cho từng ticket
	var result []fiber.Map
	for _, t := range tickets {
		var lastComment models.TicketComment
		models.DB.Where("ticket_id = ?", t.ID).Order("created_at DESC").First(&lastComment)
		var hasNewReply bool
		if lastComment.ID > 0 && (t.LastViewedCommentAt == nil || lastComment.CreatedAt.After(*t.LastViewedCommentAt)) {
			hasNewReply = true
		}
		assigned := fiber.Map{}
		if t.Assigned != nil {
			assigned = fiber.Map{
				"id":    t.Assigned.ID,
				"name":  t.Assigned.Name,
				"email": t.Assigned.Email,
				"role":  t.Assigned.Role,
			}
		}
		var cat fiber.Map
		if t.CategoryID > 0 {
			cat = fiber.Map{"id": t.CategoryID, "name": t.Category.Name}
		} else {
			cat = fiber.Map{"id": nil, "name": "Không xác định"}
		}
		var pri fiber.Map
		if t.PriorityID > 0 {
			pri = fiber.Map{"id": t.PriorityID, "name": t.Priority.Name}
		} else {
			pri = fiber.Map{"id": nil, "name": "Không xác định"}
		}
		var prod fiber.Map
		if t.ProductTypeID > 0 {
			prod = fiber.Map{"id": t.ProductTypeID, "name": t.ProductType.Name}
		} else {
			prod = fiber.Map{"id": nil, "name": "Không xác định"}
		}
		result = append(result, fiber.Map{
			"id":              t.ID,
			"title":           t.Title,
			"description":     t.Description,
			"category":        cat,
			"status":          t.Status,
			"priority":        pri,
			"created_at":      t.CreatedAt,
			"resolved_at":     t.ResolvedAt,
			"attachment_path": t.AttachmentPath,
			"product_type":    prod,
			"has_new_reply":   hasNewReply,
			"assigned_to":     t.AssignedTo,
			"assigned":        assigned,
			"user": fiber.Map{
				"id":    t.User.ID,
				"name":  t.User.Name,
				"email": t.User.Email,
				"role":  t.User.Role,
			},
		})
	}
	return c.JSON(fiber.Map{
		"tickets": result,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

func GetTicketDetail(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID := c.Params("id")

	var ticket models.Ticket
	if err := models.DB.Preload("User").Preload("Assigned").Preload("Category").Preload("Priority").Preload("ProductType").Where("id = ?", ticketID).First(&ticket).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	if user.Role == "staff" && (ticket.AssignedTo == nil || *ticket.AssignedTo != user.ID) {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	if user.Role == "customer" && ticket.UserID != user.ID {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	// Lấy comment mới nhất
	var lastComment models.TicketComment
	models.DB.Where("ticket_id = ?", ticketID).Order("created_at DESC").First(&lastComment)
	if lastComment.ID > 0 {
		if ticket.LastViewedCommentAt == nil || lastComment.CreatedAt.After(*ticket.LastViewedCommentAt) {
			ticket.LastViewedCommentAt = &lastComment.CreatedAt
			models.DB.Model(&ticket).Update("last_viewed_comment_at", lastComment.CreatedAt)
		}
	}
	var cat fiber.Map
	if ticket.CategoryID > 0 {
		cat = fiber.Map{"id": ticket.CategoryID, "name": ticket.Category.Name}
	} else {
		cat = fiber.Map{"id": nil, "name": "Không xác định"}
	}
	var pri fiber.Map
	if ticket.PriorityID > 0 {
		pri = fiber.Map{"id": ticket.PriorityID, "name": ticket.Priority.Name}
	} else {
		pri = fiber.Map{"id": nil, "name": "Không xác định"}
	}
	var prod fiber.Map
	if ticket.ProductTypeID > 0 {
		prod = fiber.Map{"id": ticket.ProductTypeID, "name": ticket.ProductType.Name}
	} else {
		prod = fiber.Map{"id": nil, "name": "Không xác định"}
	}
	return c.JSON(fiber.Map{
		"ticket": fiber.Map{
			"id":              ticket.ID,
			"title":           ticket.Title,
			"description":     ticket.Description,
			"category":        cat,
			"status":          ticket.Status,
			"priority":        pri,
			"created_at":      ticket.CreatedAt,
			"resolved_at":     ticket.ResolvedAt,
			"attachment_path": ticket.AttachmentPath,
			"product_type":    prod,
			"user": fiber.Map{
				"id":    ticket.User.ID,
				"name":  ticket.User.Name,
				"email": ticket.User.Email,
				"role":  ticket.User.Role,
			},
			"last_viewed_comment_at": ticket.LastViewedCommentAt,
		},
	})
}

// Get all comments for a ticket (user or admin)
func GetTicketComments(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID := c.Params("id")
	var ticket models.Ticket
	if err := models.DB.First(&ticket, ticketID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	if user.Role == "staff" && (ticket.AssignedTo == nil || *ticket.AssignedTo != user.ID) {
		return c.Status(403).JSON(fiber.Map{"error": "Bạn không có quyền xem bình luận ticket này"})
	}
	var comments []models.TicketComment
	if err := models.DB.Preload("User").Where("ticket_id = ?", ticketID).Order("created_at ASC").Find(&comments).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách bình luận"})
	}
	// Build response with author_name fallback (role tiếng Anh)
	var result []fiber.Map
	for _, c := range comments {
		authorName := "Ẩn danh"
		if c.User.ID != 0 {
			if c.User.Name != "" {
				authorName = c.User.Name
			} else if c.User.Role == "admin" {
				authorName = "Admin"
			} else if c.User.Role == "staff" {
				authorName = "Nhân viên"
			} else if c.User.Role == "customer" {
				authorName = "Khách hàng"
			}
		}
		result = append(result, fiber.Map{
			"id":             c.ID,
			"content":        c.Content,
			"created_at":     c.CreatedAt,
			"attachment_url": c.AttachmentPath,
			"author_name":    authorName,
			"parent_id":      c.ParentID, // Thêm parent_id vào response
		})
	}
	return c.JSON(fiber.Map{"comments": result})
}

// Post a new comment to a ticket (user or admin)
func PostTicketComment(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID ticket không hợp lệ"})
	}
	var ticket models.Ticket
	if err := models.DB.First(&ticket, ticketID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	if user.Role == "staff" && (ticket.AssignedTo == nil || *ticket.AssignedTo != user.ID) {
		return c.Status(403).JSON(fiber.Map{"error": "Bạn không có quyền phản hồi ticket này"})
	}
	if user.Role == "customer" && ticket.UserID != user.ID {
		return c.Status(403).JSON(fiber.Map{"error": "Bạn không có quyền phản hồi ticket này"})
	}

	content := c.FormValue("content")
	if content == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Nội dung bình luận không hợp lệ"})
	}

	// Xử lý file đính kèm (nếu có)
	var attachmentPath string
	fileHeader, err := c.FormFile("attachment")
	if err == nil && fileHeader != nil {
		uploadDir := "uploads/comments"
		os.MkdirAll(uploadDir, os.ModePerm)
		timestamp := strconv.FormatInt(time.Now().UnixNano(), 10)
		ext := filepath.Ext(fileHeader.Filename)
		filename := "comment_" + timestamp + ext
		filePath := filepath.Join(uploadDir, filename)
		if err := c.SaveFile(fileHeader, filePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Lưu file đính kèm thất bại"})
		}
		attachmentPath = filePath
	}

	// Lấy parent_id nếu có
	var parentID *uint = nil
	if pidStr := c.FormValue("parent_id"); pidStr != "" {
		if pid, err := strconv.ParseUint(pidStr, 10, 64); err == nil {
			pidUint := uint(pid)
			parentID = &pidUint
		}
	}

	comment := models.TicketComment{
		TicketID:       uint(ticketID),
		UserID:         user.ID,
		Content:        content,
		AttachmentPath: attachmentPath,
		ParentID:       parentID, // Lưu parent_id nếu có
		CreatedAt:      time.Now(),
	}
	if err := models.DB.Create(&comment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể tạo bình luận"})
	}
	// Lấy lại comment với thông tin user
	models.DB.Preload("User").First(&comment, comment.ID)

	// Gửi notification cho các bên liên quan
	if user.Role == "customer" {
		// Gửi cho staff được assigned hoặc cho tất cả admin nếu chưa assigned
		if ticket.AssignedTo != nil {
			var staff models.User
			if err := models.DB.First(&staff, *ticket.AssignedTo).Error; err == nil && staff.ID != user.ID {
				n := models.Notification{
					UserID:  staff.ID,
					Type:    "ticket_comment",
					Content: fmt.Sprintf("Khách hàng vừa bình luận mới trên ticket #%d: %s", ticket.ID, ticket.Title),
					Data:    fmt.Sprintf(`{"ticket_id":%d,"comment_id":%d}`, ticket.ID, comment.ID),
				}
				models.DB.Create(&n)
			}
		} else {
			var admins []models.User
			models.DB.Where("role = ?", "admin").Find(&admins)
			for _, admin := range admins {
				if admin.ID != user.ID {
					n := models.Notification{
						UserID:  admin.ID,
						Type:    "ticket_comment",
						Content: fmt.Sprintf("Khách hàng vừa bình luận mới trên ticket #%d: %s", ticket.ID, ticket.Title),
						Data:    fmt.Sprintf(`{"ticket_id":%d,"comment_id":%d}`, ticket.ID, comment.ID),
					}
					models.DB.Create(&n)
				}
			}
		}
	} else if user.Role == "admin" || user.Role == "staff" {
		// Gửi cho chủ ticket nếu không phải là người vừa bình luận
		if ticket.UserID != user.ID {
			n := models.Notification{
				UserID:  ticket.UserID,
				Type:    "ticket_comment",
				Content: fmt.Sprintf("Có phản hồi mới từ %s trên ticket #%d: %s", user.Name, ticket.ID, ticket.Title),
				Data:    fmt.Sprintf(`{"ticket_id":%d,"comment_id":%d}`, ticket.ID, comment.ID),
			}
			models.DB.Create(&n)
		}
	}

	return c.JSON(fiber.Map{"success": true, "comment": comment})
}

// Lấy danh sách user có role admin hoặc staff
func GetAssignableStaff(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Chỉ admin mới có quyền phân công ticket"})
	}
	var staff []models.User
	if err := models.DB.Where("role IN ?", []string{"admin", "staff"}).Find(&staff).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách nhân viên"})
	}
	result := make([]fiber.Map, 0, len(staff))
	for _, s := range staff {
		result = append(result, fiber.Map{
			"id":    s.ID,
			"name":  s.Name,
			"email": s.Email,
			"role":  s.Role,
		})
	}
	return c.JSON(fiber.Map{"staff": result})
}

// Phân công ticket cho staff (chỉ admin)
func AssignTicket(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Chỉ admin mới có quyền phân công ticket"})
	}
	ticketID := c.Params("id")
	type AssignInput struct {
		AssignedTo uint `json:"assigned_to"`
	}
	var input AssignInput
	if err := c.BodyParser(&input); err != nil || input.AssignedTo == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Dữ liệu phân công không hợp lệ"})
	}
	var ticket models.Ticket
	if err := models.DB.First(&ticket, ticketID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	var staff models.User
	if err := models.DB.First(&staff, input.AssignedTo).Error; err != nil || (staff.Role != "admin" && staff.Role != "staff") {
		return c.Status(400).JSON(fiber.Map{"error": "Người được phân công không hợp lệ"})
	}
	ticket.AssignedTo = &input.AssignedTo
	if err := models.DB.Save(&ticket).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể phân công ticket"})
	}
	return c.JSON(fiber.Map{"success": true, "assigned_to": input.AssignedTo})
}

// AdminGetTickets - Lấy danh sách ticket cho admin với tìm kiếm, lọc và phân trang
func AdminGetTickets(c *fiber.Ctx) error {
	status := c.Query("status")
	priority := c.Query("priority")
	priorityID := c.Query("priority_id")
	categoryID := c.Query("category_id")
	category := c.Query("category")
	productType := c.Query("product_type")
	productTypeID := c.Query("product_type_id")
	assignedTo := c.Query("assigned_to")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	var tickets []models.Ticket
	query := models.DB.Preload("User").Preload("Assigned").Preload("Category").Preload("Priority").Preload("ProductType")

	// Apply filters
	if status != "" && status != "Tất cả" {
		query = query.Where("status = ?", status)
	}
	if priorityID != "" {
		if id, err := strconv.Atoi(priorityID); err == nil {
			query = query.Where("priority_id = ?", id)
		}
	} else if priority != "" && priority != "Tất cả" {
		query = query.Joins("JOIN ticket_priorities ON tickets.priority_id = ticket_priorities.id").Where("ticket_priorities.name = ?", priority)
	}
	if categoryID != "" {
		if id, err := strconv.Atoi(categoryID); err == nil {
			query = query.Where("category_id = ?", id)
		}
	} else if category != "" && category != "Tất cả" {
		query = query.Joins("JOIN ticket_categories ON tickets.category_id = ticket_categories.id").Where("ticket_categories.name = ?", category)
	}
	if productTypeID != "" {
		if id, err := strconv.Atoi(productTypeID); err == nil {
			query = query.Where("product_type_id = ?", id)
		}
	} else if productType != "" && productType != "Tất cả" {
		query = query.Joins("JOIN ticket_product_types ON tickets.product_type_id = ticket_product_types.id").Where("ticket_product_types.name = ?", productType)
	}
	if assignedTo != "" {
		if id, err := strconv.Atoi(assignedTo); err == nil {
			query = query.Where("assigned_to = ?", id)
		}
	}
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("title LIKE ? OR description LIKE ? OR users.name LIKE ? OR users.email LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm)
		query = query.Joins("LEFT JOIN users ON tickets.user_id = users.id")
	}
	if fromDate != "" {
		if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if toDate != "" {
		if t, err := time.Parse("2006-01-02", toDate); err == nil {
			query = query.Where("created_at < ?", t.Add(24*time.Hour))
		}
	}

	// Count total for pagination
	total := int64(0)
	countQuery := models.DB.Model(&models.Ticket{})
	if status != "" && status != "Tất cả" {
		countQuery = countQuery.Where("status = ?", status)
	}
	if priorityID != "" {
		if id, err := strconv.Atoi(priorityID); err == nil {
			countQuery = countQuery.Where("priority_id = ?", id)
		}
	} else if priority != "" && priority != "Tất cả" {
		countQuery = countQuery.Joins("JOIN ticket_priorities ON tickets.priority_id = ticket_priorities.id").Where("ticket_priorities.name = ?", priority)
	}
	if categoryID != "" {
		if id, err := strconv.Atoi(categoryID); err == nil {
			countQuery = countQuery.Where("category_id = ?", id)
		}
	} else if category != "" && category != "Tất cả" {
		countQuery = countQuery.Joins("JOIN ticket_categories ON tickets.category_id = ticket_categories.id").Where("ticket_categories.name = ?", category)
	}
	if productTypeID != "" {
		if id, err := strconv.Atoi(productTypeID); err == nil {
			countQuery = countQuery.Where("product_type_id = ?", id)
		}
	} else if productType != "" && productType != "Tất cả" {
		countQuery = countQuery.Joins("JOIN ticket_product_types ON tickets.product_type_id = ticket_product_types.id").Where("ticket_product_types.name = ?", productType)
	}
	if assignedTo != "" {
		if id, err := strconv.Atoi(assignedTo); err == nil {
			countQuery = countQuery.Where("assigned_to = ?", id)
		}
	}
	if search != "" {
		searchTerm := "%" + search + "%"
		countQuery = countQuery.Joins("LEFT JOIN users ON tickets.user_id = users.id")
		countQuery = countQuery.Where("tickets.title LIKE ? OR tickets.description LIKE ? OR users.name LIKE ? OR users.email LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm)
	}
	if fromDate != "" {
		if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			countQuery = countQuery.Where("created_at >= ?", t)
		}
	}
	if toDate != "" {
		if t, err := time.Parse("2006-01-02", toDate); err == nil {
			countQuery = countQuery.Where("created_at < ?", t.Add(24*time.Hour))
		}
	}

	countQuery.Count(&total)

	// Apply pagination and ordering
	if err := query.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&tickets).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách ticket"})
	}
	var result []fiber.Map
	for _, t := range tickets {
		assigned := fiber.Map{}
		if t.Assigned != nil {
			assigned = fiber.Map{
				"id":    t.Assigned.ID,
				"name":  t.Assigned.Name,
				"email": t.Assigned.Email,
				"role":  t.Assigned.Role,
			}
		}
		var cat fiber.Map
		if t.CategoryID > 0 {
			cat = fiber.Map{"id": t.CategoryID, "name": t.Category.Name}
		} else {
			cat = fiber.Map{"id": nil, "name": "Không xác định"}
		}
		var pri fiber.Map
		if t.PriorityID > 0 {
			pri = fiber.Map{"id": t.PriorityID, "name": t.Priority.Name}
		} else {
			pri = fiber.Map{"id": nil, "name": "Không xác định"}
		}
		var prod fiber.Map
		if t.ProductTypeID > 0 {
			prod = fiber.Map{"id": t.ProductTypeID, "name": t.ProductType.Name}
		} else {
			prod = fiber.Map{"id": nil, "name": "Không xác định"}
		}
		result = append(result, fiber.Map{
			"id":              t.ID,
			"title":           t.Title,
			"description":     t.Description,
			"category":        cat,
			"status":          t.Status,
			"priority":        pri,
			"created_at":      t.CreatedAt,
			"resolved_at":     t.ResolvedAt,
			"attachment_path": t.AttachmentPath,
			"product_type":    prod,
			"user": fiber.Map{
				"id":    t.User.ID,
				"name":  t.User.Name,
				"email": t.User.Email,
				"role":  t.User.Role,
			},
			"assigned_to": t.AssignedTo,
			"assigned":    assigned,
		})
	}
	return c.JSON(fiber.Map{
		"tickets": result,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// Update ticket (user)
func UpdateMyTicket(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID := c.Params("id")
	var ticket models.Ticket
	if err := models.DB.First(&ticket, ticketID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	if ticket.UserID != user.ID {
		return c.Status(403).JSON(fiber.Map{"error": "Bạn không có quyền sửa ticket này"})
	}
	if ticket.Status != "Mới" {
		return c.Status(400).JSON(fiber.Map{"error": "Chỉ được sửa ticket khi trạng thái là 'Mới'"})
	}
	type UpdateInput struct {
		Title         string `json:"title"`
		Description   string `json:"description"`
		CategoryID    uint   `json:"category_id"`
		ProductTypeID uint   `json:"product_type_id"`
		PriorityID    uint   `json:"priority_id"`
	}
	var input UpdateInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dữ liệu không hợp lệ"})
	}
	if input.Title != "" {
		ticket.Title = input.Title
	}
	if input.Description != "" {
		ticket.Description = input.Description
	}
	if input.CategoryID != 0 {
		ticket.CategoryID = input.CategoryID
	}
	if input.ProductTypeID != 0 {
		ticket.ProductTypeID = input.ProductTypeID
	}
	if input.PriorityID != 0 {
		ticket.PriorityID = input.PriorityID
	}
	if err := models.DB.Save(&ticket).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể cập nhật ticket"})
	}
	// Tạo notification cho admin
	var admins []models.User
	models.DB.Where("role = ?", "admin").Find(&admins)
	notifData, _ := json.Marshal(fiber.Map{"ticket_id": ticket.ID, "action": "update", "user_id": user.ID})
	for _, admin := range admins {
		n := models.Notification{
			UserID:  admin.ID,
			Type:    "ticket_update",
			Content: "Khách hàng đã sửa ticket #" + strconv.Itoa(int(ticket.ID)),
			Data:    string(notifData),
		}
		models.DB.Create(&n)
	}
	return c.JSON(fiber.Map{"success": true, "ticket": ticket})
}

// Delete ticket (user)
func DeleteMyTicket(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	ticketID := c.Params("id")
	var ticket models.Ticket
	if err := models.DB.First(&ticket, ticketID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy ticket"})
	}
	if ticket.UserID != user.ID {
		return c.Status(403).JSON(fiber.Map{"error": "Bạn không có quyền thu hồi ticket này"})
	}
	if ticket.Status != "Mới" {
		return c.Status(400).JSON(fiber.Map{"error": "Chỉ được thu hồi ticket khi trạng thái là 'Mới'"})
	}
	if err := models.DB.Delete(&ticket).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể thu hồi ticket"})
	}
	// Tạo notification cho admin
	var admins []models.User
	models.DB.Where("role = ?", "admin").Find(&admins)
	notifData, _ := json.Marshal(fiber.Map{"ticket_id": ticket.ID, "action": "delete", "user_id": user.ID})
	for _, admin := range admins {
		n := models.Notification{
			UserID:  admin.ID,
			Type:    "ticket_delete",
			Content: "Khách hàng đã thu hồi ticket #" + strconv.Itoa(int(ticket.ID)),
			Data:    string(notifData),
		}
		models.DB.Create(&n)
	}
	return c.JSON(fiber.Map{"success": true})
}

// Lấy notification cho admin
func AdminGetNotifications(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Chỉ admin mới xem được thông báo"})
	}
	var notifs []models.Notification
	models.DB.Where("user_id = ?", user.ID).Order("created_at DESC").Limit(50).Find(&notifs)
	return c.JSON(fiber.Map{"notifications": notifs})
}

// Đánh dấu đã đọc notification cho admin
func AdminReadNotification(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Chỉ admin mới thao tác được"})
	}
	notifID := c.Params("id")
	var notif models.Notification
	if err := models.DB.First(&notif, notifID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy thông báo"})
	}
	if notif.UserID != user.ID {
		return c.Status(403).JSON(fiber.Map{"error": "Không có quyền với thông báo này"})
	}
	notif.IsRead = true
	if err := models.DB.Save(&notif).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể cập nhật thông báo"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// Lấy danh sách notification cho user
func UserGetNotifications(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	var notifs []models.Notification
	models.DB.Where("user_id = ?", user.ID).Order("created_at DESC").Limit(50).Find(&notifs)
	return c.JSON(fiber.Map{"notifications": notifs})
}

// Đánh dấu đã đọc notification cho user
func UserReadNotification(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)
	notifID := c.Params("id")
	var notif models.Notification
	if err := models.DB.First(&notif, notifID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Không tìm thấy thông báo"})
	}
	if notif.UserID != user.ID {
		return c.Status(403).JSON(fiber.Map{"error": "Không có quyền với thông báo này"})
	}
	notif.IsRead = true
	if err := models.DB.Save(&notif).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không thể cập nhật thông báo"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// Hàm kiểm tra ticket chậm và gửi email nhắc nhở
func CheckAndSendLateTicketReminders() {
	db := models.DB
	var tickets []models.Ticket
	now := time.Now()
	// Lấy các ticket chưa được phản hồi quá 24h (chỉ lấy ticket chưa đóng)
	db.Where("status != ? AND TIMESTAMPDIFF(HOUR, updated_at, ?) >= 24", "Đã đóng", now).Find(&tickets)
	for _, t := range tickets {
		// Gửi cho staff được assigned hoặc cho tất cả admin nếu chưa assigned
		if t.AssignedTo != nil {
			var staff models.User
			db.First(&staff, *t.AssignedTo)
			if staff.Email != "" && staff.IsVerified {
				subject := fmt.Sprintf("[Support] Ticket #%d chưa được phản hồi", t.ID)
				body := fmt.Sprintf("<p>Xin chào %s,</p><p>Ticket <b>%s</b> (ID: %d) được giao cho bạn chưa được phản hồi trong hơn 24h.</p>", staff.Name, t.Title, t.ID)
				go func() {
					err := sendTicketEmail(staff.Email, subject, body)
					if err != nil {
						fmt.Printf("[MAIL ERROR] To: %s | Subject: %s | Error: %v\n", staff.Email, subject, err)
					}
				}()
			}
		} else {
			var admins []models.User
			db.Where("role = ? AND is_verified = ?", "admin", true).Find(&admins)
			for _, admin := range admins {
				if admin.Email != "" {
					subject := fmt.Sprintf("[Support] Ticket #%d chưa được phản hồi", t.ID)
					body := fmt.Sprintf("<p>Admin thân mến,</p><p>Ticket <b>%s</b> (ID: %d) chưa được phản hồi trong hơn 24h.</p>", t.Title, t.ID)
					go func() {
						err := sendTicketEmail(admin.Email, subject, body)
						if err != nil {
							fmt.Printf("[MAIL ERROR] To: %s | Subject: %s | Error: %v\n", admin.Email, subject, err)
						}
					}()
				}
			}
		}
	}
}

// Lấy danh sách loại ticket
func GetTicketCategories(c *fiber.Ctx) error {
	var categories []models.TicketCategory
	if err := models.DB.Find(&categories).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách loại ticket"})
	}
	return c.JSON(fiber.Map{"data": categories})
}

// Lấy danh sách loại sản phẩm
func GetTicketProductTypes(c *fiber.Ctx) error {
	var productTypes []models.TicketProductType
	if err := models.DB.Find(&productTypes).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách loại sản phẩm"})
	}
	return c.JSON(fiber.Map{"data": productTypes})
}

// Lấy danh sách mức độ ưu tiên
func GetTicketPriorities(c *fiber.Ctx) error {
	var priorities []models.TicketPriority
	if err := models.DB.Find(&priorities).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Không lấy được danh sách mức độ ưu tiên"})
	}
	return c.JSON(fiber.Map{"data": priorities})
}

// UserDashboardStats trả về thống kê tổng quan cho user dashboard
func UserDashboardStats(c *fiber.Ctx) error {
	user := c.Locals("user").(models.User)

	var totalTickets int64
	var newTickets int64
	var pendingTickets int64
	var resolvedTickets int64

	// Đếm tổng số ticket của user
	models.DB.Model(&models.Ticket{}).Where("user_id = ?", user.ID).Count(&totalTickets)

	// Đếm ticket mới (chỉ status "Mới")
	models.DB.Model(&models.Ticket{}).Where("user_id = ? AND status = 'Mới'", user.ID).Count(&newTickets)

	// Đếm ticket chờ xử lý ("Đang xử lý" + "Chờ phản hồi")
	models.DB.Model(&models.Ticket{}).Where("user_id = ? AND status IN ('Đang xử lý', 'Chờ phản hồi')", user.ID).Count(&pendingTickets)

	// Đếm ticket đã giải quyết ("Đã xử lý" + "Đã đóng")
	models.DB.Model(&models.Ticket{}).Where("user_id = ? AND status IN ('Đã xử lý', 'Đã đóng')", user.ID).Count(&resolvedTickets)

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"totalTickets":    totalTickets,
			"newTickets":      newTickets,
			"pendingTickets":  pendingTickets,
			"resolvedTickets": resolvedTickets,
		},
	})
}
