package models

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Get database configuration from environment variables
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = ""
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "support_system"
	}

	// Build DSN string
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	// Configure GORM to disable slow SQL logging
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Error), // Only log errors, not slow queries
	}

	database, err := gorm.Open(mysql.Open(dsn), config)
	if err != nil {
		log.Fatal("Lỗi kết nối cơ sở dữ liệu: ", err)
	}

	database.AutoMigrate(&User{})
	database.AutoMigrate(&Ticket{})
	database.AutoMigrate(&TicketComment{})
	database.AutoMigrate(&Notification{})
	database.AutoMigrate(&KnowledgeBase{})
	database.AutoMigrate(&TicketCategory{})
	database.AutoMigrate(&TicketProductType{})
	database.AutoMigrate(&TicketPriority{})

	DB = database

	// Tạo các composite index cần thiết cho tối ưu hiệu suất
	createOptimizationIndexes()
}

func createOptimizationIndexes() {
	// Composite index cho query thống kê theo assigned_to và status
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status ON tickets(assigned_to, status)")

	// Composite index cho query thống kê theo assigned_to và created_at
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_assigned_created ON tickets(assigned_to, created_at)")

	// Composite index cho query thống kê theo assigned_to và resolved_at
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_assigned_resolved ON tickets(assigned_to, resolved_at)")

	// Composite index cho query thống kê theo status và created_at
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at)")

	// Composite index cho query thống kê theo assigned_to, status và created_at
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status_created ON tickets(assigned_to, status, created_at)")

	// Composite index cho query thống kê theo category_id và assigned_to
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_category_assigned ON tickets(category_id, assigned_to)")

	// Composite index cho query thống kê theo product_type_id và assigned_to
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_product_assigned ON tickets(product_type_id, assigned_to)")

	log.Println("Database indexes created successfully")
}
