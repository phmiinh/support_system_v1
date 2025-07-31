"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/providers/language-provider"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  Users,
  Download,
  Eye,
  Trash2,
  Plus,
  X
} from "lucide-react"
import { format } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import Link from "next/link"
import { formatDate, getStatusColor, getPriorityColor } from "@/lib/utils"

interface Ticket {
  id: number
  title: string
  description: string
  status: string
  priority: { id: number; name: string }
  category: { id: number; name: string }
  product_type: { id: number; name: string }
  created_at: string
  resolved_at?: string
  attachment_path?: string
  user: { id: number; name: string; email: string; role: string }
  assigned_to?: number
  assigned?: { id: number; name: string; email: string; role: string }
}

interface Staff {
  id: number
  name: string
  email: string
  role: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AdminTicketsPage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Staff[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [priorities, setPriorities] = useState<any[]>([])
  const [productTypes, setProductTypes] = useState<any[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [productTypeFilter, setProductTypeFilter] = useState("")
  const [assignedToFilter, setAssignedToFilter] = useState("")
  const [fromDateFilter, setFromDateFilter] = useState("")
  const [toDateFilter, setToDateFilter] = useState("")

  const [assignDialog, setAssignDialog] = useState<{ open: boolean; ticketId?: number }>({ open: false })
  const [selectedStaff, setSelectedStaff] = useState<number>(0)

  const getPriorityName = (priority: string | { name: string; id: number }) => {
    return typeof priority === 'object' ? priority.name : priority
  }

  const getCategoryName = (category: string | { name: string; id: number }) => {
    return typeof category === 'object' ? category.name : category
  }

  const getProductTypeName = (productType: string | { name: string; id: number }) => {
    return typeof productType === 'object' ? productType.name : productType
  }

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params: any = {}

      if (searchTerm) params.search = searchTerm
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (categoryFilter) params.category = categoryFilter
      if (productTypeFilter) params.product_type = productTypeFilter
      if (assignedToFilter) params.assigned_to = assignedToFilter
      if (fromDateFilter) params.from_date = fromDateFilter
      if (toDateFilter) params.to_date = toDateFilter
      params.page = pagination.page
      params.limit = pagination.limit

      const response = await apiClient.getAdminTickets(params) as any
      setTickets(response.tickets || [])
      if (response.pagination) {
        setPagination(response.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error)
      toast({
        title: t("error.title"),
        description: t("error.failedToLoad"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await apiClient.getAssignableStaff() as any
      setStaff(response.staff || [])
    } catch (error) {
      console.error("Failed to fetch staff:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getTicketCategories() as any
      setCategories(response.data || [])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const fetchPriorities = async () => {
    try {
      const response = await apiClient.getTicketPriorities() as any
      setPriorities(response.data || [])
    } catch (error) {
      console.error("Failed to fetch priorities:", error)
    }
  }

  const fetchProductTypes = async () => {
    try {
      const response = await apiClient.getTicketProductTypes() as any
      setProductTypes(response.data || [])
    } catch (error) {
      console.error("Failed to fetch product types:", error)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter, productTypeFilter, assignedToFilter, fromDateFilter, toDateFilter, pagination.page])

  useEffect(() => {
    fetchStaff()
    fetchCategories()
    fetchPriorities()
    fetchProductTypes()
  }, [])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleAssignTicket = async () => {
    if (!assignDialog.ticketId || !selectedStaff) {
      console.log("Missing data:", { ticketId: assignDialog.ticketId, selectedStaff })
      return
    }

    try {
      console.log("Assigning ticket:", assignDialog.ticketId, "to staff:", selectedStaff)
      await apiClient.assignTicket(assignDialog.ticketId.toString(), selectedStaff)
      console.log("Assignment successful")
      toast({
        title: t("admin.tickets.assignSuccess"),
        description: t("admin.tickets.ticketAssigned"),
        variant: "default",
      })
      setAssignDialog({ open: false })
      setSelectedStaff(0)
      fetchTickets()
    } catch (error) {
      console.error("Failed to assign ticket:", error)
      toast({
        title: t("error.title"),
        description: t("admin.tickets.assignError"),
        variant: "destructive",
      })
    }
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("admin.tickets.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.tickets.description")}</p>
          </div>
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
                    setAssignedToFilter("")
                    setFromDateFilter("")
                    setToDateFilter("")
                    handleFilterChange()
                  }}
                  className="whitespace-nowrap"
                >
                  {t("admin.tickets.clearFilters")}
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
                  {categories?.map((category) => (
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
                  {productTypes?.map((productType) => (
                    <option key={productType.id} value={productType.name}>
                      {productType.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filter Row 2 - Assigned To & Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={assignedToFilter}
                  onChange={(e) => {
                    setAssignedToFilter(e.target.value)
                    handleFilterChange()
                  }}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Tất cả nhân viên</option>
                  {staff?.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
                
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
            <CardTitle>{t("admin.tickets.title")} ({tickets?.length || 0})</CardTitle>
            <CardDescription>{t("admin.tickets.description")}</CardDescription>
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
            ) : tickets && tickets.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  {t("admin.tickets.showing")} {tickets.length} {t("admin.tickets.tickets")} ({t("admin.tickets.total")}: {pagination.total}, {t("admin.tickets.page")}: {pagination.page}/{pagination.pages})
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
                          <span>Created: {formatDate(ticket.created_at)}</span>
                          <span>{t("admin.tickets.fromUser")}: {ticket.user.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ticket.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog
                          open={assignDialog.open && assignDialog.ticketId === ticket.id}
                          onOpenChange={(open) => {
                            setAssignDialog({ open, ticketId: ticket.id })
                            if (open) {
                              setSelectedStaff(0)
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4 mr-1" />
                              {ticket.assigned ? ticket.assigned.name : t("admin.tickets.assign")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("admin.tickets.assignTicket")}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>{t("admin.tickets.selectStaff")}</Label>
                                <select
                                  value={selectedStaff.toString()}
                                  onChange={(e) => setSelectedStaff(parseInt(e.target.value))}
                                  className="w-full px-3 py-2 border border-input rounded-md bg-background mt-1"
                                >
                                  <option value="0">{t("admin.tickets.selectStaff")}</option>
                                  {staff?.map((s) => (
                                    <option key={s.id} value={s.id.toString()}>
                                      {s.name} ({s.role})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <Button onClick={handleAssignTicket} disabled={!selectedStaff}>
                                {t("admin.tickets.assign")}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Link href={`/admin/tickets/${ticket.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
                  {t("admin.tickets.noTickets")}
                </p>
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
                  {t("admin.tickets.showing")} {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t("admin.tickets.of")} {pagination.total} {t("admin.tickets.tickets")} ({t("admin.tickets.total")}: {pagination.total})
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
      </div>
    </DashboardLayout>
  )
} 