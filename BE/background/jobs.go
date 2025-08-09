package background

import (
	"awesomeProject/auth"
	"awesomeProject/controllers"
	"time"
)

func StartBackgroundJobs() {
	// Job kiểm tra và gửi nhắc nhở ticket trễ
	go func() {
		for {
			controllers.CheckAndSendLateTicketReminders()
			time.Sleep(1 * time.Hour)
		}
	}()

	// Job dọn dẹp blacklist định kỳ
	go func() {
		for {
			auth.CleanupBlacklist()
			time.Sleep(1 * time.Hour) // Dọn dẹp mỗi giờ
		}
	}()
}
