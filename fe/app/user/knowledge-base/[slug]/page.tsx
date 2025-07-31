"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Loader2, ArrowLeft, Calendar, Eye, Download, FileText, Play, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

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

export default function KnowledgeBaseDetailPage() {
  const [document, setDocument] = useState<KnowledgeBase | null>(null)
  const [loading, setLoading] = useState(true)
  const hasFetchedRef = useRef(false)
  const params = useParams()
  const slug = params.slug as string

  const { t } = useLanguage()
  const { toast } = useToast()

  useEffect(() => {
    if (slug && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchDocument()
    }
  }, [slug])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      console.log("Fetching document with slug:", slug)
      const response = await apiClient.getKnowledgeBaseArticle(slug) as any
      console.log("API Response:", response)
      setDocument(response.doc || response)
    } catch (error: any) {
      console.error("Error fetching document:", error)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to load document",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return "N/A"
    }
  }



  const getFileType = (filePath: string) => {
    if (!filePath) return null
    const extension = filePath.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image'
    if (['pdf'].includes(extension || '')) return 'pdf'
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) return 'video'
    return 'other'
  }

  const getFileUrl = (filePath: string) => {
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${filePath}`
  }

  const renderFilePreview = (filePath: string, title: string) => {
    const fileType = getFileType(filePath)
    const fileUrl = getFileUrl(filePath)

    switch (fileType) {
      case 'image':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">{t("knowledge.preview")}</h3>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={fileUrl} 
                alt={title}
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>
        )
      
      case 'pdf':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">{t("knowledge.preview")}</h3>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={fileUrl}
                className="w-full h-96"
                title={title}
              />
            </div>
          </div>
        )
      
      case 'video':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">{t("knowledge.preview")}</h3>
            <div className="border rounded-lg overflow-hidden">
              <video 
                controls 
                className="w-full h-auto max-h-96"
                preload="metadata"
              >
                <source src={fileUrl} type={`video/${filePath.split('.').pop()}`} />
                {t("knowledge.videoNotSupported")}
              </video>
            </div>
          </div>
        )
      
      default:
        return null
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
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded w-full"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!document) {
    return (
      <DashboardLayout requiredRole="user">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">{t("knowledge.documentNotFound")}</p>
          <Link href="/user/knowledge-base">
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
            <Link href="/user/knowledge-base">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{document.title}</h1>
              <p className="text-muted-foreground mt-1">{document.category}</p>
            </div>
          </div>
          {document.file_path && (
            <Button 
              onClick={() => {
                const fileUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${document.file_path}`
                window.open(fileUrl, '_blank')
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("knowledge.download")}
            </Button>
          )}
        </div>

        {/* Document Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {document.category && (
                  <Badge variant="secondary">
                    {document.category}
                  </Badge>
                )}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(document.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{document.views} {t("knowledge.views")}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {document.content}
              </div>
            </div>
            
            {/* File Preview */}
            {document.file_path && renderFilePreview(document.file_path, document.title)}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 