"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ============================================
// Context for table sorting
// ============================================

interface TableContextValue {
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null
  toggleSort: (column: string) => void
}

const TableContext = React.createContext<TableContextValue | undefined>(undefined)

const useTableContext = () => {
  const context = React.useContext(TableContext)
  if (!context) {
    throw new Error("Table compound components must be used within <Table />")
  }
  return context
}

// ============================================
// Table Variants
// ============================================

const tableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      variant: {
        default: "",
        bordered: "border",
        striped: "",
        compact: "",
      },
      size: {
        default: "",
        sm: "text-xs",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const headerCellVariants = cva(
  "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 transition-colors",
  {
    variants: {
      sortable: {
        true: "cursor-pointer hover:text-foreground hover:bg-muted/50 select-none",
        false: "",
      },
    },
    defaultVariants: {
      sortable: false,
    },
  }
)

const rowVariants = cva("border-b transition-colors", {
  variants: {
    variant: {
      default: "hover:bg-muted/50",
      bordered: "border-b",
      striped: "even:bg-muted/30 hover:bg-muted/50",
      compact: "hover:bg-muted/50",
    },
    selected: {
      true: "bg-muted/80 hover:bg-muted",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    selected: false,
  },
})

const cellVariants = cva("p-4 align-middle [&:has([role=checkbox])]:pr-0", {
  variants: {
    size: {
      default: "p-4",
      sm: "p-2",
      lg: "p-5",
      compact: "p-2",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

// ============================================
// Types
// ============================================

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: VariantProps<typeof tableVariants>["variant"]
  size?: VariantProps<typeof tableVariants>["size"]
  sortable?: boolean
  defaultSortColumn?: string
  defaultSortDirection?: "asc" | "desc"
  onSortChange?: (column: string | null, direction: "asc" | "desc" | null) => void
}

export interface TableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  size?: VariantProps<typeof cellVariants>["size"]
}

// ============================================
// Table Root Component
// ============================================

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      variant,
      size,
      sortable = false,
      defaultSortColumn,
      defaultSortDirection = "asc",
      onSortChange,
      children,
      ...props
    },
    ref
  ) => {
    const [sortColumn, setSortColumn] = React.useState<string | null>(defaultSortColumn || null)
    const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(
      defaultSortColumn ? defaultSortDirection : null
    )

    const toggleSort = React.useCallback(
      (column: string) => {
        if (!sortable) return

        let newDirection: "asc" | "desc" | null = "asc"
        if (sortColumn === column) {
          if (sortDirection === "asc") {
            newDirection = "desc"
          } else if (sortDirection === "desc") {
            newDirection = null
            setSortColumn(null)
          }
        }

        if (newDirection !== null) {
          setSortColumn(column)
          setSortDirection(newDirection)
        } else {
          setSortColumn(null)
          setSortDirection(null)
        }

        onSortChange?.(newDirection === null ? null : column, newDirection)
      },
      [sortable, sortColumn, sortDirection, onSortChange]
    )

    const contextValue = React.useMemo(
      () => ({ sortColumn, sortDirection, toggleSort }),
      [sortColumn, sortDirection, toggleSort]
    )

    return (
      <div className="relative w-full overflow-auto">
        <TableContext.Provider value={contextValue}>
          <table
            ref={ref}
            className={cn(tableVariants({ variant, size }), className)}
            {...props}
          >
            {children}
          </table>
        </TableContext.Provider>
      </div>
    )
  }
)
Table.displayName = "Table"

// ============================================
// Table Header Component
// ============================================

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

// ============================================
// Table Body Component
// ============================================

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

// ============================================
// Table Footer Component
// ============================================

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

// ============================================
// Table Row Component
// ============================================

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    selected?: boolean
  }
>(({ className, selected, ...props }, ref) => {
  // Get variant from parent Table - we need to access this somehow
  // For now, we'll use a simpler approach
  return (
    <tr
      ref={ref}
      className={cn(
        rowVariants({ variant: "default", selected }),
        className
      )}
      data-selected={selected}
      {...props}
    />
  )
})
TableRow.displayName = "TableRow"

// ============================================
// Table Head Component
// ============================================

const TableHead = React.forwardRef<HTMLTableCellElement, TableCellProps & { sortKey?: string }>(
  ({ className, children, sortKey, size, ...props }, ref) => {
    const { sortColumn, sortDirection, toggleSort } = useTableContext()
    const isSortable = !!sortKey
    const isActive = sortColumn === sortKey

    return (
      <th
        ref={ref}
        className={cn(
          headerCellVariants({ sortable: isSortable }),
          size === "sm" && "h-8 px-2",
          size === "lg" && "h-12 px-5",
          isActive && "text-foreground bg-muted/30",
          className
        )}
        onClick={() => isSortable && toggleSort(sortKey!)}
        {...props}
      >
        <div className="flex items-center gap-1">
          {children}
          {isSortable && (
            <span className="inline-flex flex-col">
              <svg
                className={cn(
                  "size-3 transition-transform",
                  sortDirection === "asc" && isActive
                    ? "-rotate-180 text-foreground"
                    : "text-muted-foreground opacity-50"
                )}
                fill="currentColor"
                viewBox="0 0 8 8"
              >
                <path d="M3.5 4.5L1 2h5l-2.5 2.5z" />
              </svg>
              <svg
                className={cn(
                  "size-3 -mt-1.5 transition-transform",
                  sortDirection === "desc" && isActive
                    ? "rotate-180 text-foreground"
                    : "text-muted-foreground opacity-50"
                )}
                fill="currentColor"
                viewBox="0 0 8 8"
              >
                <path d="M3.5 4.5L1 2h5l-2.5 2.5z" />
              </svg>
            </span>
          )}
        </div>
      </th>
    )
  }
)
TableHead.displayName = "TableHead"

// ============================================
// Table Cell Component
// ============================================

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, size = "default", ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        cellVariants({ size }),
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

// ============================================
// Table Caption Component
// ============================================

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// ============================================
// Table Empty State Component
// ============================================

export interface TableEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

const TableEmptyState = React.forwardRef<HTMLDivElement, TableEmptyStateProps>(
  ({ className, icon, title = "No results found", description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 px-4 text-center",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="size-12 text-muted-foreground/50 mb-4 flex items-center justify-center">
            {icon}
          </div>
        )}
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
        )}
        {action}
      </div>
    )
  }
)
TableEmptyState.displayName = "TableEmptyState"

// ============================================
// Table Pagination Component
// ============================================

export interface TablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showInfo?: boolean
}

const TablePagination = React.forwardRef<HTMLDivElement, TablePaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      onPageChange,
      showFirstLast = true,
      showInfo = true,
      ...props
    },
    ref
  ) => {
    const pages = React.useMemo(() => {
      const range: (number | string)[] = []
      const showEllipsis = totalPages > 7

      if (!showEllipsis) {
        for (let i = 1; i <= totalPages; i++) {
          range.push(i)
        }
      } else {
        range.push(1)

        if (currentPage > 3) {
          range.push("...")
        }

        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)

        for (let i = start; i <= end; i++) {
          range.push(i)
        }

        if (currentPage < totalPages - 2) {
          range.push("...")
        }

        range.push(totalPages)
      }

      return range
    }, [currentPage, totalPages])

    const startItem = totalItems ? (currentPage - 1) * itemsPerPage! + 1 : null
    const endItem = totalItems ? Math.min(currentPage * itemsPerPage!, totalItems) : null

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between px-2 py-4",
          className
        )}
        {...props}
      >
        {showInfo && totalItems && itemsPerPage && (
          <div className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {totalItems} results
          </div>
        )}

        <div className="flex items-center gap-1">
          {showFirstLast && (
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="min-w-[2rem] h-8 px-2 rounded-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}

          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="min-w-[2rem] h-8 px-2 rounded-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {pages.map((page, i) => (
            <button
              key={i}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page !== "number"}
              className={cn(
                "min-w-[2rem] h-8 px-2 rounded-md flex items-center justify-center text-sm transition-colors",
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="min-w-[2rem] h-8 px-2 rounded-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {showFirstLast && (
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="min-w-[2rem] h-8 px-2 rounded-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
)
TablePagination.displayName = "TablePagination"

// ============================================
// Exports
// ============================================

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
}
