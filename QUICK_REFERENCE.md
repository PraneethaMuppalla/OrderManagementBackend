# Quick Reference Guide

## 🚀 Getting Started

### First Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Update .env with your Neon database URL
DATABASE_URL=postgresql://your_connection_string

# 3. Run migrations
npm run migrate

# 4. Seed database
npm run seed

# 5. Start server
npm run dev
```

## 📡 API Quick Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication

**Register**
```bash
POST /auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone_number": "1234567890"
}
```

**Login**
```bash
POST /auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
# Returns: { "token": "jwt_token", "user": {...} }
```

### Menu

**Get Menu**
```bash
GET /menu
# No auth required
```

### Cart (Requires Auth)

**Get Cart**
```bash
GET /cart
Headers: Authorization: Bearer <token>
```

**Add to Cart**
```bash
POST /cart/items
Headers: Authorization: Bearer <token>
{
  "menuItemId": 1,
  "quantity": 2
}
```

**Update Cart Item**
```bash
PUT /cart/items/:cartItemId
Headers: Authorization: Bearer <token>
{
  "quantity": 3  // Set to 0 to remove
}
```

**Clear Cart**
```bash
DELETE /cart/clear
Headers: Authorization: Bearer <token>
```

### Orders (Requires Auth)

**Place Order from Cart**
```bash
POST /orders
Headers: Authorization: Bearer <token>
{
  "fromCart": true,
  "delivery_details": {
    "name": "John Doe",
    "address": "123 Main St",
    "phone": "1234567890"
  }
}
```

**Place Order with Direct Items**
```bash
POST /orders
Headers: Authorization: Bearer <token>
{
  "items": [
    { "menuItemId": 1, "quantity": 2 },
    { "menuItemId": 3, "quantity": 1 }
  ],
  "delivery_details": {
    "name": "John Doe",
    "address": "123 Main St",
    "phone": "1234567890"
  }
}
```

**Get Order History**
```bash
GET /orders
Headers: Authorization: Bearer <token>
```

**Get Specific Order**
```bash
GET /orders/:id
Headers: Authorization: Bearer <token>
```

## 🗄️ Database Commands

```bash
# Run all pending migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Undo all migrations
npm run migrate:undo:all

# Run all seeders
npm run seed

# Undo all seeders
npm run seed:undo

# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Create new seeder
npx sequelize-cli seed:generate --name seeder-name
```

## 🔧 Development Commands

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npx tsc --noEmit
```

## 📊 Order Status Flow

1. **Order Received** (Initial)
2. **Preparing** (After 10 seconds)
3. **Out for Delivery** (After 20 seconds)
4. **Delivered** (After 30 seconds)

## 🔐 Environment Variables

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d
```

## 🐛 Common Issues

### Redis Connection Error
- **Issue**: `ECONNREFUSED 127.0.0.1:6379`
- **Solution**: The app will run without Redis. Some caching features will be limited.
- **Fix**: Start Redis with `docker run -d -p 6379:6379 redis:7`

### Migration Errors
- **Issue**: Migration fails
- **Solution**: Check DATABASE_URL is correct
- **Fix**: Verify Neon database connection string

### TypeScript Errors
- **Issue**: Type errors during development
- **Solution**: Run `npx tsc --noEmit` to check
- **Fix**: Ensure all dependencies are installed

## 📝 Testing with cURL

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123"}'

# 2. Login (save the token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# 3. Get Menu
curl http://localhost:5000/api/menu

# 4. Add to Cart (replace TOKEN)
curl -X POST http://localhost:5000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"menuItemId":1,"quantity":2}'

# 5. Get Cart
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer TOKEN"

# 6. Place Order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fromCart":true,"delivery_details":{"name":"Test","address":"123 St","phone":"1234567890"}}'
```

## 🎯 Key Features

- ✅ JWT Authentication
- ✅ Shopping Cart System
- ✅ Inventory Management
- ✅ Order Processing
- ✅ Real-time Status Updates
- ✅ Transaction Safety
- ✅ Input Validation
- ✅ Cloud Database (Neon)
- ✅ Migration System
- ✅ TypeScript
