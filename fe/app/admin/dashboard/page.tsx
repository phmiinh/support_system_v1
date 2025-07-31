"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { useLanguage } from "@/components/providers/language-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { 
  Users, 
  Ticket, 
  Clock, 
  TrendingUp, 
  Award,
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle
} from "lucide-react"

interface DashboardStats {
  total_tickets: number
  processing_tickets: number
  avg_processing_time: number
  status_distribution: Record<string, number>
  tickets_this_month: number
  tickets_resolved_this_month: number
  top_staff: Array<{
    staff_id: number
    name: string
    email: string
    count: number
    avg_time: number | null
  }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAdminDashboardStats()
      console.log('Admin Dashboard Response:', response)
      console.log('Top Staff Data:', response.stats.top_staff)
      setStats(response.stats as DashboardStats)
    } catch (error) {
      console.error("Failed to fetch admin stats:", error)
      toast({
        title: t("error.title"),
        description: t("error.failedToLoad"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Mới":
        return "bg-blue-500"
      case "Đang xử lý":
        return "bg-yellow-500"
      case "Chờ phản hồi":
        return "bg-orange-500"
      case "Đã xử lý":
        return "bg-green-500"
      case "Đã đóng":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Mới":
        return <HelpCircle className="h-4 w-4" />
      case "Đang xử lý":
        return <Clock className="h-4 w-4" />
      case "Chờ phản hồi":
        return <AlertCircle className="h-4 w-4" />
      case "Đã xử lý":
        return <CheckCircle className="h-4 w-4" />
      case "Đã đóng":
        return <XCircle className="h-4 w-4" />
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </CardTitle>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!stats) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t("error.noData")}</p>
        </div>
      </DashboardLayout>
    )
  }

  const totalTickets = stats.total_tickets
  const processingTickets = stats.processing_tickets
  const resolvedThisMonth = stats.tickets_resolved_this_month
  const totalThisMonth = stats.tickets_this_month
  const resolutionRate = totalThisMonth > 0 ? (resolvedThisMonth / totalThisMonth) * 100 : 0

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("admin.dashboard.description")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.dashboard.totalTickets")}</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                {t("admin.dashboard.allTime")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.dashboard.processingTickets")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processingTickets}</div>
              <p className="text-xs text-muted-foreground">
                {t("admin.dashboard.currentlyProcessing")}
              </p>
            </CardContent>
          </Card>

                     <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{t("admin.dashboard.avgProcessingTime")}</CardTitle>
               <TrendingUp className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats.avg_processing_time ? stats.avg_processing_time.toFixed(1) : '0.0'}h</div>
               <p className="text-xs text-muted-foreground">
                 {t("admin.dashboard.averageTime")}
               </p>
             </CardContent>
           </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.dashboard.resolutionRate")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolutionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {t("admin.dashboard.thisMonth")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.dashboard.statusDistribution")}</CardTitle>
              <CardDescription>{t("admin.dashboard.ticketStatusBreakdown")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.status_distribution).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${getStatusColor(status)}`}></div>
                      <span className="text-sm font-medium">{status}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Staff */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.dashboard.topStaff")}</CardTitle>
              <CardDescription>{t("admin.dashboard.bestPerformers")}</CardDescription>
            </CardHeader>
                        <CardContent>
              <div className="space-y-4">
                {stats.top_staff.length > 0 ? (
                  stats.top_staff.map((staff, index) => (
                    <div key={staff.StaffID || staff.staff_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Award className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{staff.Name || staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.Email || staff.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{staff.Count || staff.count} {t("admin.dashboard.tickets")}</p>
                        <p className="text-xs text-muted-foreground">
                          {(staff.AvgTime || staff.avg_time) ? (staff.AvgTime || staff.avg_time).toFixed(1) : '0.0'}h {t("admin.dashboard.avg")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t("admin.dashboard.noStaffData")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.monthlyStats")}</CardTitle>
            <CardDescription>{t("admin.dashboard.currentMonthPerformance")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalThisMonth}</div>
                <p className="text-sm text-muted-foreground">{t("admin.dashboard.newTickets")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{resolvedThisMonth}</div>
                <p className="text-sm text-muted-foreground">{t("admin.dashboard.resolvedTickets")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalThisMonth - resolvedThisMonth}</div>
                <p className="text-sm text-muted-foreground">{t("admin.dashboard.pendingTickets")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
