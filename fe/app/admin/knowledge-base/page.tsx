"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Plus, Search, Edit, Trash2, FileText, X, Eye } from "lucide-react"

interface KnowledgeBase {
  id: number
  title: string
  slug: string
  content: string
  category: string
  views: number
  file_path: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export default function AdminKnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; doc: KnowledgeBase | null }>({ open: false, doc: null })
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; doc: KnowledgeBase | null }>({ open: false, doc: null })
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    slug: "",
    is_published: true
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { t } = useLanguage()
  const { addToast } = useToast()

  // Debounce search term
  const debouncedSearchTerm = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (value: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          setSearchTerm(value)
        }, 500)
      }
    })(),
    []
  )

  useEffect(() => {
    fetchDocuments()
  }, [currentPage, searchTerm, categoryFilter])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getKnowledgeBase({
        search: searchTerm,
        category: categoryFilter === "all" ? "" : categoryFilter,
        page: currentPage,
        pageSize: 10
      }) as any

      setDocuments(response.docs || [])
      setTotalPages(Math.ceil((response.total || 0) / 10))
      setTotalDocs(response.total || 0)
    } catch (error: any) {
      console.error("Failed to fetch documents:", error)
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to load documents",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDocument = async () => {
    if (!formData.title || !formData.content || !formData.category) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: "Please fill in all required fields",
      })
      return
    }

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('slug', formData.slug)
      formDataToSend.append('is_published', formData.is_published.toString())
      if (selectedFile) {
        formDataToSend.append('file', selectedFile)
      }

      await apiClient.createKnowledgeBase(formDataToSend)
      setCreateDialog(false)
      setFormData({ title: "", content: "", category: "", slug: "", is_published: true })
      setSelectedFile(null)
      fetchDocuments()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Document created successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to create document",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateDocument = async () => {
    if (!editDialog.doc) return

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('slug', formData.slug)
      formDataToSend.append('is_published', formData.is_published.toString())
      if (selectedFile) {
        formDataToSend.append('file', selectedFile)
      }

      await apiClient.updateKnowledgeBase(editDialog.doc.id.toString(), formDataToSend)
      setEditDialog({ open: false, doc: null })
      setFormData({ title: "", content: "", category: "", slug: "", is_published: true })
      setSelectedFile(null)
      fetchDocuments()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Document updated successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to update document",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      await apiClient.deleteKnowledgeBase(docId.toString())
      fetchDocuments()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Document deleted successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to delete document",
      })
    }
  }

  const openEditDialog = (doc: KnowledgeBase) => {
    setEditDialog({ open: true, doc })
    setFormData({
      title: doc.title,
      content: doc.content,
      category: doc.category,
      slug: doc.slug,
      is_published: doc.is_published
    })
    setSelectedFile(null)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSearchInput("")
    setCategoryFilter("all")
    setCurrentPage(1)
    fetchDocuments()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase()
  }

  const isImage = (filename: string) => {
    const ext = getFileExtension(filename)
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
  }

  const isVideo = (filename: string) => {
    const ext = getFileExtension(filename)
    return ['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')
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
          <h1 className="text-3xl font-bold">{t("admin.knowledge.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.knowledge.description")}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("common.search")}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    debouncedSearchTerm(e.target.value)
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="whitespace-nowrap"
              >
                {t("common.clearFilters")}
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label>{t("admin.knowledge.category")}:</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("admin.knowledge.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.knowledge.allCategories")}</SelectItem>
                    <SelectItem value="Hướng dẫn">Hướng dẫn</SelectItem>
                    <SelectItem value="FAQ">FAQ</SelectItem>
                    <SelectItem value="Tài liệu">Tài liệu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("admin.knowledge.title")} ({documents.length})</CardTitle>
                <CardDescription>{t("admin.knowledge.description")}</CardDescription>
              </div>
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.knowledge.addDocument")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{doc.content}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.is_published ? 'Published' : 'Draft'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {doc.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {doc.views} views
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewDialog({ open: true, doc })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(doc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  {t("common.showing")} {documents.length} {t("admin.knowledge.documents")} ({t("common.total")}: {totalDocs}, {t("common.page")}: {currentPage}/{totalPages})
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Document Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("admin.knowledge.createDocument")}</DialogTitle>
              <DialogDescription>
                {t("admin.knowledge.createDocumentDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t("admin.knowledge.title")}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slug">{t("admin.knowledge.slug")}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated from title"
                />
              </div>
              <div>
                <Label htmlFor="category">{t("admin.knowledge.category")}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.knowledge.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hướng dẫn">Hướng dẫn</SelectItem>
                    <SelectItem value="FAQ">FAQ</SelectItem>
                    <SelectItem value="Tài liệu">Tài liệu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">{t("admin.knowledge.content")}</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="file">{t("admin.knowledge.file")}</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label htmlFor="published">{t("admin.knowledge.published")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateDocument} disabled={submitting}>
                {submitting ? t("common.creating") : t("admin.knowledge.createDocument")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, doc: null })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("admin.knowledge.editDocument")}</DialogTitle>
              <DialogDescription>
                {t("admin.knowledge.editDocumentDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">{t("admin.knowledge.title")}</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-slug">{t("admin.knowledge.slug")}</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">{t("admin.knowledge.category")}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.knowledge.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hướng dẫn">Hướng dẫn</SelectItem>
                    <SelectItem value="FAQ">FAQ</SelectItem>
                    <SelectItem value="Tài liệu">Tài liệu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-content">{t("admin.knowledge.content")}</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="edit-file">{t("admin.knowledge.file")}</Label>
                <Input
                  id="edit-file"
                  type="file"
                  onChange={handleFileChange}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label htmlFor="edit-published">{t("admin.knowledge.published")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog({ open: false, doc: null })}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleUpdateDocument} disabled={submitting}>
                {submitting ? t("common.updating") : t("common.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Document Dialog */}
        <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, doc: null })}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewDialog.doc?.title}</DialogTitle>
              <DialogDescription>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    {previewDialog.doc?.category}
                  </span>
                  <span className={`px-2 py-1 rounded-full ${
                    previewDialog.doc?.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {previewDialog.doc?.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span>{previewDialog.doc?.views} views</span>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Content */}
              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="prose max-w-none">
                    {previewDialog.doc?.content}
                  </div>
                </div>
              </div>

              {/* File Preview */}
              {previewDialog.doc?.file_path && (
                <div>
                  <Label className="text-sm font-medium">Attachment</Label>
                  <div className="mt-2">
                    {isImage(previewDialog.doc.file_path) ? (
                      <div className="space-y-2">
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${previewDialog.doc.file_path}`}
                          alt="Document preview" 
                          className="max-w-full h-auto rounded-lg border"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${previewDialog.doc!.file_path}`, '_blank')}
                        >
                          Download File
                        </Button>
                      </div>
                    ) : isVideo(previewDialog.doc.file_path) ? (
                      <div className="space-y-2">
                        <video 
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${previewDialog.doc.file_path}`}
                          controls
                          className="max-w-full h-auto rounded-lg border"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${previewDialog.doc!.file_path}`, '_blank')}
                        >
                          Download File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-4 bg-gray-100 rounded-lg flex items-center space-x-2">
                          <FileText className="h-6 w-6 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {previewDialog.doc.file_path.split('/').pop()}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${previewDialog.doc!.file_path}`, '_blank')}
                        >
                          Download File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {previewDialog.doc?.created_at ? formatDate(previewDialog.doc.created_at) : ''}</p>
                <p>Updated: {previewDialog.doc?.updated_at ? formatDate(previewDialog.doc.updated_at) : ''}</p>
                <p>Slug: {previewDialog.doc?.slug}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDialog({ open: false, doc: null })}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 