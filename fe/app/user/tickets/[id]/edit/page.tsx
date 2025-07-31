"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { ArrowLeft, Save, X } from "lucide-react"
import Link from "next/link"

interface Ticket {
  id: string | number
  title: string
  description: string
  status: string
  priority: string | { name: string; id: number }
  category: string | { name: string; id: number }
  product_type: string | { name: string; id: number }
  created_at?: string
  resolved_at?: string
  attachment_path?: string
}

interface Category {
  id: number
  name: string
}

interface ProductType {
  id: number
  name: string
}

interface Priority {
  id: number
  name: string
}

export default function EditTicketPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])

  // Form data
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [productTypeId, setProductTypeId] = useState("")
  const [priorityId, setPriorityId] = useState("")

  const { t } = useLanguage()
  const { addToast } = useToast()

  useEffect(() => {
    fetchTicketDetail()
    fetchCategories()
    fetchProductTypes()
    fetchPriorities()
  }, [ticketId])

  const fetchTicketDetail = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getTicket(ticketId) as any
      const ticketData = response.ticket
      setTicket(ticketData)
      
      // Set form data
      setTitle(ticketData.title)
      setDescription(ticketData.description)
      setCategoryId(ticketData.category?.id?.toString() || "")
      setProductTypeId(ticketData.product_type?.id?.toString() || "")
      setPriorityId(ticketData.priority?.id?.toString() || "")
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Không thể tải thông tin yêu cầu",
      })
      router.push("/user/tickets")
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

  const fetchPriorities = async () => {
    try {
      const response = await apiClient.getTicketPriorities() as any
      setPriorities(response.data || [])
    } catch (error: any) {
      console.error("Failed to load priorities:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !description.trim() || !categoryId || !productTypeId || !priorityId) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: "Vui lòng điền đầy đủ thông tin",
      })
      return
    }

    try {
      setSaving(true)
      const updateData = {
        title: title.trim(),
        description: description.trim(),
        category_id: parseInt(categoryId),
        product_type_id: parseInt(productTypeId),
        priority_id: parseInt(priorityId),
      }
      
      // Validate all fields are present and valid
      if (!updateData.title || !updateData.description || 
          isNaN(updateData.category_id) || updateData.category_id === 0 ||
          isNaN(updateData.product_type_id) || updateData.product_type_id === 0 ||
          isNaN(updateData.priority_id) || updateData.priority_id === 0) {
        addToast({
          type: "error",
          title: t("common.error"),
          message: t("tickets.fillAllFields"),
        })
        return
      }
      console.log("Updating ticket:", ticketId, updateData) // Debug
      const response = await apiClient.updateTicket(ticketId, updateData)
      console.log("Update response:", response) // Debug
      
      addToast({
        type: "success",
        title: t("common.success"),
        message: t("tickets.updateSuccess"),
      })
      
      router.push(`/user/tickets/${ticketId}`)
    } catch (error: any) {
      console.error("Update error:", error) // Debug
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || t("tickets.updateError"),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout requiredRole="user">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!ticket) {
    return (
      <DashboardLayout requiredRole="user">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">{t("tickets.ticketNotFound")}</p>
          <Link href="/user/tickets">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("tickets.backToTickets")}
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

      if (ticket.status !== "Mới") {
      return (
        <DashboardLayout requiredRole="user">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{t("tickets.onlyNewStatus")}</p>
            <Link href={`/user/tickets/${ticketId}`}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      )
    }

  return (
    <DashboardLayout requiredRole="user">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/user/tickets/${ticketId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{t("tickets.editTitle")}</h1>
              <p className="text-muted-foreground mt-1">#{String(ticket.id).slice(-8)}</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("tickets.ticketInfo")}</CardTitle>
            <CardDescription>{t("tickets.updateTicketInfo")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  {t("tickets.title")}
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("tickets.titlePlaceholder")}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  {t("tickets.description")}
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("tickets.descriptionPlaceholder")}
                  rows={5}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  {t("tickets.category")}
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  required
                >
                  <option value="">{t("tickets.selectCategory")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Type */}
              <div>
                <label htmlFor="productType" className="block text-sm font-medium mb-2">
                  {t("tickets.productType")}
                </label>
                <select
                  id="productType"
                  value={productTypeId}
                  onChange={(e) => setProductTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  required
                >
                  <option value="">{t("tickets.selectProductType")}</option>
                  {productTypes.map((productType) => (
                    <option key={productType.id} value={productType.id}>
                      {productType.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-2">
                  {t("tickets.priority")}
                </label>
                <select
                  id="priority"
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  required
                >
                  <option value="">{t("tickets.selectPriority")}</option>
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2">
                <Link href={`/user/tickets/${ticketId}`}>
                  <Button type="button" variant="outline">
                    <X className="mr-2 h-4 w-4" />
                    {t("tickets.cancel")}
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? t("tickets.saving") : t("tickets.saveChanges")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 