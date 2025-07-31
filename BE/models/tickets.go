package models

import (
	"time"
)

type Ticket struct {
	ID                  uint              `gorm:"primaryKey" json:"id"`
	UserID              uint              `gorm:"not null;index" json:"user_id"`
	User                User              `gorm:"foreignKey:UserID" json:"-"`
	Title               string            `gorm:"type:varchar(255);not null" json:"title"`
	Description         string            `gorm:"type:text" json:"description"`
	CategoryID          uint              `json:"category_id"`
	Category            TicketCategory    `gorm:"foreignKey:CategoryID" json:"category"`
	Status              string            `gorm:"type:enum('Mới','Đang xử lý','Chờ phản hồi','Đã xử lý','Đã đóng');default:'Mới'" json:"status"`
	PriorityID          uint              `json:"priority_id"`
	Priority            TicketPriority    `gorm:"foreignKey:PriorityID" json:"priority"`
	ProductTypeID       uint              `json:"product_type_id"`
	ProductType         TicketProductType `gorm:"foreignKey:ProductTypeID" json:"product_type"`
	AssignedTo          *uint             `gorm:"index" json:"assigned_to"`
	Assigned            *User             `gorm:"foreignKey:AssignedTo" json:"-"`
	CreatedAt           time.Time         `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt           time.Time         `gorm:"autoUpdateTime" json:"updated_at"`
	ResolvedAt          *time.Time        `gorm:"default:null" json:"resolved_at"`
	AttachmentPath      string            `gorm:"type:varchar(255);default:null" json:"attachment_path"`
	LastViewedCommentAt *time.Time        `gorm:"default:null" json:"last_viewed_comment_at"`
}

type TicketComment struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	TicketID       uint      `gorm:"not null;index" json:"ticket_id"`
	Ticket         Ticket    `gorm:"foreignKey:TicketID" json:"-"`
	UserID         uint      `gorm:"not null;index" json:"user_id"`
	User           User      `gorm:"foreignKey:UserID" json:"user"`
	Content        string    `gorm:"column:message;type:text;not null" json:"content"`
	AttachmentPath string    `gorm:"type:varchar(255);default:null" json:"attachment_url"`
	ParentID       *uint     `gorm:"index;default:null" json:"parent_id"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
}

type TicketCategory struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"unique;not null" json:"name"`
}

type TicketProductType struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"unique;not null" json:"name"`
}

type TicketPriority struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"unique;not null" json:"name"`
}
