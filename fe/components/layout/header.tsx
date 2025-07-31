"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { LanguageToggle } from "@/components/common/language-toggle"
import { Bell, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { vi, enUS } from "date-fns/locale"

interface Notification {
  id: number
  type: string
  content: string
  is_read: boolean
  created_at: string
  data?: string
}

interface HeaderProps {
  sidebarCollapsed: boolean
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await apiClient.getNotifications()
      const notifs = response.notifications || []
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await apiClient.markNotificationAsRead(id.toString())
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === "vi" ? vi : enUS
    return formatDistanceToNow(date, { addSuffix: true, locale })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ticket_new":
      case "ticket_comment":
      case "ticket_update":
      case "ticket_delete":
        return <Bell className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "ticket_new":
        return t("notifications.type.newTicket")
      case "ticket_comment":
        return t("notifications.type.ticketComment")
      case "ticket_update":
        return t("notifications.type.ticketUpdate")
      case "ticket_delete":
        return t("notifications.type.ticketDeleted")
      default:
        return t("notifications.type.notification")
    }
  }

  // Parse ticket ID from notification data
  const getTicketIdFromNotification = (notification: Notification): number | null => {
    if (!notification.data) return null
    
    try {
      const data = JSON.parse(notification.data)
      return data.ticket_id || null
    } catch (error) {
      console.error("Failed to parse notification data:", error)
      return null
    }
  }

  // Navigate to ticket when clicking on ticket-related notification
  const handleNotificationClick = (notification: Notification) => {
    const ticketId = getTicketIdFromNotification(notification)
    if (ticketId && (notification.type.startsWith('ticket_'))) {
      router.push(`/user/tickets/${ticketId}`)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-background border-b border-border transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-64",
      )}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* System Title */}
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold text-foreground">{t("system.name")}</h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between p-2 border-b">
                <h4 className="font-medium">{t("notifications.title")}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push("/user/notifications")}
                >
                  {t("notifications.viewAll")}
                </Button>
              </div>
              
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t("notifications.noNotifications")}
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => {
                  const ticketId = getTicketIdFromNotification(notification)
                  const isTicketNotification = notification.type.startsWith('ticket_')
                  const isClickable = isTicketNotification && ticketId
                  
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 cursor-pointer",
                        !notification.is_read && "bg-muted/50"
                      )}
                      onClick={() => {
                        if (isClickable) {
                          handleNotificationClick(notification)
                        } else {
                          markAsRead(notification.id)
                        }
                      }}
                    >
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      <p className={cn(
                        "text-sm",
                        !notification.is_read && "font-medium"
                      )}>
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                    )}
                  </DropdownMenuItem>
                )
              })
            )}
            </DropdownMenuContent>
          </DropdownMenu>

          <LanguageToggle />
          <ThemeToggle />

          {/* User Avatar */}
          {user && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user.fullName || user.email || 'User'}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role || 'user'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
