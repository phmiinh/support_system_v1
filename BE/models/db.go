package models

import (
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	dsn := "root:@tcp(127.0.0.1:3306)/support_system?charset=utf8mb4&parseTime=True&loc=Local"
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
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
}
