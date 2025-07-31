package controllers

import (
	"awesomeProject/models"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gosimple/slug"
)

// API public: Lấy danh sách tài liệu knowledge base cho user
func GetKnowledgeBaseList(c *fiber.Ctx) error {
	var docs []models.KnowledgeBase
	models.DB.Where("is_published = ?", true).Order("created_at DESC").Find(&docs)
	return c.JSON(fiber.Map{"docs": docs})
}

// API user: Lấy chi tiết tài liệu knowledge base theo slug
func GetKnowledgeBaseDetail(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var doc models.KnowledgeBase

	if err := models.DB.Where("slug = ? AND is_published = ?", slug, true).First(&doc).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Không tìm thấy tài liệu"})
	}

	// Tăng số lượt xem
	models.DB.Model(&doc).Update("views", doc.Views+1)

	return c.JSON(fiber.Map{"doc": doc})
}

// API admin: Lấy danh sách tất cả tài liệu knowledge base (có filter/search)
func AdminGetKnowledgeBaseList(c *fiber.Ctx) error {
	var docs []models.KnowledgeBase
	query := models.DB.Order("created_at DESC")
	// Lọc theo category nếu có
	if cat := c.Query("category"); cat != "" {
		query = query.Where("category = ?", cat)
	}
	// Tìm kiếm theo title/content nếu có
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("title LIKE ? OR content LIKE ?", like, like)
	}
	// Phân trang
	page := 1
	pageSize := 10
	if p := c.Query("page"); p != "" {
		fmt.Sscanf(p, "%d", &page)
		if page < 1 {
			page = 1
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		fmt.Sscanf(ps, "%d", &pageSize)
		if pageSize < 1 {
			pageSize = 10
		}
	}
	var total int64
	query.Model(&models.KnowledgeBase{}).Count(&total)
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&docs)
	return c.JSON(fiber.Map{"docs": docs, "total": total})
}

// API admin: Thêm mới tài liệu knowledge base
func AdminCreateKnowledgeBase(c *fiber.Ctx) error {
	// Xử lý multipart form
	title := c.FormValue("title")
	content := c.FormValue("content")
	category := c.FormValue("category")
	isPublished := c.FormValue("is_published") == "true"
	filePath := ""
	file, err := c.FormFile("file")
	if err == nil && file != nil {
		os.MkdirAll("uploads/knowledge", 0755)
		filename := fmt.Sprintf("knowledge_%d_%s", time.Now().UnixNano(), file.Filename)
		savePath := filepath.Join("uploads/knowledge", filename)
		if err := c.SaveFile(file, savePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"message": "Không thể lưu file"})
		}
		filePath = "/uploads/knowledge/" + filename
	}
	// Sinh slug tự động từ title, đảm bảo unique
	rawSlug := c.FormValue("slug")
	if rawSlug == "" {
		rawSlug = slug.Make(title)
	}
	uniqueSlug := rawSlug
	i := 1
	for {
		var count int64
		models.DB.Model(&models.KnowledgeBase{}).Where("slug = ?", uniqueSlug).Count(&count)
		if count == 0 {
			break
		}
		uniqueSlug = fmt.Sprintf("%s-%d", rawSlug, i)
		i++
	}
	kb := models.KnowledgeBase{
		Title:       title,
		Slug:        uniqueSlug,
		Content:     content,
		Category:    category,
		IsPublished: isPublished,
		FilePath:    filePath,
	}
	if err := models.DB.Create(&kb).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể tạo tài liệu", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tạo tài liệu thành công", "doc": kb})
}

// API admin: Cập nhật tài liệu knowledge base
func AdminUpdateKnowledgeBase(c *fiber.Ctx) error {
	id := c.Params("id")
	var doc models.KnowledgeBase
	if err := models.DB.First(&doc, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Không tìm thấy tài liệu"})
	}
	title := c.FormValue("title")
	content := c.FormValue("content")
	category := c.FormValue("category")
	isPublished := c.FormValue("is_published") == "true"
	file, err := c.FormFile("file")
	if err == nil && file != nil {
		os.MkdirAll("uploads/knowledge", 0755)
		filename := fmt.Sprintf("knowledge_%d_%s", time.Now().UnixNano(), file.Filename)
		savePath := filepath.Join("uploads/knowledge", filename)
		if err := c.SaveFile(file, savePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"message": "Không thể lưu file"})
		}
		doc.FilePath = "/uploads/knowledge/" + filename
	}
	// Sinh slug tự động từ title, đảm bảo unique (trừ chính bản ghi này)
	rawSlug := c.FormValue("slug")
	if rawSlug == "" {
		rawSlug = slug.Make(title)
	}
	uniqueSlug := rawSlug
	i := 1
	for {
		var count int64
		models.DB.Model(&models.KnowledgeBase{}).Where("slug = ? AND id != ?", uniqueSlug, doc.ID).Count(&count)
		if count == 0 {
			break
		}
		uniqueSlug = fmt.Sprintf("%s-%d", rawSlug, i)
		i++
	}
	doc.Title = title
	doc.Slug = uniqueSlug
	doc.Content = content
	doc.Category = category
	doc.IsPublished = isPublished
	if err := models.DB.Save(&doc).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể cập nhật tài liệu", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Cập nhật thành công", "doc": doc})
}

// API admin: Xóa tài liệu knowledge base
func AdminDeleteKnowledgeBase(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := models.DB.Delete(&models.KnowledgeBase{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể xóa tài liệu"})
	}
	return c.JSON(fiber.Map{"message": "Đã xóa tài liệu"})
}
