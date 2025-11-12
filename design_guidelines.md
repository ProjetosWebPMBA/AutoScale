# Design Guidelines: React Schedule Generator Application

## Design Approach
**Selected System**: Material Design / Chakra UI principles
**Rationale**: Productivity-focused data management tool requiring clear information hierarchy, robust form handling, and table-based data visualization. Material Design's structured approach suits data-dense enterprise applications.

**Key Principles**:
- Information clarity over visual flair
- Efficient workflow prioritization
- Consistent interaction patterns
- Scannable data presentation

---

## Typography System

**Font Family**: 
- Primary: 'Inter' (already established in original)
- Fallback: system-ui, sans-serif

**Hierarchy**:
- Page Title: text-3xl font-bold (30px)
- Section Headers: text-xl font-semibold (20px)
- Subsection Headers: text-lg font-medium (18px)
- Body Text: text-sm (14px) and text-base (16px)
- Labels: text-sm font-medium (14px)
- Helper Text: text-xs (12px)
- Table Headers: text-xs font-semibold uppercase tracking-wide
- Table Data: text-sm

---

## Layout & Spacing System

**Core Spacing Units**: Use Tailwind spacing of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6
- Section gaps: gap-8
- Form field spacing: mb-4
- Grid gaps: gap-6
- Card padding: p-6
- Button padding: py-2 px-4

**Container Strategy**:
- Main container: max-w-full with mx-auto px-4
- Card containers: w-full with natural width constraints
- Single-column stacked layout (not sidebar layout per original update)

**Grid System**:
- Configuration panel: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Action buttons section: grid-cols-1 md:grid-cols-2
- Responsive breakpoints: mobile-first, stack to single column on small screens

---

## Component Library

### Cards & Panels
- Rounded corners: rounded-lg
- Elevation: shadow-lg
- Border: none (rely on shadow for depth)
- Background: white cards on gray-100 page background

### Forms
**Input Fields**:
- Border: border border-gray-300
- Rounded: rounded-md
- Padding: p-2
- Focus states: focus:ring-blue-500 focus:border-blue-500
- Shadow: shadow-sm

**Textareas**:
- Consistent styling with inputs
- Configurable rows attribute
- Monospace font for numerical lists

**Select Dropdowns**:
- Match input field styling
- Clear visual hierarchy

### Buttons
**Primary Actions** (Generate, Save):
- Solid fill backgrounds
- Full-width on mobile: w-full
- Consistent height: py-2 px-4
- Rounded: rounded-md
- Focus rings: focus:ring-2 focus:ring-offset-2

**Secondary Actions** (Export, Import):
- Border-based styling: border border-gray-400
- White background with hover states

**Destructive Actions** (Clear):
- Distinct visual treatment to prevent accidental clicks

### Tables
**Structure**:
- Full-width: w-full
- Collapsed borders: border-collapse
- Cell borders: border border-gray-300
- Compact padding: px-3 py-2 for cells

**Headers**:
- Sticky positioning for long scrolls
- Background differentiation from body
- Bold, uppercase, small text

**Special Rows**:
- Weekend highlighting: subtle background differentiation
- Ignored days: distinct but not alarming background
- Clean separation between weeks

### Data Display
**Analytics Panel**:
- Card-based layout
- Clear metric visualization
- Grid layout for statistics: grid-cols-2 md:grid-cols-4
- Large numbers with labels underneath

### File Upload
- Hidden file input with styled label trigger
- Clear visual indication of upload button
- Feedback messaging nearby

---

## Interaction Patterns

**Feedback System**:
- Success messages: text-green-600 positioned near action buttons
- Clear, temporary confirmation messages
- No toast notifications (keep it simple)

**State Management**:
- Disabled states for buttons when generating
- Loading indicators for async operations
- Clear visual hierarchy for active/inactive states

**Responsive Behavior**:
- Mobile: Single column stacked layout
- Tablet: 2-column grids where appropriate
- Desktop: 3-column configuration grid

---

## Specific Sections

### Configuration Panel
- Grid-based layout with 3 logical columns on desktop
- Column 1: Student list (tall textarea)
- Column 2: Service posts and slots (paired textareas)
- Column 3: Metadata and actions (inputs + buttons)
- Bottom section: 2-column grid for history and generation controls

### Schedule Output
- Full-width table container
- Horizontal scroll on mobile
- Print-optimized styling (landscape, compact)
- Sticky headers for long tables

### Analytics Panel
- Initially hidden/collapsed
- Expands after schedule generation
- Grid layout for metrics
- Visual charts if implementing advanced features

---

## PDF Export Considerations
- Landscape orientation
- Compact font sizing (8px in print)
- Maintained borders and structure
- Special print classes for backgrounds
- Page break management for long schedules

---

## No Images Required
This is a data-focused utility application - no hero images, decorative graphics, or illustrations needed. Focus remains on functional clarity and efficient data manipulation.