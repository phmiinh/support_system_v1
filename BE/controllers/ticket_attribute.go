package controllers

import (
	"awesomeProject/models"

	"github.com/gofiber/fiber/v2"
)

// ----------- CATEGORY -----------
func GetAllTicketCategories(c *fiber.Ctx) error {
	var items []models.TicketCategory
	models.DB.Order("id").Find(&items)
	return c.JSON(fiber.Map{"data": items})
}

func CreateTicketCategory(c *fiber.Ctx) error {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil || input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Tên không hợp lệ"})
	}
	item := models.TicketCategory{Name: input.Name}
	if err := models.DB.Create(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể tạo", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tạo thành công", "item": item})
}

func UpdateTicketCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	var item models.TicketCategory
	if err := models.DB.First(&item, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Không tìm thấy"})
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil || input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Tên không hợp lệ"})
	}
	item.Name = input.Name
	if err := models.DB.Save(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể cập nhật", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Cập nhật thành công", "item": item})
}

func DeleteTicketCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := models.DB.Delete(&models.TicketCategory{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể xóa"})
	}
	return c.JSON(fiber.Map{"message": "Đã xóa"})
}

// ----------- PRODUCT TYPE -----------
func GetAllTicketProductTypes(c *fiber.Ctx) error {
	var items []models.TicketProductType
	models.DB.Order("id").Find(&items)
	return c.JSON(fiber.Map{"data": items})
}

func CreateTicketProductType(c *fiber.Ctx) error {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil || input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Tên không hợp lệ"})
	}
	item := models.TicketProductType{Name: input.Name}
	if err := models.DB.Create(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể tạo", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tạo thành công", "item": item})
}

func UpdateTicketProductType(c *fiber.Ctx) error {
	id := c.Params("id")
	var item models.TicketProductType
	if err := models.DB.First(&item, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Không tìm thấy"})
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil || input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Tên không hợp lệ"})
	}
	item.Name = input.Name
	if err := models.DB.Save(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể cập nhật", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Cập nhật thành công", "item": item})
}

func DeleteTicketProductType(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := models.DB.Delete(&models.TicketProductType{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể xóa"})
	}
	return c.JSON(fiber.Map{"message": "Đã xóa"})
}

// ----------- PRIORITY -----------
func GetAllTicketPriorities(c *fiber.Ctx) error {
	var items []models.TicketPriority
	models.DB.Order("id").Find(&items)
	return c.JSON(fiber.Map{"data": items})
}

func CreateTicketPriority(c *fiber.Ctx) error {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil || input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Tên không hợp lệ"})
	}
	item := models.TicketPriority{Name: input.Name}
	if err := models.DB.Create(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể tạo", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tạo thành công", "item": item})
}

func UpdateTicketPriority(c *fiber.Ctx) error {
	id := c.Params("id")
	var item models.TicketPriority
	if err := models.DB.First(&item, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Không tìm thấy"})
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil || input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"message": "Tên không hợp lệ"})
	}
	item.Name = input.Name
	if err := models.DB.Save(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể cập nhật", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Cập nhật thành công", "item": item})
}

func DeleteTicketPriority(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := models.DB.Delete(&models.TicketPriority{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "Không thể xóa"})
	}
	return c.JSON(fiber.Map{"message": "Đã xóa"})
}
