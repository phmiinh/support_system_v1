"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { formatDate, getStatusColor, getPriorityColor } from "@/lib/utils"
import { ArrowLeft, Send, Download, Eye, Edit, Trash2, MessageCircle } from "lucide-react"
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
  user?: { id: number; name: string; email: string; role: string }
  last_viewed_comment_at?: string
}

interface Comment {
  id: number
  content: string
  created_at: string
  attachment_url?: string
  author_name: string
  parent_id?: number | null
  replies?: Comment[]
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentContent, setCommentContent] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")

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

  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>()
    const rootComments: Comment[] = []

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies!.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    return rootComments
  }

  useEffect(() => {
    fetchTicketDetail()
    fetchComments()
  }, [ticketId])

  const fetchTicketDetail = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getTicket(ticketId) as any
      setTicket(response.ticket)
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

  const fetchComments = async () => {
    try {
      const response = await apiClient.getTicketComments(ticketId) as any
      const commentTree = buildCommentTree(response.comments || [])
      setComments(commentTree)
    } catch (error: any) {
      console.error("Failed to load comments:", error)
    }
  }

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) return

    try {
      setSubmittingComment(true)
      await apiClient.addTicketComment(ticketId, commentContent)
      setCommentContent("")
      fetchComments() // Refresh comments
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Bình luận đã được thêm thành công",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Không thể thêm bình luận",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim()) return

    try {
      setSubmittingComment(true)
      // Create FormData for multipart/form-data
      const formData = new FormData()
      formData.append('content', replyContent)
      formData.append('parent_id', parentId.toString())
      
      await apiClient.addTicketComment(ticketId, replyContent, parentId)
      setReplyContent("")
      setReplyingTo(null)
      fetchComments() // Refresh comments
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Phản hồi đã được thêm thành công",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Không thể thêm phản hồi",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteTicket = async () => {
    if (!confirm(t("tickets.confirmWithdraw"))) return

    try {
      console.log("Deleting ticket:", ticketId) // Debug
      await apiClient.deleteTicket(ticketId)
      addToast({
        type: "success",
        title: t("common.success"),
        message: t("tickets.withdrawSuccess"),
      })
      router.push("/user/tickets")
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || t("tickets.withdrawError"),
      })
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
                {[...Array(3)].map((_, i) => (
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

  return (
    <DashboardLayout requiredRole="user">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/user/tickets">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">#{String(ticket.id).slice(-8)}</h1>
              <p className="text-muted-foreground mt-1">{ticket.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {ticket.status === "Mới" && (
              <>
                <Link href={`/user/tickets/${ticketId}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    {t("tickets.edit")}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteTicket}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("tickets.withdraw")}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("tickets.details")}</CardTitle>
            <CardDescription>{t("tickets.completeInfo")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status and Priority */}
            <div className="flex items-center space-x-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}
              >
                {ticket.status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(getPriorityName(ticket.priority))}`}
              >
                {getPriorityName(ticket.priority)}
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">{t("tickets.description")}</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">{t("tickets.category")}</h3>
                <p className="text-muted-foreground">{getCategoryName(ticket.category)}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">{t("tickets.productType")}</h3>
                <p className="text-muted-foreground">{getProductTypeName(ticket.product_type)}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">{t("tickets.created")}</h3>
                <p className="text-muted-foreground">{formatDate(ticket.created_at)}</p>
              </div>
              {ticket.resolved_at && (
                <div>
                  <h3 className="font-medium mb-2">{t("tickets.resolved")}</h3>
                  <p className="text-muted-foreground">{formatDate(ticket.resolved_at)}</p>
                </div>
              )}
            </div>

            {/* Attachment */}
            {ticket.attachment_path && (
              <div>
                <h3 className="font-medium mb-2">{t("tickets.attachment")}</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${ticket.attachment_path}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="mr-2 h-4 w-4" />
                      {t("tickets.view")}
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const fileUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${ticket.attachment_path}`
                      window.open(fileUrl, '_blank')
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("tickets.download")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              {t("tickets.comments")} ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User can only reply to admin comments, not create new comments */}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    onReply={(commentId) => setReplyingTo(commentId)}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    onSubmitReply={handleSubmitReply}
                    submitting={submittingComment}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("tickets.noComments")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// CommentItem component for recursive comment display
interface CommentItemProps {
  comment: Comment
  onReply: (commentId: number) => void
  replyingTo: number | null
  setReplyingTo: (commentId: number | null) => void
  replyContent: string
  setReplyContent: (content: string) => void
  onSubmitReply: (parentId: number) => void
  submitting: boolean
}

function CommentItem({ 
  comment, 
  onReply, 
  replyingTo, 
  setReplyingTo,
  replyContent, 
  setReplyContent, 
  onSubmitReply, 
  submitting 
}: CommentItemProps) {
  const { t } = useLanguage()
  const isReplying = replyingTo === comment.id

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{comment.author_name}</span>
          <span className="text-sm text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReply(comment.id)}
          disabled={submitting}
        >
          {t("tickets.reply")}
        </Button>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="whitespace-pre-wrap">{comment.content}</p>
      </div>
      
      {comment.attachment_url && (
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const fileUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${comment.attachment_url}`
              window.open(fileUrl, '_blank')
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("tickets.viewAttachment")}
          </Button>
        </div>
      )}

      {/* Reply form */}
      {isReplying && (
        <div className="mt-4 space-y-4">
          <Textarea
            placeholder={t("tickets.addCommentPlaceholder")}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReplyingTo(null)
                setReplyContent("")
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => onSubmitReply(comment.id)}
              disabled={!replyContent.trim() || submitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? t("tickets.sending") : t("tickets.sendComment")}
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-6 max-h-60 overflow-y-auto space-y-4 pr-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={onSubmitReply}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  )
} 