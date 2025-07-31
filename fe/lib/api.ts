interface Notification {
  id: number
  user_id: number
  type: string
  content: string
  data?: string
  is_read: boolean
  created_at: string
}

class ApiClient {
  private baseURL: string
  private isRefreshing = false
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
  }

  // Check if token is expired or will expire soon
  private isTokenExpired(): boolean {
    const token = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null
    if (!token) return true
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const exp = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      const timeUntilExpiry = exp - now
      
      console.log(`Token expires in ${Math.round(timeUntilExpiry / 1000)} seconds`)
      
      // Refresh if token expires in next 30 seconds
      return now >= (exp - 30000)
    } catch (error) {
      console.error("Failed to parse token:", error)
      return true
    }
  }

  // Refresh token function
  private async refreshToken(): Promise<string> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the existing promise
      return this.refreshPromise!
    }

    this.isRefreshing = true
    this.refreshPromise = this.performRefresh()

    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performRefresh(): Promise<string> {
    try {
      console.log("Attempting to refresh token...")
      console.log("Refresh URL:", `${this.baseURL}/refresh-token`)
      
      const response = await fetch(`${this.baseURL}/refresh-token`, {
        method: "POST",
        credentials: 'include' as RequestCredentials,
      })

      console.log("Refresh response status:", response.status)
      console.log("Refresh response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Refresh failed with status:", response.status)
        console.error("Refresh error response:", errorText)
        throw new Error(`Refresh failed: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      console.log("Refresh response data:", responseData)
      
      const { accessToken } = responseData
      console.log("Token refreshed successfully")
      
      // Store access token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem("accessToken", accessToken)
      }

      return accessToken
    } catch (error) {
      console.error("Refresh token error:", error)
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem("accessToken")
        window.location.href = "/login"
      }
      throw error
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    // Check if token is expired and refresh if needed
    if (this.isTokenExpired()) {
      try {
        await this.refreshToken()
      } catch (error) {
        // If refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem("accessToken")
          window.location.href = "/login"
        }
        throw new Error("Authentication failed")
      }
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }
    
    // Only set Content-Type for JSON requests
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json"
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const requestOptions = {
        ...options,
        headers,
        credentials: 'include' as RequestCredentials, // Include cookies in requests
      }
      
      // Handle body serialization - only if body is not already a string
      if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
        requestOptions.body = JSON.stringify(options.body)
      }
      
      const response = await fetch(url, requestOptions)

      if (response.status === 401) {
        // Try to refresh token and retry once
        try {
          const newToken = await this.refreshToken()
          headers.Authorization = `Bearer ${newToken}`
          
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' as RequestCredentials,
          })

          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`)
          }

          return retryResponse.json()
        } catch (refreshError) {
          // Refresh failed, redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem("accessToken")
            window.location.href = "/login"
          }
          throw new Error("Authentication failed")
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error:", response.status, errorData) // Debug
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  // Auth endpoints
  async login(email: string, password: string, twoFactorCode?: string) {
    return this.request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, twoFactorCode }),
    })
  }

  async register(fullName: string, email: string, password: string) {
    return this.request("/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
    })
  }

  async forgotPassword(email: string) {
    return this.request("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request("/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    })
  }

  async verifyEmail(email: string, token: string) {
    return this.request("/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, token }),
    })
  }

  async resendVerificationEmail(email: string) {
    return this.request("/resend-verification-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  }

  // User endpoints
  async getProfile() {
    return this.request("/user/profile")
  }

  async updateProfile(data: any) {
    return this.request("/user/profile", {
      method: "PUT",
      body: data,
    })
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request("/user/profile/change-password", {
      method: "POST",
      body: JSON.stringify({ old_password: currentPassword, new_password: newPassword }),
    })
  }

  // 2FA endpoints
  async setup2FA() {
    return this.request("/user/profile/2fa/setup", { method: "POST" })
  }

  async enable2FA(code: string) {
    return this.request("/user/profile/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
  }

  async verify2FA(code: string) {
    return this.request("/user/profile/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
  }

  async disable2FA(code: string) {
    return this.request("/user/profile/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
  }

  // Ticket endpoints
  async getTickets(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : ""
    return this.request(`/user/tickets${queryString}`)
  }

  async getTicket(id: string) {
    return this.request(`/user/tickets/${id}`)
  }

  async createTicket(data: FormData) {
    return this.request("/user/tickets", {
      method: "POST",
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  async updateTicket(id: string, data: any) {
    console.log("API: Updating ticket", id, data) // Debug
    return this.request(`/user/tickets/${id}`, {
      method: "PUT",
      body: data,
    })
  }

  async deleteTicket(id: string) {
    console.log("API: Deleting ticket", id) // Debug
    return this.request(`/user/tickets/${id}`, {
      method: "DELETE",
    })
  }

  async addTicketComment(ticketId: string, content: string, parentId?: number) {
    const formData = new FormData()
    formData.append('content', content)
    if (parentId) {
      formData.append('parent_id', parentId.toString())
    }
    
    return this.request(`/user/tickets/${ticketId}/comments`, {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  async getTicketComments(ticketId: string) {
    return this.request(`/user/tickets/${ticketId}/comments`)
  }

  // Admin endpoints
  async getAdminDashboardStats(): Promise<{ success: boolean; stats: any }> {
    return this.request("/admin/dashboard/stats")
  }

  // Admin ticket endpoints
  async getAdminTickets(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : ""
    return this.request(`/admin/tickets${queryString}`)
  }

  async getAdminTicketDetail(id: string) {
    return this.request(`/admin/tickets/${id}`)
  }

  async updateAdminTicketStatus(id: string, status: string, priorityId?: number) {
    return this.request(`/admin/tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, priority_id: priorityId }),
    })
  }

  async assignTicket(id: string, staffId: number) {
    return this.request(`/admin/tickets/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ assigned_to: staffId }),
    })
  }

  async getAssignableStaff() {
    return this.request("/admin/staff")
  }

  async updateTicketStatus(ticketId: string, status: string, priorityId: number) {
    return this.request(`/admin/tickets/${ticketId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, priority_id: priorityId }),
    })
  }

  // Admin user management
  async getAdminUsers(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : ""
    return this.request(`/admin/users${queryString}`)
  }

  async createAdminUser(data: any) {
    return this.request("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateAdminUser(id: string, data: any) {
    return this.request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteAdminUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: "DELETE",
    })
  }

  async changeUserRole(id: string, role: string) {
    return this.request(`/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    })
  }

  async getUserDashboardStats() {
    return this.request("/user/dashboard/stats")
  }

  async getUsers(params?: { role?: string; keyword?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.role) searchParams.append('role', params.role)
    if (params?.keyword) searchParams.append('keyword', params.keyword)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    
    return this.request(`/admin/users?${searchParams.toString()}`)
  }

  async createUser(data: { name: string; email: string; phone: string; password: string; role: string }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: string, data: { name?: string; email?: string; phone?: string; role?: string }) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  }

  // Knowledge base endpoints
  async getKnowledgeBase() {
    return this.request('/user/knowledge-base')
  }

  async getKnowledgeBaseArticle(slug: string) {
    return this.request(`/user/knowledge-base/${slug}`)
  }

  async createKnowledgeBase(data: FormData) {
    return this.request('/admin/knowledge-base', {
      method: 'POST',
      body: data,
    })
  }

  async updateKnowledgeBase(id: string, data: FormData) {
    return this.request(`/admin/knowledge-base/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  async deleteKnowledgeBase(id: string) {
    return this.request(`/admin/knowledge-base/${id}`, {
      method: 'DELETE',
    })
  }

  // Settings endpoints
  async getTicketCategories() {
    return this.request("/ticket-categories")
  }

  async getTicketPriorities() {
    return this.request("/admin/ticket-priorities")
  }

  async getTicketProductTypes() {
    return this.request("/ticket-product-types")
  }

  // Notification endpoints
  async getNotifications(): Promise<{ notifications: Notification[] }> {
    return this.request("/user/notifications")
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/user/notifications/${id}/read`, {
      method: "POST",
    })
  }

  // Admin notification endpoints
  async getAdminNotifications() {
    return this.request("/admin/notifications")
  }

  async markAdminNotificationAsRead(id: string) {
    return this.request(`/admin/notifications/${id}/read`, {
      method: "POST",
    })
  }

  // Admin settings
  async createTicketCategory(data: { name: string }) {
    return this.request('/admin/ticket-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTicketCategory(id: string, data: { name: string }) {
    return this.request(`/admin/ticket-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTicketCategory(id: string) {
    return this.request(`/admin/ticket-categories/${id}`, {
      method: 'DELETE',
    })
  }

  async createTicketProductType(data: { name: string }) {
    return this.request('/admin/ticket-product-types', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTicketProductType(id: string, data: { name: string }) {
    return this.request(`/admin/ticket-product-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTicketProductType(id: string) {
    return this.request(`/admin/ticket-product-types/${id}`, {
      method: 'DELETE',
    })
  }

  async createTicketPriority(data: { name: string }) {
    return this.request('/admin/ticket-priorities', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTicketPriority(id: string, data: { name: string }) {
    return this.request(`/admin/ticket-priorities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTicketPriority(id: string) {
    return this.request(`/admin/ticket-priorities/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
