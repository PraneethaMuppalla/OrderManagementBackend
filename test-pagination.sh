#!/bin/bash

# Test script for menu pagination

BASE_URL="http://localhost:5000"

echo "🔐 Logging in..."
# Try to login first
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

# If login failed, try to register
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "🔐 User not found, creating new user..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test User",
      "email": "test@example.com",
      "password": "password123",
      "phone_number": "1234567890"
    }')
  
  echo "Registration response: $REGISTER_RESPONSE"
  
  # Now login to get the token
  echo "🔐 Logging in with new user..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }')
  
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
fi

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Successfully authenticated!"
echo ""

# Test 1: Get first page
echo "📄 Test 1: Getting first page (limit=10)"
curl -s "$BASE_URL/api/menu?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .pagination.total,
    limit: .pagination.limit,
    hasMore: .pagination.hasMore,
    nextCursor: .pagination.nextCursor,
    itemCount: (.items | length),
    firstItem: .items[0].name,
    lastItem: .items[-1].name
  }'
echo ""

# Test 2: Get second page using cursor
echo "📄 Test 2: Getting second page (cursor=10, limit=10)"
curl -s "$BASE_URL/api/menu?cursor=10&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .pagination.total,
    limit: .pagination.limit,
    hasMore: .pagination.hasMore,
    nextCursor: .pagination.nextCursor,
    itemCount: (.items | length),
    firstItem: .items[0].name,
    lastItem: .items[-1].name
  }'
echo ""

# Test 3: Filter by category
echo "🍕 Test 3: Filtering by category (Pizza)"
curl -s "$BASE_URL/api/menu?category=Pizza&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .pagination.total,
    limit: .pagination.limit,
    hasMore: .pagination.hasMore,
    categories: [.items[].category] | unique,
    items: [.items[].name]
  }'
echo ""

# Test 4: Search functionality
echo "🔍 Test 4: Searching for 'chicken'"
curl -s "$BASE_URL/api/menu?search=chicken&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .pagination.total,
    limit: .pagination.limit,
    hasMore: .pagination.hasMore,
    items: [.items[] | {name: .name, category: .category}]
  }'
echo ""

# Test 5: Combined filters
echo "🎯 Test 5: Combined - Category=Burgers, Search=spicy"
curl -s "$BASE_URL/api/menu?category=Burgers&search=spicy&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .pagination.total,
    limit: .pagination.limit,
    hasMore: .pagination.hasMore,
    items: [.items[] | {name: .name, category: .category, description: .description}]
  }'
echo ""

# Test 6: Get all categories
echo "📊 Test 6: Getting all menu categories with statistics"
curl -s "$BASE_URL/api/menu/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "✨ Pagination tests completed!"
