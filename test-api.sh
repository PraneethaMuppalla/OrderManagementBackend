#!/bin/bash
# Order Management Service - API Test Script
# Make this file executable: chmod +x test-api.sh

BASE_URL="http://localhost:5000/api"

echo "================================"
echo "🧪 Testing Order Management API"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# 1. AUTHENTICATION TESTS
# ========================================

echo -e "${BLUE}📝 1. REGISTER NEW USER${NC}"
echo "POST $BASE_URL/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone_number": "1234567890"
  }')
echo "$REGISTER_RESPONSE" | jq '.'
echo ""

echo -e "${BLUE}📝 2. LOGIN${NC}"
echo "POST $BASE_URL/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')
echo "$LOGIN_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
echo -e "${GREEN}✅ Token saved: ${TOKEN:0:20}...${NC}"
echo ""

# ========================================
# 2. MENU TESTS
# ========================================

echo -e "${BLUE}📝 3. GET MENU ITEMS${NC}"
echo "GET $BASE_URL/menu"
curl -s "$BASE_URL/menu" | jq '.'
echo ""

echo -e "${BLUE}📝 4. GET LOW STOCK ITEMS${NC}"
echo "GET $BASE_URL/menu/low-stock"
curl -s "$BASE_URL/menu/low-stock" | jq '.'
echo ""

echo -e "${BLUE}📝 5. GET STOCK STATUS FOR ITEM 1${NC}"
echo "GET $BASE_URL/menu/1/stock-status"
curl -s "$BASE_URL/menu/1/stock-status" | jq '.'
echo ""

# ========================================
# 3. CART TESTS (Requires Authentication)
# ========================================

echo -e "${BLUE}📝 6. GET CART${NC}"
echo "GET $BASE_URL/cart"
curl -s "$BASE_URL/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo -e "${BLUE}📝 7. ADD ITEM TO CART${NC}"
echo "POST $BASE_URL/cart/items"
CART_RESPONSE=$(curl -s -X POST "$BASE_URL/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "menuItemId": 1,
    "quantity": 2
  }')
echo "$CART_RESPONSE" | jq '.'
echo ""

echo -e "${BLUE}📝 8. ADD ANOTHER ITEM TO CART${NC}"
curl -s -X POST "$BASE_URL/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "menuItemId": 2,
    "quantity": 1
  }' | jq '.'
echo ""

echo -e "${BLUE}📝 9. VIEW CART${NC}"
curl -s "$BASE_URL/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# ========================================
# 4. ORDER TESTS
# ========================================

echo -e "${BLUE}📝 10. PLACE ORDER FROM CART${NC}"
echo "POST $BASE_URL/orders"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromCart": true,
    "delivery_details": {
      "name": "Test User",
      "address": "123 Test Street, Test City, 12345",
      "phone": "1234567890"
    }
  }')
echo "$ORDER_RESPONSE" | jq '.'

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.orderId')
echo -e "${GREEN}✅ Order ID: $ORDER_ID${NC}"
echo ""

echo -e "${BLUE}📝 11. GET ORDER DETAILS${NC}"
echo "GET $BASE_URL/orders/$ORDER_ID"
curl -s "$BASE_URL/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo -e "${BLUE}📝 12. GET ALL ORDERS${NC}"
echo "GET $BASE_URL/orders"
curl -s "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
