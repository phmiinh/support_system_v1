package main

import (
	"awesomeProject/background"
	"awesomeProject/models"
	"awesomeProject/server"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("[WARN] Không tìm thấy file .env hoặc không thể load: ", err)
	}
	models.ConnectDatabase()
	app := server.NewServer()
	background.StartBackgroundJobs()
	log.Fatal(app.Listen(":8080"))
}
