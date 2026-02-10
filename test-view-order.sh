#!/bin/bash
BASE_URL="http://localhost:5000"

echo "🧪 Testing Get Order Details"
echo "=========================="

# 1. Login
echo "Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"john@example.com\", \"password\": \"password123\"}" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Login failed. Creating user..."
    EMAIL="test_view_$(date +%s)@test.com"
    curl -s -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"Test Viewer\", \"email\": \"$EMAIL\", \"password\": \"password123\", \"phone_number\": \"9876543210\"}" > /dev/null
      
    TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$EMAIL\", \"password\": \"password123\"}" | jq -r '.token')
fi

# 2. Add Item to Cart
echo "Adding item 84 to cart..."
curl -s -X POST "$BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"menuItemId\": 84, \"quantity\": 1}" > /dev/null

# 3. Place Order
echo "Placing Order..."
ORDER_RES=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"delivery_name\": \"John Doe\", \"delivery_address\": \"123 Main St\", \"delivery_phone\": \"1234567890\"}")

ORDER_ID=$(echo $ORDER_RES | jq -r '.order.id')
echo "Order Placed. ID: $ORDER_ID"

if [ "$ORDER_ID" == "null" ]; then
    echo "❌ Failed to place order. Response:"
    echo $ORDER_RES
    exit 1
fi

# 4. Get Order Details
echo "Fetching Order Details for ID: $ORDER_ID..."
DETAILS=$(curl -s "$BASE_URL/api/orders/$ORDER_ID" -H "Authorization: Bearer $TOKEN")

echo "Details:"
echo $DETAILS | jq '.'

RETRIEVED_ID=$(echo $DETAILS | jq -r '.id')

if [ "$RETRIEVED_ID" == "$ORDER_ID" ]; then
    echo "✅ SUCCESS: Retrieved order details correctly."
else
    echo "❌ FAIL: Could not retrieve order."
fi
