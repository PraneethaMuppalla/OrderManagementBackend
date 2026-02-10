# Authentication cURL Commands

## 1. Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone_number": "1234567890"
  }'
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

---

## 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

**💡 Save the token for authenticated requests!**

---

## 3. Using the Token

For all authenticated endpoints, add the Authorization header:

```bash
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Example - Get Cart:**
```bash
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Quick Test Flow

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123"}'

# 2. Login and save token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | jq -r '.token')

# 3. Use token
echo "Your token: $TOKEN"

# 4. Test authenticated endpoint
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Errors

### 400 Bad Request
- Missing required fields
- Invalid email format
- Password too short (< 6 characters)

### 401 Unauthorized
- Missing Authorization header
- Invalid or expired token

### 409 Conflict (on register)
- Email already exists

---

## Testing Tips

1. **Install jq for pretty JSON output:**
   ```bash
   sudo apt-get install jq  # Ubuntu/Debian
   ```

2. **Save token to variable:**
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test123"}' | jq -r '.token')
   ```

3. **Use the token:**
   ```bash
   curl http://localhost:5000/api/cart -H "Authorization: Bearer $TOKEN"
   ```
