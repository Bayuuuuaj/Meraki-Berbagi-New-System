# GitHub Project Documentation

## About / Description (For GitHub Sidebar)

**English:**
Premium organization management system with AI-powered financial insights. Features automated receipt extraction, anomaly detection, and 100% transparent audit trails. Built with React, TypeScript, Node.js, and PostgreSQL. Achieved 99.7% payload reduction through intelligent image optimization.

**Bahasa Indonesia:**
Sistem manajemen organisasi premium dengan wawasan keuangan berbasis AI. Dilengkapi ekstraksi nota otomatis, deteksi anomali, dan audit trail transparan 100%. Dibangun dengan React, TypeScript, Node.js, dan PostgreSQL. Mencapai pengurangan payload 99.7% melalui optimasi gambar cerdas.

---

## Professional Commit Messages (Conventional Commits)

### Development Journey Examples

```bash
# 1. Initial Setup
feat: initialize full-stack project with React, TypeScript, and Express
- Set up Vite build configuration
- Configure TypeScript strict mode
- Implement Express server with CORS and Helmet
- Add Drizzle ORM with PostgreSQL connection

# 2. Database Architecture
feat: implement database schema with audit logging
- Create Users, Treasury, and AI_Audit_Logs tables
- Add foreign key relationships and indexes
- Implement Drizzle migrations
- Set up connection pooling with Supabase

# 3. Authentication System
feat: add secure authentication with Passport.js
- Implement session-based auth with bcrypt
- Add role-based access control (admin, member, guest)
- Configure secure cookie settings
- Add rate limiting middleware (100 req/15min)

# 4. AI Integration
feat: integrate Google Gemini AI for receipt extraction
- Implement OCR-based transaction data extraction
- Add automatic category classification
- Create confidence scoring system
- Handle multi-currency and date formats

# 5. Performance Optimization
perf: optimize images reducing payload by 99.7%
- Implement Sharp-based image compression
- Convert PNG to WebP format (85% quality)
- Add responsive sizing (max 1200px width)
- Reduce total payload from 91MB to <300KB

# 6. Security Enhancement
feat: implement comprehensive audit trail system
- Add immutable logging for all CRUD operations
- Track user actions with IP addresses and timestamps
- Store old/new values in JSONB format
- Create audit log query endpoints

# 7. Analytics & ML
feat: add anomaly detection with Z-Score and IQR algorithms
- Implement statistical outlier detection
- Create risk scoring system for transactions
- Add financial health monitoring
- Generate AI-powered insights and recommendations

# 8. State Management
feat: implement React Query for optimistic UI updates
- Add server state caching and synchronization
- Implement automatic background refetching
- Configure stale-while-revalidate strategy
- Remove manual refresh requirements

# 9. PWA Implementation
feat: convert application to Progressive Web App
- Add service worker with Workbox
- Implement offline caching strategy
- Create app manifest for installability
- Add native-like navigation and gestures

# 10. Production Readiness
chore: prepare production build and deployment
- Configure environment-based builds
- Add compression middleware (gzip/brotli)
- Implement structured logging with Winston
- Set up error tracking and monitoring
```

---

## Additional Commit Message Examples by Category

### Features (feat:)
```bash
feat: add real-time treasury balance tracking
feat: implement member participation analytics
feat: create interactive spending trend charts with Recharts
feat: add export functionality for financial reports
feat: implement dark mode with theme persistence
```

### Bug Fixes (fix:)
```bash
fix: resolve CORS issues with ngrok tunneling
fix: correct transaction amount validation logic
fix: prevent duplicate audit log entries
fix: handle null values in AI receipt extraction
fix: resolve session timeout on inactive users
```

### Performance (perf:)
```bash
perf: lazy load route components with React.lazy
perf: implement virtual scrolling for large transaction lists
perf: optimize database queries with proper indexing
perf: reduce bundle size by code splitting
perf: cache static assets with service worker
```

### Documentation (docs:)
```bash
docs: add comprehensive README with installation guide
docs: document API endpoints with request/response examples
docs: add JSDoc comments to image optimization script
docs: create database schema documentation
docs: add contributing guidelines and code of conduct
```

### Maintenance (chore:)
```bash
chore: update dependencies to latest stable versions
chore: configure ESLint and Prettier for code consistency
chore: add pre-commit hooks with Husky
chore: organize project structure and file naming
chore: clean up unused dependencies and imports
```

### Refactoring (refactor:)
```bash
refactor: extract AI logic into separate service modules
refactor: convert class components to functional with hooks
refactor: simplify authentication middleware logic
refactor: consolidate duplicate utility functions
refactor: improve type safety with stricter TypeScript config
```

### Testing (test:)
```bash
test: add unit tests for AI receipt extraction
test: implement integration tests for treasury endpoints
test: add E2E tests for authentication flow
test: create test fixtures for database seeding
test: add performance benchmarks for image optimization
```

### Build System (build:)
```bash
build: configure Vite for production optimization
build: add esbuild for faster TypeScript compilation
build: implement tree shaking for smaller bundles
build: configure PWA plugin for service worker generation
build: add source maps for production debugging
```

### CI/CD (ci:)
```bash
ci: add GitHub Actions workflow for automated testing
ci: configure deployment pipeline to production
ci: add automated dependency updates with Dependabot
ci: implement code quality checks in PR workflow
ci: add automated security scanning
```

### Style (style:)
```bash
style: format code with Prettier
style: fix linting errors across codebase
style: improve component naming consistency
style: organize imports alphabetically
style: add consistent spacing and indentation
```

---

## Commit Message Best Practices

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **perf**: Performance improvement
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **build**: Build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: Maintenance tasks

### Rules
1. Use imperative mood ("add" not "added")
2. Don't capitalize first letter
3. No period at the end
4. Keep subject line under 50 characters
5. Separate subject from body with blank line
6. Wrap body at 72 characters
7. Use body to explain what and why, not how

---

## GitHub Repository Settings Recommendations

### Topics/Tags
```
react, typescript, nodejs, postgresql, ai, machine-learning, 
pwa, drizzle-orm, express, tailwind-css, financial-management,
organization-management, audit-trail, gemini-ai, full-stack
```

Description: Premium organization management system with AI-powered financial insights. Features automated receipt extraction, anomaly detection, and 100% transparent audit trails. Built with React, TypeScript, Node.js, and PostgreSQL. Achieved 99.7% payload reduction through intelligent image optimization.

Website: https://github.com/Bayuuuuaj/meraki-berbagi

### Social Preview Image
Create a 1280x640px image featuring:
- Project logo
- Key metrics (99.7% optimization, 100% transparency)
- Tech stack icons
- Professional gradient background
