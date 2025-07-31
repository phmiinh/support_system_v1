package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Name             string `gorm:"not null"`
	Phone            string `gorm:"not null"`
	Email            string `gorm:"unique;not null"`
	PasswordHash     string `gorm:"not null"`
	Role             string `gorm:"default:customer"`
	IsVerified       bool   `gorm:"default:false"`
	VerifyToken      string `gorm:"size:255"`
	TwoFactorEnabled bool   `gorm:"default:false"`
	TwoFactorSecret  string `gorm:"size:255"`
}
