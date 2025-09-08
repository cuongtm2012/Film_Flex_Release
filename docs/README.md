# FilmFlex

A comprehensive movie streaming platform with advanced data synchronization capabilities and sophisticated content management for movie enthusiasts.

## 🚀 **Quick Start - New Workflow Documentation**

**📋 For the complete FilmFlex documentation, visit: [docs/workflow/README.md](workflow/README.md)**

This new workflow-based documentation provides:
- 🎯 **5-minute setup guide**
- 💻 **Development workflow** 
- 🚀 **Production deployment**
- 🛠️ **Maintenance tasks**
- 🚨 **Troubleshooting guide**

## ⚡ **Super Quick Start**

```bash
# Get FilmFlex running in 5 minutes
./setup-server-automation.sh

# Access your application
curl http://localhost:5000
```

**For detailed instructions**: [Quick Start Guide](workflow/01-setup/quick-start.md)

## 🏗️ **System Overview**

### **Production Ready Features**
- **22,557+ movies** with automated daily updates
- **Docker deployment** with health monitoring  
- **Automated backups** and maintenance
- **Modern React frontend** with TypeScript
- **PostgreSQL database** with role-based access

### **Current Production Status**
- **Server**: 38.54.14.154 (phimgg.com)
- **Status**: ✅ Running with Docker
- **Automation**: ✅ Daily imports & health checks
- **Database**: ✅ PostgreSQL with automated backups

## 📖 **Documentation Structure**

| Guide | Purpose | Quick Link |
|-------|---------|------------|
| **🎯 Setup** | Get running in 5 minutes | [Quick Start](workflow/01-setup/quick-start.md) |
| **💻 Development** | Local development workflow | [Dev Guide](workflow/02-development/development-workflow.md) |
| **🚀 Deployment** | Production deployment | [Deploy Guide](workflow/03-deployment/production-deployment.md) |
| **🛠️ Maintenance** | Keep system running | [Maintenance](workflow/04-maintenance/maintenance-tasks.md) |
| **🚨 Troubleshooting** | Fix issues quickly | [Troubleshooting](workflow/05-troubleshooting/common-issues.md) |

## 🎬 **Features**

- **Content Management**: 22,557+ movies with metadata
- **Automated Updates**: Daily movie imports
- **Modern UI**: React + TypeScript + TailwindCSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Role-based access control
- **Deployment**: Docker + PM2 options
- **Monitoring**: Health checks and auto-restart

## 🛠️ **Tech Stack**

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Drizzle with type-safe schemas
- **Deployment**: Docker Compose, PM2
- **Automation**: Bash scripts, Cron jobs

## 📁 **Project Structure**

```
Film_Flex_Release/
├── client/                 # React frontend
├── server/                 # Express backend  
├── shared/                 # Shared types & utilities
├── scripts/                # Automation & deployment
│   ├── data/              # Movie import scripts
│   ├── deployment/        # Deployment automation
│   └── maintenance/       # Maintenance scripts
└── docs/
    └── workflow/          # 📋 New workflow documentation
```

## 🚀 **Getting Started**

Choose your path:

### **For New Users**
```bash
# Complete automated setup
./setup-server-automation.sh
```
📖 **Follow**: [Quick Start Guide](workflow/01-setup/quick-start.md)

### **For Developers** 
```bash
# Local development setup
npm install && npm run dev
```
📖 **Follow**: [Development Workflow](workflow/02-development/development-workflow.md)

### **For System Administrators**
```bash
# Production deployment
docker compose -f docker-compose.server.yml up -d
```
📖 **Follow**: [Production Deployment](workflow/03-deployment/production-deployment.md)

## 📊 **Success Metrics**

- **✅ Uptime**: 99.9% with auto-restart
- **✅ Database**: 10,000+ movies automated daily
- **✅ Performance**: <200ms response time
- **✅ Automation**: Zero-maintenance operations

## 🔗 **Quick Links**

- **🌐 Live Application**: http://38.54.14.154:5000
- **📋 Main Documentation**: [docs/workflow/README.md](workflow/README.md)
- **🎯 Quick Start**: [Setup Guide](workflow/01-setup/quick-start.md)
- **🚀 Deploy**: [Production Guide](workflow/03-deployment/production-deployment.md)

## 📞 **Support**

Need help? Check our workflow documentation:

1. **Setup Issues**: [Quick Start Guide](workflow/01-setup/quick-start.md)
2. **Development**: [Development Workflow](workflow/02-development/development-workflow.md)  
3. **Deployment Problems**: [Production Deployment](workflow/03-deployment/production-deployment.md)
4. **System Issues**: [Troubleshooting Guide](workflow/05-troubleshooting/common-issues.md)

---

**🎉 FilmFlex is production-ready!** Visit [docs/workflow/README.md](workflow/README.md) for complete documentation.