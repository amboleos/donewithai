/**
 * DoneWithAI UI Component Library
 *
 * A cohesive design system with distinctive character.
 *
 * @example
 * import { Button, Card, Badge } from "@/components/ui"
 */

// Button
export { Button, buttonVariants } from "./button"
export type { ButtonProps } from "./button"

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardDecoration,
  cardVariants,
} from "./card"
export type { CardProps, CardHeaderProps, CardTitleProps, CardContentProps, CardFooterProps, CardDecorationProps } from "./card"

// Badge
export {
  Badge,
  badgeVariants,
  AIBadge,
  StatusBadge,
  PulseBadge,
} from "./badge"
export type { BadgeProps, AIBadgeProps, StatusBadgeProps, PulseBadgeProps } from "./badge"

// Input
export {
  Input,
  Textarea,
  inputVariants,
  textareaVariants,
} from "./input"
export type { InputProps, TextareaProps } from "./input"

// Progress
export {
  Progress,
  CircularProgress,
  Skeleton,
  Spinner,
  DotsSpinner,
  progressVariants,
  indicatorVariants,
} from "./progress"
export type { ProgressProps, CircularProgressProps, SkeletonProps, SpinnerProps, DotsSpinnerProps } from "./progress"

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmptyState,
  TablePagination,
} from "./table"
export type { TableProps, TableCellProps, TableEmptyStateProps, TablePaginationProps } from "./table"

// Toast
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
  ToastViewport,
  Toaster,
  toast,
  useToast,
} from "./toast"
export type { ToastProps, ToasterToast } from "./toast"

// Other components (existing)
export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogTitle, DialogDescription, DialogContent, DialogHeader, DialogFooter } from "./dialog"
export { Label } from "./label"
export { Toaster as Sonner } from "./sonner"
