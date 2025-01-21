# News Now UI/UX Implementation Plan

## Phase 0: Setup & Architecture
- [ ] State management setup
  - [ ] Create ReportsContext for global state
  - [ ] Build custom hooks (useReports, useCurrentReport)
  - [ ] Define TypeScript interfaces for all states

- [ ] Testing infrastructure
  - [ ] Set up Jest + React Testing Library
  - [ ] Create test utilities and helpers
  - [ ] Define test patterns for components

## Phase 1: Core Layout & Components
- [ ] Split-view layout component
  - [ ] Fixed left sidebar (w-[30%])
  - [ ] Main content area (w-[70%])
  - [ ] Responsive breakpoint (md:flex-col below 768px)
  - [ ] Tests for layout behavior

- [ ] Sidebar components (in order)
  - [ ] Channel selector with icon + tests
  - [ ] Compact time selector (pills) + tests
  - [ ] Generate button with loading states + tests
  - [ ] Recent reports list (max-h with overflow) + tests

- [ ] Report view components
  - [ ] Sticky metadata header + tests
  - [ ] Content area with proper spacing + tests
  - [ ] Action buttons (copy, edit, delete) + tests

## Phase 2: State & Functionality
- [ ] Reports management
  - [ ] ReportsContext implementation
  - [ ] CRUD operations + tests
  - [ ] Optimistic updates
  - [ ] Error handling

- [ ] Report preview component
  - [ ] Channel info + timestamp
  - [ ] Preview of headline/content
  - [ ] Quick action buttons
  - [ ] Hover/focus states
  - [ ] Integration tests

- [ ] Reports list functionality
  - [ ] Load last 5 reports
  - [ ] Sort by timestamp
  - [ ] Quick actions integration
  - [ ] List management tests

## Phase 3: Polish & Optimization
- [ ] Loading states
  - [ ] Skeleton loader for report view
  - [ ] Progress indicator for generation
  - [ ] Loading states for actions
  - [ ] Tests for loading behaviors

- [ ] Mobile optimization
  - [ ] Collapsible sidebar
  - [ ] Touch-friendly controls
  - [ ] Bottom sheet for reports list
  - [ ] Mobile interaction tests

## Component Structure
```
src/
  components/
    layout/
      SplitView.tsx
      Sidebar.tsx
      __tests__/
    reports/
      ReportView.tsx
      ReportCard.tsx
      ReportsList.tsx
      __tests__/
    controls/
      ChannelSelect.tsx
      TimeSelect.tsx
      GenerateButton.tsx
      __tests__/
  context/
    ReportsContext.tsx
    __tests__/
  hooks/
    useReports.ts
    useCurrentReport.ts
    __tests__/
  types/
    index.ts
  utils/
    testUtils.ts
```

## State Management Structure
```typescript
// Context structure
interface ReportsState {
  reports: Report[];
  currentReport: Report | null;
  loading: boolean;
  error: Error | null;
}

interface ReportsActions {
  addReport: (report: Report) => void;
  updateReport: (id: string, report: Report) => void;
  deleteReport: (id: string) => void;
  setCurrentReport: (report: Report | null) => void;
}

// Custom hooks
const useReports = () => {
  // CRUD operations + loading/error states
}

const useCurrentReport = () => {
  // Current report management + actions
}
```

## Testing Strategy
- Unit tests for all components
- Integration tests for state management
- E2E tests for critical flows:
  1. Report generation
  2. Report management (CRUD)
  3. Mobile interactions

## Tech Stack
- Next.js 15
- Tailwind CSS
- React Feather
- Geist font
- Jest + React Testing Library
- TypeScript

## Success Metrics
- Reduced time to generate reports
- Improved report readability
- Better navigation between reports
- Smoother mobile experience
- Reduced user confusion/errors 