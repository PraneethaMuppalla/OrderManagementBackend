#!/bin/bash

BASE_URL="http://localhost:5000"

echo "🧪 Testing Idempotency"
echo "======================"
echo ""

# 1. Login
echo "🔐 Login..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi
echo "✅ Logged in"

# 2. Add Item to Cart
echo "🛒 Add Item to Cart..."
# Get item ID
ITEM_ID=$(curl -s "$BASE_URL/api/menu?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].id')
curl -s -X POST "$BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"menuItemId\": $ITEM_ID, \"quantity\": 1}" > /dev/null
echo "✅ Item added"

# 3. Place Order (First Attempt)
KEY="test-idempotency-key-$(date +%s)"
echo "📦 Place Order (Attempt 1) with Key: $KEY"
RES1=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{
    "delivery_name": "Test User",
    "delivery_address": "Test Address",
    "delivery_phone": "1234567890"
  }')

echo "   Response 1: $(echo $RES1 | jq -r '.message')"
ORDER_ID=$(echo $RES1 | jq -r '.order.id')

# 4. Place Order (Second Attempt - Idempotent Retry)
echo "📦 Place Order (Attempt 2) with SAME Key"
RES2=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{
    "delivery_name": "Test User",
    "delivery_address": "Test Address",
    "delivery_phone": "1234567890"
  }')

echo "   Response 2: $(echo $RES2 | jq -r '.message')"
ORDER_ID_2=$(echo $RES2 | jq -r '.order.id')

if [ "$ORDER_ID" == "$ORDER_ID_2" ] && [[ "$RES2" == *"Order already processed"* ]]; then
    echo "✅ Idempotency Works! Order IDs match and message confirms idempotency."
else
    echo "❌ Idempotency Failed"
    echo "Order 1: $ORDER_ID"
    echo "Order 2: $ORDER_ID_2"
    echo "Full Response 2: $RES2"
fi
