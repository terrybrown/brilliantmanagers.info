"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    icons={{
      success: <CircleCheck className="h-4 w-4" />,
      info: <Info className="h-4 w-4" />,
      warning: <TriangleAlert className="h-4 w-4" />,
      error: <OctagonX className="h-4 w-4" />,
      loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
    }}
    {...props}
  />
)

export { Toaster }
