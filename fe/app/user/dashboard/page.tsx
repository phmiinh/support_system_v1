"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { formatDate, getStatusColor, getPriorityColor } from "@/lib/utils"
import { CreateTicketModal } from "@/components/ui/create-ticket-modal"
import { Plus, Ticket, Clock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalTickets: number
  newTickets: number
  pendingTickets: number
  resolvedTickets: number
}

interface RecentTicket {
  id: string | number
  title: string
  status: string
  priority: string | { name: string; id: number }
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
}

export default function UserDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    newTickets: 0,
    pendingTickets: 0,
    resolvedTickets: 0,
  })
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { user } = useAuth()
  const { t } = useLanguage()
  const { addToast } = useToast()

  const getPriorityName = (priority: string | { name: string; id: number }) => {
    return typeof priority === 'object' ? priority.name : priority
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch dashboard stats from dedicated endpoint
      const statsResponse = await apiClient.getUserDashboardStats() as any
      const ticketsResponse = await apiClient.getTickets({ limit: 2, page: 1 }) as any

      setRecentTickets(ticketsResponse.tickets || [])
      setStats(statsResponse.stats)
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to load dashboard data",
      })
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout requiredRole="user">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {t("dashboard.welcome")}, {user?.fullName}!
            </h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.overview")}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.createNewTicket")}
            </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title={t("dashboard.totalTickets")} value={stats.totalTickets} icon={Ticket} color="bg-blue-500" />
          <StatCard
            title={t("dashboard.newTickets")}
            value={stats.newTickets}
            icon={AlertCircle}
            color="bg-orange-500"
          />
          <StatCard
            title={t("dashboard.pendingTickets")}
            value={stats.pendingTickets}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatCard
            title={t("dashboard.resolvedTickets")}
            value={stats.resolvedTickets}
            icon={CheckCircle}
            color="bg-green-500"
          />
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("dashboard.recentTickets")}</CardTitle>
                <CardDescription>{t("tickets.latestRequests")}</CardDescription>
              </div>
              <Link href="/user/tickets">
                <Button variant="outline" size="sm">
                  {t("common.viewAll")}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentTickets.length > 0 ? (
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <Link href={`/user/tickets/${String(ticket.id)}`} className="font-medium hover:underline">
                        {ticket.title}
                      </Link>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span>#{String(ticket.id).slice(-8)}</span>
                        <span>{formatDate(ticket.created_at || ticket.createdAt || new Date())}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(getPriorityName(ticket.priority))}`}>
                        {getPriorityName(ticket.priority)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("common.noData")}</p>
                <Link href="/user/tickets/new">
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Ticket
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Ticket Modal */}
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchDashboardData() // Refresh the data
          }}
        />
      </div>
    </DashboardLayout>
  )
}
