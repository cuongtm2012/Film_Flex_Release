import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getToastIcon = (variant?: string) => {
    switch (variant) {
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
      default:
        return null
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = getToastIcon(variant)

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 w-full">
              {icon}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
