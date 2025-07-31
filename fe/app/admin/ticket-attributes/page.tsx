"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { Plus, Edit, Trash2, Tag, Package, AlertTriangle } from "lucide-react"

interface TicketAttribute {
  id: number
  name: string
}

export default function AdminTicketAttributesPage() {
  const [categories, setCategories] = useState<TicketAttribute[]>([])
  const [productTypes, setProductTypes] = useState<TicketAttribute[]>([])
  const [priorities, setPriorities] = useState<TicketAttribute[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("categories")
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState<{ open: boolean; type: string }>({ open: false, type: "" })
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: TicketAttribute | null }>({ open: false, type: "", item: null })
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: "" })

  const { t } = useLanguage()
  const { addToast } = useToast()

  useEffect(() => {
    fetchAllAttributes()
  }, [])

  const fetchAllAttributes = async () => {
    try {
      setLoading(true)
      const [categoriesRes, productTypesRes, prioritiesRes] = await Promise.all([
        apiClient.getTicketCategories(),
        apiClient.getTicketProductTypes(),
        apiClient.getTicketPriorities()
      ]) as any[]

      setCategories(categoriesRes.data || [])
      setProductTypes(productTypesRes.data || [])
      setPriorities(prioritiesRes.data || [])
    } catch (error: any) {
      console.error("Failed to fetch attributes:", error)
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to load attributes",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAttribute = async () => {
    if (!formData.name.trim()) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: "Please enter a name",
      })
      return
    }

    setSubmitting(true)
    try {
      const type = createDialog.type
      let response: any

      switch (type) {
        case "category":
          response = await apiClient.createTicketCategory({ name: formData.name })
          break
        case "productType":
          response = await apiClient.createTicketProductType({ name: formData.name })
          break
        case "priority":
          response = await apiClient.createTicketPriority({ name: formData.name })
          break
      }

      setCreateDialog({ open: false, type: "" })
      setFormData({ name: "" })
      fetchAllAttributes()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Attribute created successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to create attribute",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateAttribute = async () => {
    if (!formData.name.trim() || !editDialog.item) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: "Please enter a name",
      })
      return
    }

    setSubmitting(true)
    try {
      const type = editDialog.type
      let response: any

      switch (type) {
        case "category":
          response = await apiClient.updateTicketCategory(editDialog.item.id.toString(), { name: formData.name })
          break
        case "productType":
          response = await apiClient.updateTicketProductType(editDialog.item.id.toString(), { name: formData.name })
          break
        case "priority":
          response = await apiClient.updateTicketPriority(editDialog.item.id.toString(), { name: formData.name })
          break
      }

      setEditDialog({ open: false, type: "", item: null })
      setFormData({ name: "" })
      fetchAllAttributes()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Attribute updated successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to update attribute",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAttribute = async (type: string, id: number) => {
    if (!confirm("Are you sure you want to delete this attribute?")) return

    try {
      let response: any

      switch (type) {
        case "category":
          response = await apiClient.deleteTicketCategory(id.toString())
          break
        case "productType":
          response = await apiClient.deleteTicketProductType(id.toString())
          break
        case "priority":
          response = await apiClient.deleteTicketPriority(id.toString())
          break
      }

      fetchAllAttributes()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Attribute deleted successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to delete attribute",
      })
    }
  }

  const openCreateDialog = (type: string) => {
    setCreateDialog({ open: true, type })
    setFormData({ name: "" })
  }

  const openEditDialog = (type: string, item: TicketAttribute) => {
    setEditDialog({ open: true, type, item })
    setFormData({ name: item.name })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "category":
        return <Tag className="h-4 w-4" />
      case "productType":
        return <Package className="h-4 w-4" />
      case "priority":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Tag className="h-4 w-4" />
    }
  }

  const getTypeTitle = (type: string) => {
    switch (type) {
      case "category":
        return t("admin.ticketAttributes.categories")
      case "productType":
        return t("admin.ticketAttributes.productTypes")
      case "priority":
        return t("admin.ticketAttributes.priorities")
      default:
        return type
    }
  }

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "category":
        return t("admin.ticketAttributes.categoriesDescription")
      case "productType":
        return t("admin.ticketAttributes.productTypesDescription")
      case "priority":
        return t("admin.ticketAttributes.prioritiesDescription")
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <DashboardLayout requiredRole="admin">
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
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{t("admin.ticketAttributes.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.ticketAttributes.description")}</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>{t("admin.ticketAttributes.categories")}</span>
            </TabsTrigger>
            <TabsTrigger value="productTypes" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>{t("admin.ticketAttributes.productTypes")}</span>
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("admin.ticketAttributes.priorities")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Tag className="h-5 w-5" />
                      <span>{t("admin.ticketAttributes.categories")}</span>
                    </CardTitle>
                    <CardDescription>{t("admin.ticketAttributes.categoriesDescription")}</CardDescription>
                  </div>
                  <Button onClick={() => openCreateDialog("category")}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("admin.ticketAttributes.addCategory")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {category.id}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog("category", category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAttribute("category", category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Types Tab */}
          <TabsContent value="productTypes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="h-5 w-5" />
                      <span>{t("admin.ticketAttributes.productTypes")}</span>
                    </CardTitle>
                    <CardDescription>{t("admin.ticketAttributes.productTypesDescription")}</CardDescription>
                  </div>
                  <Button onClick={() => openCreateDialog("productType")}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("admin.ticketAttributes.addProductType")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productTypes.map((productType) => (
                    <div key={productType.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{productType.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {productType.id}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog("productType", productType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAttribute("productType", productType.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Priorities Tab */}
          <TabsContent value="priorities" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>{t("admin.ticketAttributes.priorities")}</span>
                    </CardTitle>
                    <CardDescription>{t("admin.ticketAttributes.prioritiesDescription")}</CardDescription>
                  </div>
                  <Button onClick={() => openCreateDialog("priority")}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("admin.ticketAttributes.addPriority")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priorities.map((priority) => (
                    <div key={priority.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{priority.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {priority.id}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog("priority", priority)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAttribute("priority", priority.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={createDialog.open} onOpenChange={(open) => setCreateDialog({ open, type: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.ticketAttributes.createAttribute")}</DialogTitle>
              <DialogDescription>
                {t("admin.ticketAttributes.createAttributeDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("admin.ticketAttributes.name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder={t("admin.ticketAttributes.namePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog({ open: false, type: "" })}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateAttribute} disabled={submitting}>
                {submitting ? t("common.creating") : t("admin.ticketAttributes.createAttribute")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, type: "", item: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.ticketAttributes.editAttribute")}</DialogTitle>
              <DialogDescription>
                {t("admin.ticketAttributes.editAttributeDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t("admin.ticketAttributes.name")}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder={t("admin.ticketAttributes.namePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog({ open: false, type: "", item: null })}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleUpdateAttribute} disabled={submitting}>
                {submitting ? t("common.updating") : t("common.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 