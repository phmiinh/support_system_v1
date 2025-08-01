import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) {
    return "N/A"
  }
  
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date"
    }
    
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    }).format(dateObj)
  } catch (error) {
    return "Invalid Date"
  }
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "new":
    case "mới":
      return "bg-[#f1f5f9] text-blue-800 dark:bg-[#1e293b] dark:text-blue-100"
    case "in_progress":
    case "đang xử lý":
      return "bg-[#f1f5f9] text-yellow-800 dark:bg-[#1e293b] dark:text-yellow-100"
    case "pending":
    case "chờ xử lý":
    case "chờ phản hồi":
      return "bg-[#f1f5f9] text-orange-800 dark:bg-[#1e293b] dark:text-orange-100"
    case "resolved":
    case "đã giải quyết":
    case "đã xử lý":
      return "bg-[#f1f5f9] text-green-800 dark:bg-[#1e293b] dark:text-green-100"
    case "closed":
    case "đã đóng":
      return "bg-[#f1f5f9] text-gray-800 dark:bg-[#1e293b] dark:text-gray-100"
    default:
      return "bg-[#f1f5f9] text-gray-800 dark:bg-[#1e293b] dark:text-gray-100"
  }
}

export function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "low":
    case "thấp":
      return "bg-[#f1f5f9] text-green-800 dark:bg-[#1e293b] dark:text-green-100"
    case "medium":
    case "trung bình":
      return "bg-[#f1f5f9] text-yellow-800 dark:bg-[#1e293b] dark:text-yellow-100"
    case "high":
    case "cao":
      return "bg-[#f1f5f9] text-orange-800 dark:bg-[#1e293b] dark:text-orange-100"
    case "urgent":
    case "khẩn cấp":
      return "bg-[#f1f5f9] text-red-800 dark:bg-[#1e293b] dark:text-red-100"
    default:
      return "bg-[#f1f5f9] text-gray-800 dark:bg-[#1e293b] dark:text-gray-100"
  }
}
