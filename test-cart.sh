#!/bin/bash

BASE_URL="http://localhost:5000"

echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Successfully authenticated!"
echo ""

# Test 1: Get empty cart
echo "🛒 Test 1: Getting cart (should be empty initially)"
curl -s "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 2: Add item to cart
echo "➕ Test 2: Adding Margherita Pizza to cart"
curl -s -X POST "$BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemId": 87,
    "quantity": 2
  }' | jq '.message'
echo ""

# Test 3: Add another item
echo "➕ Test 3: Adding Mozzarella Sticks to cart"
curl -s -X POST "$BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemId": 83,
    "quantity": 3
  }' | jq '.message'
echo ""

# Test 4: Get cart with items
echo "🛒 Test 4: Getting cart with items"
curl -s "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    itemCount: .cart.itemCount,
    subtotal: .cart.subtotal,
    items: .cart.items | map({name, quantity, price, itemTotal})
  }'
echo ""

# Test 5: Update cart item quantity
echo "✏️  Test 5: Updating pizza quantity to 3"
CART_ITEM_ID=$(curl -s "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.cart.items[0].id')

curl -s -X PUT "$BASE_URL/api/cart/items/$CART_ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }' | jq '.message'
echo ""

# Test 6: Get updated cart
echo "🛒 Test 6: Getting updated cart"
curl -s "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    itemCount: .cart.itemCount,
    subtotal: .cart.subtotal,
    items: .cart.items | map({name, quantity, itemTotal})
  }'
echo ""

# Test 7: Clear cart
echo "🗑️  Test 7: Clearing cart"
curl -s -X DELETE "$BASE_URL/api/cart/clear" \
  -H "Authorization: Bearer $TOKEN" | jq '.message'
echo ""

# Test 8: Verify cart is empty
echo "🛒 Test 8: Verifying cart is empty"
curl -s "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    itemCount: .cart.itemCount,
    subtotal: .cart.subtotal,
    itemsLength: (.cart.items | length)
  }'
echo ""

echo "✨ Cart tests completed!"
