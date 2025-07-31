"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type User = {
  id: string
  email: string
  fullName: string
  role: "user" | "admin"
  isEmailVerified: boolean
  is2FAEnabled: boolean
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string, twoFactorCode?: string) => Promise<void>
  login2FA: (userId: number, code: string) => Promise<void>
  register: (fullName: string, email: string, password: string, phone: string) => Promise<void>
  logout: () => void
  loading: boolean
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  useEffect(() => {
    checkAuth()
    
    // Set up automatic token refresh
    const setupAutoRefresh = () => {
      const token = localStorage.getItem("accessToken")
      if (!token) return
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const exp = payload.exp * 1000 // Convert to milliseconds
        const now = Date.now()
        const timeUntilExpiry = exp - now - 30000 // Refresh 30 seconds before expiry
        
        if (timeUntilExpiry > 0) {
          setTimeout(async () => {
            try {
              await refreshToken()
            } catch (error) {
              console.error("Auto refresh failed:", error)
              logout()
            }
          }, timeUntilExpiry)
        }
      } catch (error) {
        console.error("Failed to parse token:", error)
      }
    }
    
    setupAutoRefresh()
    
    // Check every minute for token expiry
    const interval = setInterval(setupAutoRefresh, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const checkAuth = async () => {
    try {
      console.log("AuthProvider: Checking authentication...")
      const token = localStorage.getItem("accessToken")
      if (!token) {
        console.log("AuthProvider: No access token found in localStorage")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: 'include' as RequestCredentials,
      })

      console.log("AuthProvider: Profile response status:", response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log("AuthProvider: Profile response data:", userData)
        // Backend returns user data in user object
        const backendUser = userData.user || userData
        // Map backend user data to frontend format
        const mappedUser = {
          id: backendUser.id?.toString() || '',
          email: backendUser.email || '',
          fullName: backendUser.name || backendUser.fullName || '',
          role: backendUser.role === 'customer' ? 'user' : backendUser.role || 'user',
          isEmailVerified: backendUser.is_verified || backendUser.isEmailVerified || false,
          is2FAEnabled: backendUser.two_factor_enabled || backendUser.is2FAEnabled || false,
        }
        console.log("AuthProvider: Setting user:", mappedUser)
        setUser(mappedUser)
      } else {
        console.log("AuthProvider: Profile request failed")
        localStorage.removeItem("accessToken")
        setUser(null)
      }
    } catch (error) {
      console.error("AuthProvider: Auth check failed:", error)
      localStorage.removeItem("accessToken")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string, twoFactorCode?: string) => {
    try {
      console.log("AuthProvider: Attempting login...")
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          twoFactorCode,
        }),
      })

      console.log("AuthProvider: Login response status:", response.status)
      const data = await response.json()
      console.log("AuthProvider: Login response data:", data)

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      if (data.require_2fa) {
        throw new Error("2FA_REQUIRED")
      }

      // Store access token in localStorage
      localStorage.setItem("accessToken", data.accessToken)

      // Map backend user data to frontend format
      const mappedUser = {
        id: data.user.id?.toString() || '',
        email: data.user.email || '',
        fullName: data.user.name || data.user.fullName || '',
        role: data.user.role === 'customer' ? 'user' : data.user.role || 'user',
        isEmailVerified: data.user.is_verified || false,
        is2FAEnabled: data.user.two_factor_enabled || false,
      }
      console.log("AuthProvider: Setting user after login:", mappedUser)
      setUser(mappedUser)

      // Redirect based on role
      if (data.user.role === "admin") {
        console.log("AuthProvider: Redirecting to admin dashboard")
        router.push("/admin/dashboard")
      } else {
        console.log("AuthProvider: Redirecting to user dashboard")
        router.push("/user/dashboard")
      }
    } catch (error) {
      console.error("AuthProvider: Login error:", error)
      throw error
    }
  }

  const login2FA = async (userId: number, code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login/2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          code: code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "2FA verification failed")
      }

      // Store access token in localStorage
      localStorage.setItem("accessToken", data.accessToken)

      // Map backend user data to frontend format
      const mappedUser = {
        id: data.user.id?.toString() || '',
        email: data.user.email || '',
        fullName: data.user.name || data.user.fullName || '',
        role: data.user.role === 'customer' ? 'user' : data.user.role || 'user',
        isEmailVerified: data.user.is_verified || false,
        is2FAEnabled: data.user.two_factor_enabled || false,
      }
      setUser(mappedUser)

      // Redirect based on role
      if (data.user.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/user/dashboard")
      }
    } catch (error) {
      throw error
    }
  }

  const register = async (fullName: string, email: string, password: string, phone: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName, // Backend expects 'name' field
          email,
          password,
          phone, // Backend expects 'phone' field
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Registration failed")
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem("accessToken")
    setUser(null)
    router.push("/login")
  }

  const refreshToken = async () => {
    try {
      console.log("AuthProvider: Attempting to refresh token...")
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: "POST",
        credentials: 'include' as RequestCredentials,
      })

      console.log("AuthProvider: Refresh response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("AuthProvider: Refresh failed with status:", response.status)
        console.error("AuthProvider: Refresh error response:", errorText)
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("AuthProvider: Refresh response data:", data)

      // Store access token in localStorage
      localStorage.setItem("accessToken", data.accessToken)
      console.log("AuthProvider: Token refreshed successfully")
      return data.accessToken
    } catch (error) {
      console.error("AuthProvider: Refresh token error:", error)
      logout()
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        login2FA,
        register,
        logout,
        loading,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
