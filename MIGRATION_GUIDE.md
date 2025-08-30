# 🗄️ MySQL Migration Guide

This guide outlines the systematic migration from NeDB to MySQL using Prisma ORM.

## 📋 **Migration Overview**

### **What We're Migrating:**
- **From**: NeDB (file-based NoSQL database)
- **To**: MySQL (relational database) with Prisma ORM
- **Architecture**: Maintains existing repository pattern with enhanced capabilities

### **Benefits of Migration:**
- **Scalability**: Better performance for large datasets
- **Relationships**: Proper foreign key constraints and joins
- **ACID Compliance**: Transaction support and data integrity
- **Backup & Recovery**: Standard database backup procedures
- **Monitoring**: Better query performance monitoring
- **Multi-user Support**: Concurrent access without file locking

## 🚀 **Migration Steps**

### **Step 1: Environment Setup**

1. **Install Dependencies:**
   ```bash
   npm install prisma @prisma/client
   ```

2. **Configure Database URL:**
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/image_harvest"
   ```

3. **Initialize Prisma:**
   ```bash
   npx prisma init
   ```

### **Step 2: Database Schema**

1. **Review Schema:** `prisma/schema.prisma`
   - 8 models with proper relationships
   - Indexes for performance optimization
   - Foreign key constraints for data integrity

2. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

3. **Create Database Tables:**
   ```bash
   npm run db:migrate
   ```

### **Step 3: Data Migration**

1. **Run Migration Script:**
   ```bash
   npm run db:migrate-data
   ```

2. **Verify Migration:**
   - Check `migration-report.json` for results
   - Verify data integrity in MySQL
   - Test application functionality

### **Step 4: Application Updates**

1. **Update Configuration:**
   - Database connection settings
   - Environment variables

2. **Test Application:**
   - All API endpoints
   - Database operations
   - Error handling

## 📊 **Database Schema**

### **Models:**

#### **User Management:**
```sql
users (
  id, email, username, password, isAdmin,
  createdAt, updatedAt
)
```

#### **Image Management:**
```sql
images (
  id, userId, prompt, original, imageUrl,
  provider, guidance, model, rating,
  createdAt, updatedAt
)
```

#### **Like Management:**
```sql
likes (
  id, userId, imageId, createdAt
)
```

#### **Tag Management:**
```sql
tags (
  id, userId, imageId, tag, createdAt
)
```

#### **Prompt Management:**
```sql
prompts (
  id, userId, prompt, original, provider,
  guidance, createdAt, updatedAt
)
```

#### **Word Type Management:**
```sql
word_types (
  id, word, types, examples,
  createdAt, updatedAt
)
```

#### **Category Management:**
```sql
categories (
  id, name, description, createdAt, updatedAt
)
```

#### **Multiplier Management:**
```sql
multipliers (
  id, name, value, createdAt, updatedAt
)
```

#### **Prompt Clause Management:**
```sql
prompt_clauses (
  id, clause, category, createdAt, updatedAt
)
```

### **Relationships:**
- **User → Images** (1:N)
- **User → Likes** (1:N)
- **User → Tags** (1:N)
- **User → Prompts** (1:N)
- **Image → Likes** (1:N)
- **Image → Tags** (1:N)

### **Indexes:**
- Primary keys on all tables
- Foreign key indexes
- Performance indexes on frequently queried fields
- Composite indexes for unique constraints

## 🔧 **Available Commands**

### **Database Management:**
```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Deploy migrations to production
npm run db:deploy

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (development only)
npm run db:reset

# Check migration status
npm run db:status
```

### **Data Operations:**
```bash
# Migrate data from NeDB to MySQL
npm run db:migrate-data

# Seed database with initial data
npm run db:seed
```

## 📁 **File Structure**

```
prisma/
├── schema.prisma          # Database schema definition
└── migrations/            # Generated migration files

src/
├── database/
│   └── PrismaClient.js    # Database connection management
├── repositories/
│   ├── PrismaBaseRepository.js    # Base repository with Prisma
│   └── PrismaImageRepository.js   # Image-specific repository
└── scripts/
    └── migrate-to-mysql.js        # Data migration script
```

## 🔄 **Migration Process**

### **Phase 1: Preparation**
1. ✅ Install Prisma dependencies
2. ✅ Create database schema
3. ✅ Set up database connection
4. ✅ Create migration scripts

### **Phase 2: Data Migration**
1. 🔄 Backup existing NeDB data
2. 🔄 Run migration script
3. 🔄 Verify data integrity
4. 🔄 Generate migration report

### **Phase 3: Application Update**
1. 🔄 Update repository implementations
2. 🔄 Test all functionality
3. 🔄 Update configuration
4. 🔄 Deploy to production

### **Phase 4: Validation**
1. 🔄 Run comprehensive tests
2. 🔄 Verify performance
3. 🔄 Monitor for issues
4. 🔄 Document any changes

## 🛡️ **Safety Measures**

### **Backup Strategy:**
- **Before Migration**: Full NeDB backup
- **During Migration**: Transaction-based migration
- **After Migration**: MySQL backup verification

### **Rollback Plan:**
- Keep NeDB files as backup
- Maintain application compatibility
- Quick rollback procedure documented

### **Data Validation:**
- Record counts verification
- Data integrity checks
- Foreign key constraint validation
- Application functionality testing

## 📈 **Performance Considerations**

### **Optimizations:**
- **Indexes**: Strategic indexing for common queries
- **Relationships**: Proper foreign key constraints
- **Pagination**: Efficient pagination implementation
- **Caching**: Maintain existing caching strategy

### **Monitoring:**
- Query performance monitoring
- Database connection pooling
- Error rate tracking
- Response time monitoring

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **Connection Errors:**
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

#### **Migration Errors:**
```bash
# Reset migrations
npm run db:reset

# Check migration status
npm run db:status
```

#### **Data Migration Issues:**
```bash
# Check migration log
cat migration-report.json

# Re-run specific migration
node scripts/migrate-to-mysql.js
```

### **Support:**
- Check Prisma documentation
- Review migration logs
- Verify database permissions
- Test with sample data

## ✅ **Success Criteria**

### **Migration Complete When:**
- [ ] All data migrated successfully
- [ ] Application functions normally
- [ ] Performance meets requirements
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Team trained on new system

### **Post-Migration Tasks:**
- [ ] Monitor application performance
- [ ] Update monitoring tools
- [ ] Train team on Prisma
- [ ] Document lessons learned
- [ ] Plan future optimizations

## 📞 **Support**

For migration support:
1. Check this documentation
2. Review migration logs
3. Test with development data
4. Contact development team

---

**Migration Status**: 🟡 In Progress
**Last Updated**: January 2024
**Version**: 1.0.0
