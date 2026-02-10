#!/bin/bash

BASE_URL="http://localhost:5000"

echo "🧪 Testing Order Flow"
echo "======================"
echo ""

# 1. Login as Customer
echo "🔐 1. Customer Login"
CUSTOMER_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')

if [ "$CUSTOMER_TOKEN" == "null" ] || [ -z "$CUSTOMER_TOKEN" ]; then
    echo "❌ Customer login failed. Creating customer..."
    curl -s -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test Customer",
        "email": "test@example.com",
        "password": "password123",
        "phone_number": "1234567890"
      }' > /dev/null
    
    CUSTOMER_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')
fi

echo "✅ Customer logged in"
echo ""

# 2. Add Item to Cart
echo "🛒 2. Add Item to Cart"
# Get a menu item ID first
ITEM_ID=$(curl -s "$BASE_URL/api/menu?limit=1" -H "Authorization: Bearer $CUSTOMER_TOKEN" | jq -r '.items[0].id')
echo "   Adding Item ID: $ITEM_ID"

curl -s -X POST "$BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"menuItemId\": $ITEM_ID, \"quantity\": 1}" | jq -r '.message'
echo ""

# 3. Place Order
echo "📦 3. Place Order"
ORDER_RES=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_name": "Test Customer",
    "delivery_address": "123 Test St, Test City",
    "delivery_phone": "1234567890"
  }')

echo "   Response: $ORDER_RES"
ORDER_ID=$(echo $ORDER_RES | jq -r '.order.id')
echo "   Order ID: $ORDER_ID"
echo ""

if [ "$ORDER_ID" == "null" ]; then
    echo "❌ Order placement failed"
    exit 1
fi

# 4. Login as Admin
echo "🔐 4. Admin Login"
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' | jq -r '.token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed"
  exit 1
fi
echo "✅ Admin logged in"
echo ""

# 5. Update Order Status (Admin)
echo "🔄 5. Update Order Status to 'Preparing'"
UPDATE_RES=$(curl -s -X PUT "$BASE_URL/api/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Preparing"}')

echo "   Response: $UPDATE_RES"
NEW_STATUS=$(echo $UPDATE_RES | jq -r '.order.status')

if [ "$NEW_STATUS" == "Preparing" ]; then
    echo "✅ Status updated successfully"
else
    echo "❌ Status update failed"
fi
echo ""

# 6. Verify Customer sees new status
echo "👀 6. Verify Customer Order Status"
USER_ORDERS=$(curl -s "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN")

LATEST_ORDER_STATUS=$(echo $USER_ORDERS | jq -r "map(select(.id == $ORDER_ID)) | .[0].status")
echo "   Customer sees status for Order #$ORDER_ID: $LATEST_ORDER_STATUS"

if [ "$LATEST_ORDER_STATUS" == "Preparing" ]; then
    echo "✅ Customer sees updated status"
else
    echo "❌ Verification failed"
fi

echo ""
echo "✨ Order Flow Test Completed!"
