"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Loader2, Upload, X } from "lucide-react"

interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
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

export function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [productTypeId, setProductTypeId] = useState("")
  const [priorityId, setPriorityId] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { t } = useLanguage()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchFormData()
    }
  }, [isOpen])

  const fetchFormData = async () => {
    try {
      setLoading(true)
      const [categoriesRes, productTypesRes, prioritiesRes] = await Promise.all([
        apiClient.getTicketCategories(),
        apiClient.getTicketProductTypes(),
        apiClient.getTicketPriorities(),
      ])

      setCategories((categoriesRes as any).data || [])
      setProductTypes((productTypesRes as any).data || [])
      setPriorities((prioritiesRes as any).data || [])
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to load form data",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!title.trim() || !description.trim() || !categoryId || !productTypeId || !priorityId) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("tickets.fillAllFields"),
      })
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.append("title", title.trim())
      formData.append("description", description.trim())
      formData.append("category_id", categoryId)
      formData.append("product_type_id", productTypeId)
      formData.append("priority_id", priorityId)

      if (attachment) {
        formData.append("attachment", attachment)
      }

      await apiClient.createTicket(formData)

      toast({
        title: t("common.success"),
        description: t("tickets.createSuccess"),
      })

      // Reset form
      setTitle("")
      setDescription("")
      setCategoryId("")
      setProductTypeId("")
      setPriorityId("")
      setAttachment(null)

      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("tickets.createError"),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: t("tickets.fileTooLarge"),
        })
        return
      }
      setAttachment(file)
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("tickets.createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("tickets.title")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tickets.titlePlaceholder")}
              required
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("tickets.description")} *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tickets.descriptionPlaceholder")}
              rows={5}
              required
              disabled={submitting}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{t("tickets.category")} *</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
              disabled={submitting || loading}
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
          <div className="space-y-2">
            <Label htmlFor="productType">{t("tickets.productType")} *</Label>
            <select
              id="productType"
              value={productTypeId}
              onChange={(e) => setProductTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
              disabled={submitting || loading}
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
          <div className="space-y-2">
            <Label htmlFor="priority">{t("tickets.priority")} *</Label>
            <select
              id="priority"
              value={priorityId}
              onChange={(e) => setPriorityId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
              disabled={submitting || loading}
            >
              <option value="">{t("tickets.selectPriority")}</option>
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
            </select>
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <Label htmlFor="attachment">{t("tickets.attachment")}</Label>
            <div className="space-y-2">
              <Input
                id="attachment"
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt"
                disabled={submitting}
              />
              {attachment && (
                <div className="flex items-center space-x-2 p-2 bg-muted rounded-md">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm flex-1">{attachment.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeAttachment}
                    disabled={submitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t("tickets.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || loading}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("tickets.creating")}
                </>
              ) : (
                t("tickets.createTicket")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 