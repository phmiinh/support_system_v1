"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { 
  Users, 
  Ticket, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  BarChart3,
  Award,
  AlertCircle,
  XCircle,
  HelpCircle
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area } from 'recharts'

interface DashboardStats {
  total_tickets: number
  processing_tickets: number
  avg_processing_time: number
  status_distribution: Record<string, number>
  category_distribution: Record<string, number>
  product_type_distribution: Record<string, number>
  tickets_this_month: number
  tickets_resolved_this_month: number
  top_staff: Array<{
    staff_id: number
    name: string
    email: string
    count: number
    avg_time: number
  }>
  resolution_rate: number
  daily_stats: Array<{
    date: string
    new_tickets: number
    pending_tickets: number
    resolved_tickets: number
  }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAdminDashboardStats()
      
      // Sort daily stats by date to ensure correct order
      if (response.stats.daily_stats) {
        response.stats.daily_stats.sort((a: any, b: any) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })
      }
      
      setStats(response.stats as DashboardStats)
    } catch (error) {
      console.error("Failed to fetch admin stats:", error)
      addToast({
        type: "error",
        title: t("error.title"),
        message: t("error.failedToLoad"),
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
  const resolutionRate = stats.resolution_rate

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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("admin.dashboard.resolutionRate")}</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(resolutionRate || 0).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.allTime")}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{t("admin.dashboard.resolutionRate")}</p>
                  <p className="text-sm">
                    {Math.round(stats.total_tickets * (resolutionRate || 0) / 100)} {t("admin.dashboard.resolvedTickets")} / {stats.total_tickets} {t("admin.dashboard.totalTickets")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(resolutionRate || 0).toFixed(1)}% {t("admin.dashboard.resolutionRate")}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Distribution Sections */}
        <div className="space-y-6">
          {/* Status Distribution - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.dashboard.statusDistribution")}</CardTitle>
              <CardDescription>{t("admin.dashboard.ticketStatusBreakdown")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(stats.status_distribution).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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

          {/* Category and Product Type Distribution Charts - 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.dashboard.categoryDistribution")}</CardTitle>
                <CardDescription>{t("admin.dashboard.ticketCategoryBreakdown")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  {/* Pie Chart - Left Side - Giảm kích thước */}
                  <div className="flex-shrink-0">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.category_distribution || {}).map(([name, count]) => ({ name, count }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          fill="#4086f4"
                        >
                          {Object.entries(stats.category_distribution || {}).map(([name, count], index) => (
                            <Cell key={`cell-${index}`} fill={['#31a952', '#fbbd01', '#eb4132', '#4086f4'][index % 4]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend - Right Side - Tăng không gian */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {Object.entries(stats.category_distribution || {}).map(([name, count], index) => (
                      <div key={name} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ['#31a952', '#fbbd01', '#eb4132', '#4086f4'][index % 4] }}
                        />
                        <span className="text-xs font-medium truncate flex-1">{name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">({count.toLocaleString()})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Type Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.dashboard.productTypeDistribution")}</CardTitle>
                <CardDescription>{t("admin.dashboard.ticketProductTypeBreakdown")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                   {Object.entries(stats.product_type_distribution || {}).map(([name, count], index) => (
                     <div key={name} className="flex items-center space-x-4">
                       <div className="w-40 text-sm font-medium truncate">{name}</div>
                       <div className="flex-1">
                         <div className="relative h-12 bg-gray-200 rounded">
                           <div 
                             className="absolute top-0 left-0 h-full bg-green-500 rounded transition-all duration-300"
                             style={{ 
                               width: `${(count / 26000) * 100}%`,
                               backgroundColor: ['#31a952', '#fbbd01', '#eb4132', '#4086f4'][index % 4]
                             }}
                             title={`${name}: ${count.toLocaleString()} tickets`}
                           />
                           <div className="absolute inset-0 flex items-center justify-end pr-2">
                             <span className="text-xs font-medium text-white">
                               {count.toLocaleString()}
                             </span>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Weekly Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.weeklyStats")}</CardTitle>
            <CardDescription>{t("admin.dashboard.last7DaysPerformance")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={stats.daily_stats && stats.daily_stats.length > 0 ? stats.daily_stats : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('vi-VN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="new_tickets" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  dot={{ fill: '#3b82f6', strokeWidth: 3, r: 6 }}
                  name="Ticket mới"
                  activeDot={{ r: 8, strokeWidth: 2, stroke: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pending_tickets" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  name="Ticket chờ xử lý"
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved_tickets" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  name="Ticket đã giải quyết"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Staff */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.topStaff")}</CardTitle>
            <CardDescription>{t("admin.dashboard.allTimeBestPerformers")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_staff && stats.top_staff.length > 0 ? (
                stats.top_staff.map((staff, index) => (
                  <div key={staff.staff_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{staff.count} {t("admin.dashboard.tickets")}</p>
                      <p className="text-xs text-muted-foreground">
                        {staff.avg_time ? staff.avg_time.toFixed(1) : '0.0'}h {t("admin.dashboard.avg")}
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
    </DashboardLayout>
  )
}
