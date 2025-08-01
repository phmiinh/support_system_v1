"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Bell, Check, Clock, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

interface Notification {
  id: number
  type: string
  content: string
  is_read: boolean
  created_at: string
  data?: string
}

export default function AdminNotificationsPage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAsRead, setMarkingAsRead] = useState<number | null>(null)

  const fetchNotifications = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await apiClient.getAdminNotifications() as any
      setNotifications(response.notifications || [])
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
      toast({
        title: t("common.error"),
        description: "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      setMarkingAsRead(id)
      await apiClient.markAdminNotificationAsRead(id.toString())
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      toast({
        title: t("common.success"),
        description: t("notifications.markAsRead"),
      })
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
      toast({
        title: t("common.error"),
        description: "Failed to mark as read",
        variant: "destructive",
      })
    } finally {
      setMarkingAsRead(null)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) return

    try {
      setMarkingAsRead(-1) // Special value for "all"
      await Promise.all(
        unreadNotifications.map(n => apiClient.markAdminNotificationAsRead(n.id.toString()))
      )
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast({
        title: t("common.success"),
        description: t("notifications.markAllAsRead"),
      })
    } catch (error) {
      console.error("Failed to mark all as read:", error)
      toast({
        title: t("common.error"),
        description: "Failed to mark all as read",
        variant: "destructive",
      })
    } finally {
      setMarkingAsRead(null)
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
        return <Bell className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
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
      router.push(`/admin/tickets/${ticketId}`)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [user])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
            <p className="text-muted-foreground">
              {unreadCount} {t("notifications.unreadNotifications")}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead}
              disabled={markingAsRead === -1}
              variant="outline"
            >
              <Check className="h-4 w-4 mr-2" />
              {t("notifications.markAllAsRead")}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("notifications.noNotifications")}</h3>
              <p className="text-muted-foreground text-center">
                You don't have any notifications yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const ticketId = getTicketIdFromNotification(notification)
              const isTicketNotification = notification.type.startsWith('ticket_')
              const isClickable = isTicketNotification && ticketId
              
              return (
                <Card 
                  key={notification.id}
                  className={cn(
                    "transition-colors",
                    !notification.is_read && "border-primary/20 bg-primary/5",
                    isClickable && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={isClickable ? () => handleNotificationClick(notification) : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {getNotificationTypeLabel(notification.type)}
                              </Badge>
                              {!notification.is_read && (
                                <Badge variant="destructive" className="text-xs">
                                  {t("notifications.unread")}
                                </Badge>
                              )}
                              {isClickable && (
                                <Badge variant="outline" className="text-xs">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {t("notifications.viewTicket")}
                                </Badge>
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-sm",
                              !notification.is_read && "font-medium"
                            )}>
                              {notification.content}
                            </p>
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatNotificationTime(notification.created_at)}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                disabled={markingAsRead === notification.id}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 