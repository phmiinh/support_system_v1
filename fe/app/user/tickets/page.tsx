"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { formatDate, getStatusColor, getPriorityColor } from "@/lib/utils"
import { CreateTicketModal } from "@/components/ui/create-ticket-modal"
import { Plus, Search, Eye, Trash2 } from "lucide-react"
import Link from "next/link"

interface Ticket {
  id: string | number
  title: string
  status: string
  priority: string | { name: string; id: number }
  category: string | { name: string; id: number }
  product_type: string | { name: string; id: number }
  created_at?: string
  updated_at?: string
  description?: string
  attachment_path?: string
  has_new_reply?: boolean
  assigned?: { id: number; name: string; email: string; role: string }
  user?: { id: number; name: string; email: string; role: string }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function UserTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [productTypeFilter, setProductTypeFilter] = useState("")
  const [fromDateFilter, setFromDateFilter] = useState("")
  const [toDateFilter, setToDateFilter] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [productTypes, setProductTypes] = useState<any[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { t } = useLanguage()
  const { addToast } = useToast()

  const getPriorityName = (priority: string | { name: string; id: number }) => {
    return typeof priority === 'object' ? priority.name : priority
  }

  const getCategoryName = (category: string | { name: string; id: number }) => {
    return typeof category === 'object' ? category.name : category
  }

  const getProductTypeName = (productType: string | { name: string; id: number }) => {
    return typeof productType === 'object' ? productType.name : productType
  }

  useEffect(() => {
    fetchTickets()
    fetchCategories()
    fetchProductTypes()
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter, productTypeFilter, fromDateFilter, toDateFilter, pagination.page])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params: any = {}

      if (searchTerm) params.search = searchTerm
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (categoryFilter) params.category = categoryFilter
      if (productTypeFilter) params.product_type = productTypeFilter
      if (fromDateFilter) params.from_date = fromDateFilter
      if (toDateFilter) params.to_date = toDateFilter
      params.page = pagination.page
      params.limit = pagination.limit

      const response = await apiClient.getTickets(params) as any
      console.log("API Response:", response) // Debug
      setTickets(response.tickets || [])
      if (response.pagination) {
        setPagination(response.pagination)
        console.log("Pagination:", response.pagination) // Debug
      }
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to load tickets",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getTicketCategories() as any
      setCategories(response.data || [])
    } catch (error: any) {
      console.error("Failed to load categories:", error)
    }
  }

  const fetchProductTypes = async () => {
    try {
      const response = await apiClient.getTicketProductTypes() as any
      setProductTypes(response.data || [])
    } catch (error: any) {
      console.error("Failed to load product types:", error)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return

    try {
      await apiClient.deleteTicket(ticketId)
      setTickets(tickets.filter((t) => t.id !== ticketId))
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Ticket deleted successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to delete ticket",
      })
    }
  }

  // Remove client-side filtering since backend handles all filters

  return (
    <DashboardLayout requiredRole="user">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("nav.tickets")}</h1>
            <p className="text-muted-foreground mt-1">{t("tickets.manageRequests")}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("tickets.newTicket")}
            </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={20}
                  />
                  <Input
                    placeholder={t("common.search")}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      handleFilterChange()
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("")
                    setPriorityFilter("")
                    setCategoryFilter("")
                    setProductTypeFilter("")
                    setFromDateFilter("")
                    setToDateFilter("")
                    handleFilterChange()
                  }}
                  className="whitespace-nowrap"
                >
                  {t("tickets.clearFilters")}
                </Button>
              </div>
              
              {/* Filter Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    handleFilterChange()
                  }}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Mới">Mới</option>
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Chờ phản hồi">Chờ phản hồi</option>
                  <option value="Đã xử lý">Đã xử lý</option>
                  <option value="Đã đóng">Đã đóng</option>
              </select>
                
              <select
                value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value)
                    handleFilterChange()
                  }}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Tất cả mức độ ưu tiên</option>
                  <option value="Thấp">Thấp</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Cao">Cao</option>
                  <option value="Khẩn cấp">Khẩn cấp</option>
                </select>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    handleFilterChange()
                  }}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Tất cả loại ticket</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={productTypeFilter}
                  onChange={(e) => {
                    setProductTypeFilter(e.target.value)
                    handleFilterChange()
                  }}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                  <option value="">Tất cả loại sản phẩm</option>
                  {productTypes.map((productType) => (
                    <option key={productType.id} value={productType.name}>
                      {productType.name}
                    </option>
                  ))}
              </select>
              </div>
              
              {/* Filter Row 2 - Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Từ ngày</label>
                                      <input
                      type="date"
                      value={fromDateFilter}
                      onChange={(e) => {
                        setFromDateFilter(e.target.value)
                        handleFilterChange()
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đến ngày</label>
                                      <input
                      type="date"
                      value={toDateFilter}
                      onChange={(e) => {
                        setToDateFilter(e.target.value)
                        handleFilterChange()
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("tickets.yourTickets")} ({tickets.length})</CardTitle>
            <CardDescription>{t("tickets.allSupportRequests")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : tickets.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  {t("tickets.displaying")} {tickets.length} {t("tickets.tickets")} ({t("tickets.total")}: {pagination.total}, {t("tickets.page")}: {pagination.page}/{pagination.pages})
                </div>
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{ticket.title}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                          >
                            {ticket.status}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(getPriorityName(ticket.priority))}`}
                          >
                            {getPriorityName(ticket.priority)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>#{String(ticket.id).slice(-8)}</span>
                          <span>{getCategoryName(ticket.category)}</span>
                          <span>{getProductTypeName(ticket.product_type)}</span>
                          <span>Created: {formatDate(ticket.created_at || new Date())}</span>
                          <span>Updated: {formatDate(ticket.updated_at || new Date())}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/user/tickets/${String(ticket.id)}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {ticket.status === "new" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTicket(String(ticket.id))}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  {t("common.noData")}
                </p>
                <Link href="/user/tickets/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Ticket
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

                {/* Pagination */}
        {pagination.total > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("tickets.showing")} {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t("tickets.of")} {pagination.total} {t("tickets.tickets")}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    {t("common.previous")}
                  </Button>
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const totalPages = pagination.pages
                      const currentPage = pagination.page
                      const pages: number[] = []
                      
                      // Simple logic: show all pages if <= 5, otherwise show current ± 2
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i)
                        }
                      } else {
                        // Show first page
                        pages.push(1)
                        
                        // Show pages around current
                        const start = Math.max(2, currentPage - 1)
                        const end = Math.min(totalPages - 1, currentPage + 1)
                        
                        for (let i = start; i <= end; i++) {
                          pages.push(i)
                        }
                        
                        // Show last page if not already included
                        if (totalPages > 1 && !pages.includes(totalPages)) {
                          pages.push(totalPages)
                        }
                      }
                      
                      return pages.map((pageNum, index) => {
                        const prevPage = pages[index - 1]
                        const showEllipsis = prevPage && pageNum - prevPage > 1
                        
                        return (
                          <div key={pageNum} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={pageNum === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          </div>
                        )
                      })
                    })()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Ticket Modal */}
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchTickets() // Refresh the list
          }}
        />
      </div>
    </DashboardLayout>
  )
}
