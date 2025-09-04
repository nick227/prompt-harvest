# Admin Dashboard Architecture

## 🏗️ **Model-First Declarative Design**

The admin dashboard uses a declarative, model-first approach to minimize code duplication and maximize maintainability.

---

## 📋 **Core Components**

### **1. Declarative Form Generator**
- **File**: `public/js/services/FormGenerator.js`
- **Purpose**: Generate forms from JSON schemas
- **Features**: Validation, styling, event handling, data binding

### **2. Admin Data Service**
- **File**: `public/js/services/AdminDataService.js`
- **Purpose**: Centralized API communication for admin operations
- **Features**: CRUD operations, error handling, caching

### **3. Section Manager**
- **File**: `public/js/services/AdminSectionManager.js`
- **Purpose**: Manage section visibility and state
- **Features**: Navigation, lazy loading, state persistence

### **4. Dashboard Models**
- **File**: `public/js/models/AdminModels.js`
- **Purpose**: Define all section configurations declaratively
- **Features**: Schema definitions, validation rules, UI configs

---

## 🎯 **Admin Sections**

### **1. 💳 Payments Overview**
```javascript
{
  id: 'payments',
  title: 'Site-wide Payments',
  icon: 'fas fa-money-bill-wave',
  type: 'data-table',
  api: '/api/admin/payments',
  permissions: ['admin'],
  features: ['search', 'filter', 'export', 'pagination']
}
```

**Data Sources:**
- Stripe payments with user details
- Credit purchases by date range
- Revenue analytics and trends
- Failed/refunded transactions

### **2. 💰 Cost Management**
```javascript
{
  id: 'pricing',
  title: 'Cost Per Cycle',
  icon: 'fas fa-calculator',
  type: 'form-editor',
  api: '/api/admin/pricing',
  permissions: ['admin'],
  features: ['live-preview', 'validation', 'rollback']
}
```

**Configurable Values:**
- Cost per image generation by provider
- Credit package prices and values
- Promo code creation and management
- Dynamic pricing rules

### **3. 📊 Site Activity**
```javascript
{
  id: 'activity',
  title: 'Site Activity',
  icon: 'fas fa-chart-line',
  type: 'dashboard',
  api: '/api/admin/activity',
  permissions: ['admin'],
  features: ['real-time', 'charts', 'alerts']
}
```

**Metrics:**
- Image generation statistics
- User activity patterns
- System performance metrics
- Error rates and logs

### **4. 👥 User Management**
```javascript
{
  id: 'users',
  title: 'User Management',
  icon: 'fas fa-users',
  type: 'user-manager',
  api: '/api/admin/users',
  permissions: ['admin'],
  features: ['search', 'bulk-actions', 'credit-management']
}
```

**User Operations:**
- View user profiles and activity
- Add/remove credits manually
- Suspend/unsuspend accounts
- User activity summaries

---

## 🔐 **Security Model**

### **Backend Protection**
```javascript
// Middleware: src/middleware/AdminAuthMiddleware.js
const requireAdmin = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
```

### **Frontend Protection**
```javascript
// Service: AdminAuthService.js
class AdminAuthService {
  async checkAdminAccess() {
    const response = await apiService.get('/api/admin/auth/verify');
    return response.isAdmin === true;
  }
}
```

---

## 📱 **UI Architecture**

### **Responsive Layout**
```
┌─────────────────────────────────────┐
│ Header (Logout, Admin Badge)        │
├─────────────────────────────────────┤
│ Sidebar │ Main Content Area         │
│ - Payments   │                      │
│ - Pricing    │ Dynamic Section      │
│ - Activity   │ Content              │
│ - Users      │                      │
│              │                      │
└─────────────────────────────────────┘
```

### **Mobile Adaptation**
- Collapsible sidebar
- Stack layout on small screens
- Touch-friendly controls
- Swipe navigation

---

## 🛠️ **Reusable Components**

### **1. Data Table Component**
```javascript
const DataTableConfig = {
  columns: [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'email', title: 'User', searchable: true },
    { key: 'amount', title: 'Amount', formatter: 'currency' },
    { key: 'createdAt', title: 'Date', formatter: 'date' }
  ],
  actions: ['view', 'export', 'refund'],
  pagination: { pageSize: 50 }
};
```

### **2. Form Generator Schema**
```javascript
const PricingFormSchema = {
  fields: [
    {
      name: 'openai_cost',
      type: 'currency',
      label: 'OpenAI Cost per Image',
      required: true,
      validation: { min: 0.001, max: 1.0 }
    },
    {
      name: 'stability_cost',
      type: 'currency',
      label: 'Stability AI Cost per Image',
      required: true,
      validation: { min: 0.001, max: 1.0 }
    }
  ],
  layout: 'grid-2-col',
  submitText: 'Update Pricing'
};
```

### **3. Chart Component**
```javascript
const ActivityChartConfig = {
  type: 'line',
  data: '/api/admin/activity/chart',
  refresh: 30000, // 30 seconds
  options: {
    responsive: true,
    scales: {
      x: { type: 'time' },
      y: { beginAtZero: true }
    }
  }
};
```

---

## 🔄 **Data Flow**

### **1. Initialization**
```
Page Load → Auth Check → Load Admin Models → Render Sections
```

### **2. Section Navigation**
```
Click Section → Load Model → Fetch Data → Render Component
```

### **3. Form Submission**
```
Form Submit → Validate → API Call → Update UI → Show Feedback
```

### **4. Real-time Updates**
```
WebSocket/Polling → Update Models → Refresh Components
```

---

## 📊 **Performance Strategy**

### **Lazy Loading**
- Load sections only when accessed
- Defer heavy components until visible
- Progressive data loading

### **Caching**
- Cache admin data with TTL
- Store form states locally
- Persist navigation state

### **Optimization**
- Virtualized tables for large datasets
- Debounced search inputs
- Optimistic UI updates

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- Form generator validation
- Data service operations
- Component rendering

### **Integration Tests**
- Admin auth flow
- API endpoint security
- End-to-end workflows

### **Manual Test Cases**
- Admin-only access verification
- Form validation scenarios
- Data consistency checks

---

This architecture provides:
- ✅ **Maintainable**: Model-first approach
- ✅ **Secure**: Admin-only access controls
- ✅ **Scalable**: Reusable components
- ✅ **Responsive**: Mobile-friendly design
- ✅ **Fast**: Optimized performance
