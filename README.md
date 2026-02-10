# Order Management Service Backend

A scalable Node.js/TypeScript backend service for food ordering with authentication, cart management, inventory tracking, and order processing.

## 🚀 Features

### Authentication
- **Sign Up**: Create new user accounts with email/password
- **Sign In**: JWT-based authentication
- **Role-based access**: Customer and Admin roles

### Menu Management
- Browse available food items
- Real-time inventory tracking
- Low stock threshold monitoring
- Automatic availability updates based on inventory

### Shopping Cart
- Add items to cart with quantity validation
- Update cart item quantities
- Remove items from cart
- Clear entire cart
- Inventory validation before adding to cart

### Order Management
- Place orders from cart or direct items
- Automatic inventory deduction on order placement
- Transaction-based order processing (rollback on failure)
- Real-time order status updates
- Order history tracking

### Inventory System
- Track inventory count for each menu item
- Low stock threshold alerts
- Automatic availability toggle when out of stock
- Prevent overselling with transaction locks

## 📋 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Cache/State**: Redis
- **Validation**: Zod
- **Authentication**: JWT + Bcrypt

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Neon PostgreSQL database (cloud-hosted)
- Redis (local or cloud)

### 1. Clone and Install Dependencies
```bash
cd order-management-service-backend
npm install
```

### 2. Configure Environment
Update the `.env` file with your database connection string:
```env
PORT=5000
NODE_ENV=development

# Neon Database Connection String
DATABASE_URL=postgresql://your_user:your_password@your-host.neon.tech/your_db?sslmode=require

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=1d
```

### 3. Run Database Migrations
```bash
npm run migrate
```

This will create all the necessary tables:
- users
- menu_items
- carts
- cart_items
- orders
- order_items

### 4. Seed Initial Data
```bash
npm run seed
```

This will populate the menu_items table with sample food items.

### 5. Start Redis (if using local)
```bash
# Option 1: Using Docker
docker run -d -p 6379:6379 redis:7

# Option 2: Using local Redis installation
redis-server
```

### 6. Run Development Server
```bash
npm run dev
```

The server will:
- Connect to Neon PostgreSQL
- Connect to Redis
- Start on port 5000

## 📦 Database Migrations

### Available Migration Commands

```bash
# Run all pending migrations
npm run migrate

# Undo the last migration
npm run migrate:undo

# Undo all migrations
npm run migrate:undo:all

# Run all seeders
npm run seed

# Undo all seeders
npm run seed:undo
```

### Creating New Migrations

```bash
# Generate a new migration file
npx sequelize-cli migration:generate --name your-migration-name

# Generate a new seeder file
npx sequelize-cli seed:generate --name your-seeder-name
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Login and get JWT token | No |

**Register Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone_number": "1234567890"
}
```

**Login Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Menu
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/menu` | Get all available menu items | No |
| `POST` | `/api/menu` | Create menu item (Admin) | No* |

**Menu Item Response:**
```json
{
  "id": 1,
  "name": "Margherita Pizza",
  "description": "Classic pizza with tomato sauce, mozzarella, and basil.",
  "price": "12.99",
  "image_url": "https://...",
  "category": "Pizza",
  "is_available": true,
  "inventory_count": 50,
  "low_stock_threshold": 5
}
```

### Cart
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/cart` | Get user's cart | Yes |
| `POST` | `/api/cart/items` | Add item to cart | Yes |
| `PUT` | `/api/cart/items/:cartItemId` | Update cart item quantity | Yes |
| `DELETE` | `/api/cart/clear` | Clear entire cart | Yes |

**Add to Cart Request:**
```json
{
  "menuItemId": 1,
  "quantity": 2
}
```

**Update Cart Item Request:**
```json
{
  "quantity": 3  // Set to 0 to remove item
}
```

### Orders
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/orders` | Place new order | Yes |
| `GET` | `/api/orders` | Get user's order history | Yes |
| `GET` | `/api/orders/:id` | Get specific order details | Yes |

**Place Order Request (from cart):**
```json
{
  "fromCart": true,
  "delivery_details": {
    "name": "John Doe",
    "address": "123 Main St, City, State 12345",
    "phone": "1234567890"
  }
}
```

**Place Order Request (direct items):**
```json
{
  "items": [
    {
      "menuItemId": 1,
      "quantity": 2
    },
    {
      "menuItemId": 3,
      "quantity": 1
    }
  ],
  "delivery_details": {
    "name": "John Doe",
    "address": "123 Main St, City, State 12345",
    "phone": "1234567890"
  }
}
```

**Order Response:**
```json
{
  "message": "Order placed successfully",
  "orderId": 1,
  "status": "Order Received",
  "total_amount": 38.97
}
```

## 🔄 Order Status Flow

Orders automatically progress through these statuses:
1. **Order Received** (Initial)
2. **Preparing** (After 10 seconds)
3. **Out for Delivery** (After 20 seconds)
4. **Delivered** (After 30 seconds)

Status updates are stored in Redis for real-time tracking.

## 🗄️ Database Schema

### Users
- id, name, email, password_hash, phone_number, role

### MenuItems
- id, name, description, price, image_url, category, is_available, inventory_count, low_stock_threshold

### Carts
- id, userId (one-to-one with User)

### CartItems
- id, cartId, menuItemId, quantity

### Orders
- id, userId, total_amount, status, delivery_name, delivery_address, delivery_phone

### OrderItems
- id, orderId, menuItemId, quantity, price_at_order

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 🧪 Testing the API

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Get Menu (save the token from login)
```bash
curl http://localhost:5000/api/menu
```

### 4. Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "menuItemId": 1,
    "quantity": 2
  }'
```

### 5. Place Order from Cart
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "fromCart": true,
    "delivery_details": {
      "name": "Test User",
      "address": "123 Test St",
      "phone": "1234567890"
    }
  }'
```

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build

## 🏗️ Project Structure

```
src/
├── config/          # Database, Redis, and app configuration
├── controllers/     # Request handlers
├── middleware/      # Authentication and other middleware
├── models/          # Sequelize models and associations
├── routes/          # API route definitions
├── services/        # Business logic services
├── utils/           # Utility functions
├── validation/      # Zod validation schemas
├── app.ts           # Express app setup
├── server.ts        # Server entry point
└── seed.ts          # Database seeding
```

## 🚀 Next Steps

- [ ] Add WebSocket support for real-time order updates
- [ ] Implement admin dashboard endpoints
- [ ] Add payment gateway integration
- [ ] Implement order cancellation
- [ ] Add email notifications
- [ ] Implement rate limiting
- [ ] Add comprehensive error logging
- [ ] Write unit and integration tests

## 📝 License

ISC
