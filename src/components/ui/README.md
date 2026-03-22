# DoneWithAI UI Component Library

A cohesive design system with distinctive character for the DoneWithAI application.

## Design Philosophy

- **Unique Character**: Custom design system with electric violet primary and AI-glowing cyan accents
- **Perceptual Colors**: Uses OKLCH color space for perceptual uniformity
- **Smooth Interactions**: Thoughtful animations and micro-interactions throughout
- **Accessibility**: WCAG AA compliant color contrasts with proper focus states

## Color Palette

### Primary - Electric Violet
The primary brand color, conveying technology and innovation.

```
--color-primary-500: oklch(0.58 0.20 285)  // Main primary
```

### Accent - Coral Orange
Distinctive accent for CTAs and highlights.

```
--color-accent-500: oklch(0.65 0.22 45)  // Main accent
```

### AI Badge - Glowing Cyan
Special color for AI-related badges and indicators.

```
--color-ai-500: oklch(0.60 0.24 195)  // Main AI color
```

### Semantic Colors
- **Success**: Emerald green (`--color-success-500`)
- **Warning**: Amber (`--color-warning-500`)
- **Error**: Rose (`--color-error-500`)

## Components

### Button

Enhanced button with ripple effects, glow variants, and gradient options.

```tsx
import { Button } from "@/components/ui"

// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="glow">Glow</Button>
<Button variant="glow-ai">AI Glow</Button>
<Button variant="gradient">Gradient</Button>

// Sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// With ripple effect
<Button ripple>Ripple Effect</Button>
```

### Card

Enhanced card with glass morphism, elevation levels, and interactive states.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui"

// Variants
<Card variant="default">Default Card</Card>
<Card variant="bordered">Bordered Card</Card>
<Card variant="elevated">Elevated Card</Card>
<Card variant="glass">Glass Card</Card>
<Card variant="glow">Glow Card</Card>

// Interactive
<Card interactive onClick={() => {}}>
  Clickable card
</Card>

// With decorative element
<Card>
  <CardDecoration position="top-right" />
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>Card content</CardContent>
  <CardFooter>Card footer</CardFooter>
</Card>
```

### Badge

Enhanced badge with glow effects and specialized AI variants.

```tsx
import { Badge, AIBadge, StatusBadge, PulseBadge } from "@/components/ui"

// Basic variants
<Badge variant="default">Default</Badge>
<Badge variant="ai">AI Badge</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>

// With dot indicator
<Badge dot>With Dot</Badge>
<Badge dot dotColor="bg-success">Custom Dot</Badge>

// AI Badge (specialized)
<AIBadge confidence={0.85} showConfidence>
  AI Generated
</AIBadge>

// Status Badge
<StatusBadge status="syncing">Syncing...</StatusBadge>
<StatusBadge status="success">Success</StatusBadge>
<StatusBadge status="error">Error</StatusBadge>

// Pulse Badge
<PulseBadge pulseColor="ai">Pulsing</PulseBadge>
```

### Input

Enhanced input with floating labels, character count, and validation states.

```tsx
import { Input, Textarea } from "@/components/ui"

// Basic input
<Input placeholder="Enter text..." />

// With floating label
<Input label="Email" type="email" />

// With validation
<Input label="Password" state="error" error="Password is required" />

// With character count
<Input
  label="Bio"
  showCharacterCount
  maxLength={200}
/>

// With hint
<Input
  label="Username"
  hint="Must be at least 3 characters"
/>

// Textarea with auto-resize
<Textarea
  label="Description"
  autoResize
  placeholder="Enter description..."
/>
```

### Progress

Enhanced progress with circular variants, skeletons, and creative spinners.

```tsx
import { Progress, CircularProgress, Skeleton, Spinner, DotsSpinner } from "@/components/ui"

// Linear progress
<Progress value={60} />

// With label
<Progress value={60} showLabel labelPosition="top" />

// Different colors
<Progress value={60} color="ai" />
<Progress value={60} color="gradient" striped animated />

// Circular progress
<CircularProgress value={60} size={60} />

// Skeleton loading
<Skeleton variant="rect" width="100%" height="100px" />
<Skeleton variant="circle" size={40} />
<Skeleton variant="text" count={3} />

// Spinners
<Spinner size="md" color="ai" />
<DotsSpinner size="md" color="oklch(0.60 0.24 195)" />
```

### Table

Full-featured table with sorting, pagination, and empty states.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableEmptyState,
  TablePagination
} from "@/components/ui"

// Basic table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>

// Sortable table
<Table sortable onSortChange={(column, direction) => console.log(column, direction)}>
  <TableHeader>
    <TableRow>
      <TableHead sortKey="name">Name</TableHead>
      <TableHead sortKey="status">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Rows */}
  </TableBody>
</Table>

// With pagination
<TablePagination
  currentPage={1}
  totalPages={10}
  totalItems={100}
  itemsPerPage={10}
  onPageChange={(page) => setCurrentPage(page)}
/>

// Empty state
<TableEmptyState
  icon={<Icon />}
  title="No data found"
  description="Try adjusting your filters"
/>
```

### Toast

Toast notifications with multiple variants and a hook-based API.

```tsx
import { toast, useToast, Toaster } from "@/components/ui"

// In your app root
<Toaster />

// Using the hook
function Component() {
  const { toast } = useToast()

  return (
    <Button onClick={() => toast({
      title: "Success!",
      description: "Your changes have been saved."
    })}>
      Show Toast
    </Button>
  )
}

// Or use the direct function
toast({
  title: "Error",
  description: "Something went wrong.",
  variant: "destructive"
})

toast({
  title: "AI Analysis Complete",
  description: "Your content has been analyzed.",
  variant: "ai"
})
```

## Spacing Scale

Based on an 8px grid system:

| Token | Value | CSS |
|-------|-------|-----|
| `spacing-0` | 0 | `0` |
| `spacing-1` | 4px | `0.25rem` |
| `spacing-2` | 8px | `0.5rem` |
| `spacing-3` | 12px | `0.75rem` |
| `spacing-4` | 16px | `1rem` |
| `spacing-5` | 20px | `1.25rem` |
| `spacing-6` | 24px | `1.5rem` |
| `spacing-8` | 32px | `2rem` |
| `spacing-10` | 40px | `2.5rem` |
| `spacing-12` | 48px | `3rem` |
| `spacing-16` | 64px | `4rem` |

## Border Radius

| Token | Value |
|-------|-------|
| `radius-sm` | 4px |
| `radius-md` | 6px |
| `radius-lg` | 8px |
| `radius-xl` | 12px |
| `radius-2xl` | 16px |
| `radius-3xl` | 24px |
| `radius-full` | 9999px |

## Shadows

| Token | Value |
|-------|-------|
| `shadow-xs` | Subtle elevation |
| `shadow-sm` | Small elevation |
| `shadow-md` | Medium elevation |
| `shadow-lg` | Large elevation |
| `shadow-xl` | Extra large elevation |
| `shadow-glow-*` | Colored glow effects |

## Animation Durations

| Token | Value |
|-------|-------|
| `duration-instant` | 100ms |
| `duration-fast` | 150ms |
| `duration-normal` | 200ms |
| `duration-slow` | 300ms |
| `duration-slower` | 500ms |

## Best Practices

1. **Consistency**: Use the design tokens instead of hardcoding values
2. **Accessibility**: Always provide proper labels and ARIA attributes
3. **Performance**: Use `WillChange` sparingly and prefer CSS transforms
4. **Responsive**: Test components on different screen sizes
5. **Dark Mode**: All components support dark mode automatically

## Contributing

When adding new components:
1. Follow the existing component structure
2. Use `class-variance-authority` for variants
3. Add proper TypeScript types
4. Include examples in this README
5. Update the index.ts exports
