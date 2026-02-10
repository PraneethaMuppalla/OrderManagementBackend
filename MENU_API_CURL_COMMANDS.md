# Menu API - cURL Commands Reference

This document provides ready-to-use cURL commands for testing all menu-related endpoints.

## Prerequisites

First, you need to authenticate and get a JWT token:

### 1. Register a User (if needed)
```bash
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone_number": "1234567890"
  }'
```

### 2. Login to Get Token
```bash
TOKEN=$(curl -s -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Your token: $TOKEN"
```

---

## Menu Endpoints

### 1. Get Menu Items (First Page)

**Basic request with default limit (12 items):**
```bash
curl -X GET "http://localhost:5000/api/menu" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**With custom limit:**
```bash
curl -X GET "http://localhost:5000/api/menu?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Response:**
```json
{
  "items": [...],
  "pagination": {
    "nextCursor": 10,
    "hasMore": true,
    "limit": 10,
    "total": 39
  }
}
```

---

### 2. Get Menu Items (Next Page - Cursor-based Pagination)

Use the `nextCursor` from the previous response:

```bash
curl -X GET "http://localhost:5000/api/menu?cursor=10&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Continue pagination:**
```bash
curl -X GET "http://localhost:5000/api/menu?cursor=20&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

### 3. Filter by Category

**Get all Pizza items:**
```bash
curl -X GET "http://localhost:5000/api/menu?category=Pizza" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Available categories:**
- Appetizers
- Pizza
- Burgers
- Pasta
- Salads
- Main Course
- Desserts
- Beverages

**Other category examples:**
```bash
# Get all Burgers
curl -X GET "http://localhost:5000/api/menu?category=Burgers&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get all Desserts
curl -X GET "http://localhost:5000/api/menu?category=Desserts&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get all Beverages
curl -X GET "http://localhost:5000/api/menu?category=Beverages&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

### 4. Search Menu Items

**Search by name or description (case-insensitive):**

```bash
# Search for "chicken"
curl -X GET "http://localhost:5000/api/menu?search=chicken" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Search for "spicy"
curl -X GET "http://localhost:5000/api/menu?search=spicy" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Search for "cheese"
curl -X GET "http://localhost:5000/api/menu?search=cheese" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

### 5. Combined Filters (Category + Search)

**Search for spicy items in Burgers category:**
```bash
curl -X GET "http://localhost:5000/api/menu?category=Burgers&search=spicy" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Search for chicken items in Pizza category:**
```bash
curl -X GET "http://localhost:5000/api/menu?category=Pizza&search=chicken" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Search for cheese items in Appetizers:**
```bash
curl -X GET "http://localhost:5000/api/menu?category=Appetizers&search=cheese" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

### 6. Get All Menu Categories (NEW! ⭐)

**Get category statistics with item counts and average prices:**

```bash
curl -X GET "http://localhost:5000/api/menu/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Response:**
```json
{
  "categories": [
    {
      "category": "Desserts",
      "totalItems": 5,
      "availableItems": 5,
      "avgPrice": 7.99
    },
    {
      "category": "Appetizers",
      "totalItems": 5,
      "availableItems": 5,
      "avgPrice": 7.29
    },
    ...
  ],
  "summary": {
    "totalCategories": 8,
    "totalItems": 39,
    "totalAvailable": 39
  }
}
```

**Pretty formatted output:**
```bash
curl -s "http://localhost:5000/api/menu/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.categories[] | {category, totalItems, avgPrice}'
```

---

## Advanced Usage Examples

### Pagination Loop (Get All Items)

```bash
#!/bin/bash
TOKEN=$(curl -s -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')

CURSOR=""
PAGE=1

while true; do
  echo "Fetching page $PAGE..."
  
  if [ -z "$CURSOR" ]; then
    RESPONSE=$(curl -s "http://localhost:5000/api/menu?limit=10" \
      -H "Authorization: Bearer $TOKEN")
  else
    RESPONSE=$(curl -s "http://localhost:5000/api/menu?cursor=$CURSOR&limit=10" \
      -H "Authorization: Bearer $TOKEN")
  fi
  
  HAS_MORE=$(echo $RESPONSE | jq -r '.pagination.hasMore')
  CURSOR=$(echo $RESPONSE | jq -r '.pagination.nextCursor')
  
  echo $RESPONSE | jq '.items[] | {name, category, price}'
  
  if [ "$HAS_MORE" != "true" ]; then
    echo "No more items!"
    break
  fi
  
  PAGE=$((PAGE + 1))
done
```

### Get Only Item Names and Prices

```bash
curl -s "http://localhost:5000/api/menu?limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | {name, price, category}'
```

### Count Items by Category

```bash
curl -s "http://localhost:5000/api/menu/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.categories | map({category, totalItems}) | sort_by(.totalItems) | reverse'
```

### Get Most Expensive Items

```bash
curl -s "http://localhost:5000/api/menu?limit=100" \
  -H "Authorization: Bearer $TOKEN" | jq '.items | sort_by(.price) | reverse | .[0:5] | .[] | {name, price, category}'
```

---

## Query Parameters Reference

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `cursor` | number | ID of last item from previous page | `?cursor=10` |
| `limit` | number | Number of items per page (default: 12) | `?limit=20` |
| `category` | string | Filter by category name | `?category=Pizza` |
| `search` | string | Search in name and description | `?search=chicken` |

---

## Response Structure

### Menu Items Response
```json
{
  "items": [
    {
      "id": 1,
      "name": "Mozzarella Sticks",
      "description": "Golden fried mozzarella with marinara sauce.",
      "price": "6.99",
      "image_url": "https://...",
      "category": "Appetizers",
      "is_available": true,
      "inventory_count": 45,
      "low_stock_threshold": 10,
      "createdAt": "2026-02-10T03:14:29.000Z",
      "updatedAt": "2026-02-10T03:14:29.000Z"
    }
  ],
  "pagination": {
    "nextCursor": 10,
    "hasMore": true,
    "limit": 10,
    "total": 39
  }
}
```

### Categories Response
```json
{
  "categories": [
    {
      "category": "Pizza",
      "totalItems": 5,
      "availableItems": 5,
      "avgPrice": 14.49
    }
  ],
  "summary": {
    "totalCategories": 8,
    "totalItems": 39,
    "totalAvailable": 39
  }
}
```

---

## Testing Script

Save this as `test-menu-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"

# Login
echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test 1: Get first page
echo "📄 Test 1: First page"
curl -s "$BASE_URL/api/menu?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.pagination'
echo ""

# Test 2: Get categories
echo "📊 Test 2: Categories"
curl -s "$BASE_URL/api/menu/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.summary'
echo ""

# Test 3: Search
echo "🔍 Test 3: Search for 'pizza'"
curl -s "$BASE_URL/api/menu?search=pizza" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | .name'
echo ""

echo "✨ Tests completed!"
```

Make it executable:
```bash
chmod +x test-menu-api.sh
./test-menu-api.sh
```

---

## Performance Optimization Notes

1. **Cursor-based pagination** is used instead of offset-based for better performance on large datasets
2. **Categories endpoint** uses a single SQL GROUP BY query instead of multiple queries
3. **Search** uses database-level ILIKE for case-insensitive matching
4. **Indexes** should be added on `category` and `is_available` columns for production

---

## Common Issues & Solutions

### Issue: "Unauthorized" error
**Solution:** Make sure you're including the Authorization header with a valid token

### Issue: Empty results
**Solution:** Check if items exist in database and `is_available` is true

### Issue: Images not loading
**Solution:** Verify the image URLs are accessible and not blocked by CORS

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | Get paginated menu items with filters |
| GET | `/api/menu/categories` | Get all categories with statistics |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |

---

**Last Updated:** 2026-02-10
**API Version:** 1.0
**Base URL:** http://localhost:5000
