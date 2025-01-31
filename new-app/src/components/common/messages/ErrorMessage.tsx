"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps) {
  return (
    <Alert variant="destructive" className={cn("flex flex-col gap-4", className)}>
      <div className="flex gap-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="destructive"
          size="sm"
          className="w-fit"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </Alert>
  )
} 