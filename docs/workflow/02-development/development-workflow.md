# 💻 Development Workflow

**Last Updated**: September 8, 2025  
**Environment**: Local & Production Ready

## 🚀 **Development Setup**

### **Prerequisites**
- Node.js 18+
- PostgreSQL 15+
- Git
- Docker (optional)

### **Local Environment Setup**
```bash
# Clone repository
git clone https://github.com/your-username/Film_Flex_Release.git
cd Film_Flex_Release

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your local settings

# Setup database
npm run db:setup

# Start development
npm run dev
```

## 🏗️ **Project Structure**

```
Film_Flex_Release/
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   └── dist/              # Built frontend
├── server/                # Express backend
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   └── utils/
├── shared/                # Shared types & utilities
├── scripts/               # Automation & deployment
│   ├── data/             # Movie import scripts
│   ├── deployment/       # Deployment automation
│   └── maintenance/      # Maintenance scripts
└── docs/                 # Documentation
    └── workflow/         # Workflow-based docs
```

## 🔧 **Development Commands**

### **Frontend Development**
```bash
# Start React dev server
npm run dev:client

# Build frontend
npm run build:client

# Lint frontend code
npm run lint:client

# Test frontend
npm run test:client
```

### **Backend Development**
```bash
# Start Express dev server
npm run dev:server

# Build backend
npm run build:server

# Lint backend code
npm run lint:server

# Test backend
npm run test:server
```

### **Full Stack Development**
```bash
# Start both frontend and backend
npm run dev

# Build entire application
npm run build

# Run all tests
npm run test

# Lint all code
npm run lint
```

## 🗄️ **Database Development**

### **Schema Management**
```bash
# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed test data
npm run db:seed
```

### **Movie Data Development**
```bash
# Import sample movies (for development)
node scripts/data/import-movies-sql.cjs --single-page --page-num=1 --page-size=10

# Test import functionality
node scripts/data/import-movies-sql.cjs --test-mode

# Clear movie data
npm run db:clear-movies
```

## 🎨 **UI/UX Development**

### **Component Development**
The application includes several key UI components:

- **Status Badges**: Movie availability indicators
- **Episode Badges**: TV show episode numbering
- **Hover Effects**: Interactive movie cards
- **Player Interface**: Video player controls

### **Feature Development Guides**
- **Status Badge Implementation**: [STATUS_BADGE_IMPLEMENTATION_COMPLETE.md](../STATUS_BADGE_IMPLEMENTATION_COMPLETE.md)
- **Episode Badge System**: [EPISODE_BADGE_FIX_FINAL.md](../EPISODE_BADGE_FIX_FINAL.md)
- **Hover Interactions**: [HOVER_BADGE_IMPLEMENTATION_FINAL.md](../HOVER_BADGE_IMPLEMENTATION_FINAL.md)
- **SEO Features**: [SEO_IMPLEMENTATION_COMPLETE.md](../SEO_IMPLEMENTATION_COMPLETE.md)

## 🔄 **Git Workflow**

### **Branch Strategy**
```bash
# Main branches
main                    # Production-ready code
develop                # Development integration
feature/feature-name   # Feature development
hotfix/issue-name     # Production hotfixes
```

### **Development Flow**
```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/movie-filters

# Make changes and commit
git add .
git commit -m "feat: add movie filter functionality"

# Push and create PR
git push origin feature/movie-filters
# Create pull request to develop branch
```

### **Release Flow**
```bash
# Prepare release
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Finalize release
git checkout main
git merge release/v1.2.0
git tag v1.2.0
git push origin main --tags
```

## 🧪 **Testing Strategy**

### **Test Types**
- **Unit Tests**: Individual function testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full user flow testing
- **API Tests**: Backend endpoint testing

### **Running Tests**
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# API tests
npm run test:api

# Coverage report
npm run test:coverage
```

### **Test Development**
```bash
# Create test file
touch src/components/MovieCard.test.tsx

# Run specific test
npm test -- --testPathPattern=MovieCard

# Watch mode for development
npm run test:watch
```

## 📊 **Code Quality**

### **Linting & Formatting**
```bash
# ESLint
npm run lint
npm run lint:fix

# Prettier
npm run format
npm run format:check

# TypeScript checking
npm run type-check
```

### **Pre-commit Hooks**
```bash
# Setup Husky hooks
npm run prepare

# Manual pre-commit check
npm run pre-commit
```

## 🚀 **Local to Production**

### **Development Testing**
```bash
# Test production build locally
npm run build
npm run start

# Test with production environment
NODE_ENV=production npm run start
```

### **Deploy to Production**
```bash
# Commit and push changes
git add .
git commit -m "feat: new feature implementation"
git push origin feature-branch

# After PR merge to main
git checkout main
git pull origin main

# Deploy to production server
./deploy-production.sh
```

## 🔧 **Development Tools**

### **Recommended VS Code Extensions**
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

### **Browser Developer Tools**
- React Developer Tools
- Redux DevTools
- Network Analysis Tools
- Performance Profiling

## 🐛 **Development Debugging**

### **Frontend Debugging**
```bash
# Enable React DevTools
# Set debugging breakpoints in browser
# Use console.log for quick debugging

# Development server with debugging
npm run dev:debug
```

### **Backend Debugging**
```bash
# Node.js debugging
node --inspect server/index.ts

# VS Code debugging
# Use built-in Node.js debugger
# Set breakpoints in TypeScript files
```

### **Database Debugging**
```bash
# Connect to local database
psql postgresql://filmflex:password@localhost:5432/filmflex

# Query debugging
EXPLAIN ANALYZE SELECT * FROM movies WHERE title LIKE '%action%';

# Check query performance
SELECT * FROM pg_stat_statements;
```

## 📈 **Performance Development**

### **Frontend Performance**
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Bundle analysis with webpack-bundle-analyzer
- Lighthouse audits for performance metrics

### **Backend Performance**
- Database query optimization
- Caching strategies (Redis)
- API response optimization
- Server-side rendering considerations

### **Monitoring Development**
```bash
# Bundle analysis
npm run analyze

# Performance profiling
npm run profile

# Memory usage monitoring
node --max-old-space-size=4096 server/index.js
```

## 🔄 **Feature Development Cycle**

1. **Planning**: Define requirements and technical approach
2. **Setup**: Create feature branch and basic structure
3. **Development**: Implement feature with tests
4. **Testing**: Unit, integration, and manual testing
5. **Review**: Code review and feedback incorporation
6. **Integration**: Merge to develop branch
7. **Deployment**: Deploy to staging/production
8. **Monitoring**: Monitor feature performance and usage

**Next Steps**: [Production Deployment](../03-deployment/production-deployment.md) | [Maintenance Tasks](../04-maintenance/maintenance-tasks.md)