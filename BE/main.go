package main

import (
	"awesomeProject/background"
	"awesomeProject/models"
	"awesomeProject/server"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("[WARN] Không tìm thấy file .env hoặc không thể load: ", err)
	}
	models.ConnectDatabase()
	app := server.NewServer()
	background.StartBackgroundJobs()

	// Get port from environment variable
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
