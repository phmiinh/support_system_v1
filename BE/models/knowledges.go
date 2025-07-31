package models

import (
	"time"
)

type KnowledgeBase struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255);not null" json:"title"`
	Slug        string    `gorm:"type:varchar(255);unique" json:"slug"`
	Content     string    `gorm:"type:text;not null" json:"content"`
	Category    string    `gorm:"type:varchar(100)" json:"category"`
	Views       int       `gorm:"default:0" json:"views"`
	FilePath    string    `gorm:"type:varchar(255)" json:"file_path"`
	IsPublished bool      `gorm:"default:true" json:"is_published"`
	CreatedBy   *uint     `gorm:"index" json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
