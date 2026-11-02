# Design System & UI/UX Component Specifications
**System**: San Roque Community Health Center — Patient Management System  
**Design Philosophy**: Flat Swiss / Civic Institutional Design (Clean Data Density, High Contrast, Accessible Healthcare Ergonomics)  
**Compliance Standard**: Web Content Accessibility Guidelines (WCAG 2.1 AA), RA 10173, BP 344, RA 9994  
**Document Revision**: 1.0.0  
**Effective Date**: November 2, 2026  

---

## 1. Visual Identity & Design Token Architecture

### 1.1 Aesthetic Foundation
The user interface adheres to a flat Swiss institutional design language. It communicates civic authority, stability, and medical clarity through structured grids, crisp borders, legible typographic hierarchy, and monospaced tabular numerals.

To eliminate the dual-palette fragmentation identified in the Phase 1 audit (where the shell used warm Stone/Indigo and feature modules used cool Slate/Teal):
- **Neutrals**: Unified entirely on the **Stone** palette (`stone-50` through `stone-900`).
- **Surfaces**: Crisp white cards with 1px `stone-300` borders and subtle `stone-100` canvas backdrops.
- **Brand Accent**: Unified entirely on **Medical Indigo** (`indigo-700` primary, `indigo-800` hover, `indigo-50` subtle fills).
- **Geometry**: Cohesive flat radius hierarchy: `rounded-none` for civic brand crests, `rounded-md` (6px) for cards and modals, `rounded` (4px) for interactive controls.

---

### 1.2 Design Tokens (Tailwind CSS v4 & CSS Variables)

```css
@import "tailwindcss";

@layer base {
  :root {
    /* -----------------------------------------------------------------------
       1. Typography Families
       ----------------------------------------------------------------------- */
    --font-display: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-sans: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;

    /* -----------------------------------------------------------------------
       2. Neutral Surfaces & Backgrounds (Stone Scale)
       ----------------------------------------------------------------------- */
    --color-bg-canvas: #f5f5f4;       /* stone-100: Application viewport canvas */
    --color-bg-surface: #ffffff;      /* white: Content cards and panels */
    --color-bg-subtle: #fafaf9;       /* stone-50: Table headers & striped rows */
    --color-bg-muted: #e7e5e4;        /* stone-200: Inactive tabs & borders */
    --color-bg-inverse: #1c1917;      /* stone-900: Dark headers & tooltips */

    /* -----------------------------------------------------------------------
       3. Typography Colors (WCAG 2.1 AAA Compliant)
       ----------------------------------------------------------------------- */
    --color-text-primary: #1c1917;    /* stone-900: 16.1:1 contrast on white */
    --color-text-secondary: #57534e;  /* stone-600: 7.0:1 contrast on white */
    --color-text-muted: #78716c;      /* stone-500: 4.55:1 contrast on white */
    --color-text-inverse: #fafaf9;    /* stone-50 on dark stone-900 */

    /* -----------------------------------------------------------------------
       4. Border Tokens
       ----------------------------------------------------------------------- */
    --color-border-subtle: #e7e5e4;   /* stone-200: Internal dividers */
    --color-border-default: #d6d3d1;  /* stone-300: Standard card borders */
    --color-border-strong: #1c1917;   /* stone-900: Institutional keylines */

    /* -----------------------------------------------------------------------
       5. Brand Identity: Medical Indigo
       ----------------------------------------------------------------------- */
    --color-primary-50: #eef2ff;      /* Subtle active badge backgrounds */
    --color-primary-100: #e0e7ff;
    --color-primary-600: #4f46e5;
    --color-primary-700: #4338ca;     /* Primary button fill & key accents */
    --color-primary-800: #3730a3;     /* Primary button hover state */
    --color-primary-900: #312e81;

    /* -----------------------------------------------------------------------
       6. Healthcare Semantic Tokens
       ----------------------------------------------------------------------- */
    --color-success-bg: #f0fdf4;      /* emerald-50 */
    --color-success-border: #a7f3d0;  /* emerald-200 */
    --color-success-text: #065f46;    /* emerald-800 (7.4:1 contrast) */

    --color-warning-bg: #fffbeb;      /* amber-50 */
    --color-warning-border: #fde68a;  /* amber-200 */
    --color-warning-text: #92400e;    /* amber-800 (6.1:1 contrast) */

    --color-danger-bg: #fef2f2;       /* red-50 */
    --color-danger-border: #fecaca;   /* red-200 */
    --color-danger-text: #991b1b;     /* red-800 (7.2:1 contrast) */

    --color-emergency-bg: #b91c1c;    /* red-700 */
    --color-emergency-text: #ffffff;  /* white on red (5.7:1 contrast) */

    --color-info-bg: #eff6ff;         /* blue-50 */
    --color-info-border: #bfdbfe;     /* blue-200 */
    --color-info-text: #1e40af;       /* blue-800 */

    /* -----------------------------------------------------------------------
       7. Geometry & Radius Scale
       ----------------------------------------------------------------------- */
    --radius-none: 0px;               /* Brand identity crest, sharp badges */
    --radius-sm: 4px;                 /* Buttons, inputs, chips */
    --radius-md: 6px;                 /* Cards, table containers, dialogs */
    --radius-lg: 8px;                 /* Modals, drawers */
    --radius-full: 9999px;            /* Circular indicators */

    /* -----------------------------------------------------------------------
       8. Focus & Accessibility
       ----------------------------------------------------------------------- */
    --focus-ring: 2px solid #4338ca;
    --focus-ring-offset: 2px;
  }
}
```

---

## 2. Typography Scale & Ergonomics

To prevent mobile browser viewport auto-zooming (which occurs in iOS Safari and mobile Chrome when form inputs are styled smaller than 16px), the font scale enforces strict minimum sizes:

| Token / Class | Size (px / rem) | Line Height | Font Family | Recommended Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-2xl` | 24px / 1.50rem | 32px / 2.00rem | `font-display` (700) | Main page titles, top dashboard banner headings |
| `text-xl` | 20px / 1.25rem | 28px / 1.75rem | `font-display` (700) | Module headers, modal dialog titles |
| `text-lg` | 18px / 1.125rem | 26px / 1.625rem | `font-display` (600) | Card headers, stat metric figures |
| `text-base` | 16px / 1.00rem | 24px / 1.50rem | `font-sans` (400/500) | **Form input fields (prevents mobile zoom)**, major body copy |
| `text-sm` | 14px / 0.875rem | 20px / 1.25rem | `font-sans` (400/500) | Table cells, secondary body text, button labels |
| `text-xs` | 12px / 0.75rem | 16px / 1.00rem | `font-sans` (600) | Meta captions, status badge tags, breadcrumbs |
| `.font-mono-tabular` | 14px / 0.875rem | 20px / 1.25rem | `font-mono` (500) | Blood pressure, BMI, queue numbers, ICD-10 codes |

---

## 3. Reusable UI Primitive Specifications

The following 8 reusable components must be implemented in `client/src/components/ui/` during Phase 2:

### 3.1 `<Button>` (`client/src/components/ui/Button.tsx`)
- **Variants**:
  - `primary`: `bg-indigo-700 hover:bg-indigo-800 text-white font-medium shadow-xs`
  - `secondary`: `bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-medium`
  - `destructive`: `bg-red-700 hover:bg-red-800 text-white font-medium`
  - `outline`: `bg-transparent hover:bg-stone-100 text-stone-700 border border-stone-300`
  - `ghost`: `bg-transparent hover:bg-stone-100 text-stone-700`
- **Sizes**:
  - `sm`: `h-8 px-3 text-xs` (compact table action buttons)
  - `md`: `h-10 px-4 text-sm md:h-10` (default desktop controls)
  - `lg`: `h-12 px-6 text-base` (mobile primary CTAs, minimum 44px touch target)
- **States**: `isLoading` (disables button, displays animated `Loader2` spinner), `disabled` (`opacity-50 cursor-not-allowed`).

### 3.2 `<Input>` & `<Select>` (`client/src/components/ui/Input.tsx`, `Select.tsx`)
- **Structure**:
  ```tsx
  <div className="space-y-1">
    <label htmlFor={id} className="block text-xs font-semibold text-stone-700">
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <input
      id={id}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className="w-full h-11 px-3 text-base md:text-sm bg-white border border-stone-300 rounded focus:ring-2 focus:ring-indigo-700 focus:outline-none"
    />
    {error && <p id={`${id}-error`} className="text-xs text-red-600 font-medium">{error}</p>}
  </div>
  ```

### 3.3 `<StatusBadge>` (`client/src/components/ui/StatusBadge.tsx`)
Enclosed pill tag representing domain entity status with distinct background, border, and text:
- `Active` / `Approved` / `Confirmed`: `bg-emerald-50 text-emerald-800 border-emerald-200`
- `Pending` / `Waiting`: `bg-amber-50 text-amber-800 border-amber-200`
- `In Consultation`: `bg-indigo-50 text-indigo-800 border-indigo-200`
- `Completed`: `bg-blue-50 text-blue-800 border-blue-200`
- `Cancelled` / `Archived` / `Inactive`: `bg-stone-100 text-stone-700 border-stone-300`
- `Rejected` / `Critical`: `bg-red-50 text-red-800 border-red-200`

### 3.4 `<PriorityChip>` (`client/src/components/ui/PriorityChip.tsx`)
Explicit healthcare queue priority badge incorporating **both color and icon** (never color alone):
- **`Emergency`**: `bg-red-700 text-white border-red-800 font-bold uppercase` + `<AlertTriangle className="w-3.5 h-3.5 mr-1" />`
- **`Pregnant`**: `bg-purple-100 text-purple-900 border-purple-300 font-semibold` + `<HeartPulse className="w-3.5 h-3.5 mr-1" />`
- **`Senior Citizen`**: `bg-amber-100 text-amber-900 border-amber-300 font-semibold` + `<UserCheck className="w-3.5 h-3.5 mr-1" />`
- **`PWD`**: `bg-blue-100 text-blue-900 border-blue-300 font-semibold` + `<Accessibility className="w-3.5 h-3.5 mr-1" />`
- **`Regular`**: `bg-stone-100 text-stone-700 border-stone-300` + `<User className="w-3.5 h-3.5 mr-1" />`

### 3.5 `<Modal>` (`client/src/components/ui/Modal.tsx`)
- Replaces inline expanding forms to eliminate Cumulative Layout Shift (CLS).
- **Accessibility**: Portal-mounted to `document.body`, `role="dialog"`, `aria-modal="true"`, focus trapped within dialog, closes on `Escape` key and backdrop tap.

### 3.6 `<ConfirmDialog>` (`client/src/components/ui/ConfirmDialog.tsx`)
- Destructive operation safety guard for cancelling appointments, skipping queue patients, archiving patient records, and deactivating user accounts.
- Enforces an optional or required justification text input before action execution.

### 3.7 `<DataTable>` (`client/src/components/ui/DataTable.tsx`)
- Standardized tabular view with built-in empty states, loading skeletons, column sorting headers, and responsive card-view folding on mobile screens (`< 768px`).

### 3.8 `<EmptyState>` & `<Skeleton>` (`client/src/components/ui/EmptyState.tsx`, `Skeleton.tsx`)
- `<EmptyState>`: Centered SVG icon, descriptive title, guidance message, and primary CTA button.
- `<Skeleton>`: Animated pulse placeholders (`bg-stone-200 animate-pulse rounded`) matching exact table row and card heights.

---

## 4. Healthcare-Specific Clinical Ergonomics

### 4.1 Statutory Priority Visual Cues (RA 9994 / BP 344)
In busy clinic waiting areas, staff must instantly recognize high-priority patients. The UI ensures priority indicators have high contrast, distinctive glyphs, and prominent positioning on table rows and ticket cards.

### 4.2 Vital Signs & PhilPEN Clinical Thresholds
Vital signs values must be evaluated against clinical risk thresholds:
- **Hypertensive Crisis**: Systolic $\ge 180$ mmHg OR Diastolic $\ge 120$ mmHg $\rightarrow$ Red flashing badge `Critical Alert: Immediate Referral`.
- **Elevated Blood Pressure**: Systolic $\ge 140$ mmHg OR Diastolic $\ge 90$ mmHg $\rightarrow$ Amber badge `Elevated BP (PhilPEN Screening)`.
- **High Pyrexia / Fever**: Body Temperature $\ge 38.5^\circ\text{C}$ $\rightarrow$ Amber warning `High Fever`.
- **Severe Tachycardia**: Heart Rate $> 100$ bpm $\rightarrow$ Amber tag `Tachycardia`.
- **Obesity**: BMI $\ge 30.0$ kg/m² $\rightarrow$ Amber tag `Obese (Class I+)`.

---

## 5. Responsive Layout Breakpoints & Ergonomics

| Breakpoint | Pixel Width | Navigation Mode | Table Layout | Form Grids |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `< 768px` | Slide-over drawer with backdrop overlay; min 44px touch targets | Stacked card view (collapses horizontal scroll) | Single column (`grid-cols-1`) |
| **Tablet** | `768px – 1024px` | Docked compact sidebar; collapsible filters | Horizontal scroll with fixed action columns | Two columns (`grid-cols-2`) |
| **Desktop** | `> 1024px` | Full fixed sidebar (`w-72`); institutional layout | Full table with 7+ columns and inline actions | Multi-column (`grid-cols-3` or `grid-cols-4`) |
