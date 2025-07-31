package background

import (
	"awesomeProject/controllers"
	"time"
)

func StartBackgroundJobs() {
	go func() {
		for {
			controllers.CheckAndSendLateTicketReminders()
			time.Sleep(1 * time.Hour)

		}
	}()
}
