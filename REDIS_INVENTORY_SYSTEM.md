# Redis Inventory Reservation System

## Overview

This document describes the industrial-grade inventory reservation system implemented using Redis to prevent race conditions and ensure accurate inventory management in a multi-user e-commerce environment.

## Problem Statement

In a typical e-commerce scenario, multiple users can simultaneously attempt to add the same item to their cart. Without proper synchronization, this can lead to:

1. **Race Conditions**: Two users reserving the same last item
2. **Overselling**: Selling more items than available in inventory
3. **Poor UX**: Users completing checkout only to find items are out of stock

## Solution Architecture

### Core Components

1. **Distributed Locking** (Redis SET NX)
   - Prevents concurrent modifications to the same item
   - 5-second TTL with automatic expiration
   - Retry mechanism with exponential backoff

2. **Inventory Reservations** (Redis Keys with TTL)
   - 15-minute reservation window
   - Automatic cleanup of expired reservations
   - Per-user, per-item tracking

3. **Real-time Availability Calculation**
   - `Available = Total Inventory - Sum(All Reservations) + User's Own Reservation`
   - Prevents double-counting user's existing cart items

## Technical Implementation

### Redis Key Structure

```
# Distributed Locks
lock:item:{menuItemId}
  Value: user:{userId}:{timestamp}
  TTL: 5 seconds

# Inventory Reservations
reservation:item:{menuItemId}:user:{userId}
  Value: {quantity}
  TTL: 900 seconds (15 minutes)

# Reservation Metadata
reservation:meta:user:{userId}:item:{menuItemId}
  Value: JSON{menuItemId, userId, quantity, reservedAt, expiresAt}
  TTL: 900 seconds
```

### Flow Diagrams

#### Adding Item to Cart

```
User Request → Acquire Lock (with retry)
                    ↓
              Get Current Inventory
                    ↓
         Calculate Total Reserved
                    ↓
         Check Available Inventory
                    ↓
         Update Reservation in Redis
                    ↓
         Update Cart in Database
                    ↓
              Release Lock
                    ↓
         Return Success/Failure
```

#### Concurrent User Scenario

```
Time  User A                    User B                    Inventory
----  ------------------------  ------------------------  ---------
T0    Item has 1 in stock                                1
T1    Acquires lock                                      1
T2    Checks inventory          Tries to acquire lock   1
T3    Reserves item (qty=1)     Waiting for lock...     0 (reserved)
T4    Updates cart              Lock acquired           0
T5    Releases lock             Checks inventory        0
T6                              Sees 0 available        0
T7                              Returns error           0
```

## API Integration

### Enhanced Cart Responses

#### GET /api/cart

```json
{
  "cart": {
    "items": [
      {
        "id": 1,
        "name": "Garlic Bread",
        "quantity": 3,
        "inventory_count": 80,
        "available_now": 72,           // Real-time availability
        "is_available_now": true,      // Can fulfill this order
        "availability_warning": null   // Warning if issues
      }
    ]
  }
}
```

#### POST /api/cart/items

```json
{
  "message": "Item added to cart",
  "reservation": {
    "reserved": 3,      // Quantity reserved for this user
    "available": 77     // Remaining available inventory
  }
}
```

## Key Features

### 1. Distributed Locking

**Purpose**: Prevent race conditions when multiple users access the same item

**Implementation**:
```typescript
const lockKey = `lock:item:${menuItemId}`;
const result = await redisClient.set(lockKey, lockValue, {
  NX: true,  // Only set if not exists
  EX: 5      // Expire after 5 seconds
});
```

**Benefits**:
- Atomic operations
- Automatic expiration prevents deadlocks
- Retry mechanism handles temporary failures

### 2. Temporary Reservations

**Purpose**: Hold inventory for users while they complete checkout

**TTL**: 15 minutes (configurable)

**Automatic Cleanup**: Redis automatically removes expired reservations

**Benefits**:
- No manual cleanup required
- Inventory automatically becomes available
- Prevents abandoned carts from blocking inventory

### 3. Real-time Availability

**Calculation**:
```typescript
const totalReserved = await getTotalReserved(menuItemId);
const userReservation = await getUserReservation(menuItemId, userId);
const available = inventory - totalReserved + userReservation;
```

**Benefits**:
- Accurate availability across all users
- Prevents overselling
- Users see real-time stock levels

### 4. Optimistic Concurrency Control

**Approach**: Check-then-act with distributed locking

**Retry Logic**:
- 3 retry attempts
- Exponential backoff (100ms, 200ms, 300ms)
- Graceful failure with user-friendly messages

## Error Handling

### Insufficient Inventory

```json
{
  "message": "Insufficient inventory",
  "available": 2,
  "reserved": 8,
  "currentInCart": 3
}
```

### Lock Acquisition Failure

```json
{
  "message": "Unable to acquire lock. Please try again."
}
```

### Item Unavailable

```json
{
  "message": "Item is not available"
}
```

## Performance Considerations

### Redis Operations

- **Average Lock Acquisition**: < 5ms
- **Reservation Update**: < 10ms
- **Availability Check**: < 15ms (with pattern scan)

### Optimization Strategies

1. **Connection Pooling**: Reuse Redis connections
2. **Pipeline Commands**: Batch Redis operations
3. **Lazy Loading**: Import reservation service only when needed
4. **Caching**: Cache frequently accessed inventory data

## Monitoring & Observability

### Key Metrics to Track

1. **Lock Contention**
   - Number of lock acquisition failures
   - Average retry count
   - Lock wait time

2. **Reservation Stats**
   - Total active reservations
   - Average reservation duration
   - Expired reservation rate

3. **Inventory Accuracy**
   - Oversell incidents (should be 0)
   - Reservation vs actual sales ratio
   - Stock-out frequency

### Redis Monitoring Commands

```bash
# View all reservations for an item
redis-cli --scan --pattern "reservation:item:84:*"

# Get total reserved for an item
redis-cli --scan --pattern "reservation:item:84:user:*" | \
  xargs redis-cli mget | \
  awk '{sum+=$1} END {print sum}'

# Check active locks
redis-cli --scan --pattern "lock:item:*"

# Monitor reservation expiration
redis-cli --scan --pattern "reservation:*" | \
  xargs redis-cli ttl
```

## Testing

### Unit Tests

```bash
# Test distributed locking
npm test -- inventoryReservation.test.ts

# Test race conditions
npm test -- raceCondition.test.ts
```

### Integration Tests

```bash
# Run comprehensive Redis inventory tests
./test-redis-inventory.sh
```

### Load Testing

```bash
# Simulate 100 concurrent users
artillery run load-test-inventory.yml
```

## Failure Scenarios & Recovery

### Redis Connection Loss

**Behavior**: Graceful degradation
- System logs warning
- Falls back to database-only inventory check
- Reduced race condition protection

**Recovery**: Automatic reconnection on Redis availability

### Lock Timeout

**Scenario**: Process crashes while holding lock

**Recovery**: Automatic lock expiration after 5 seconds

### Reservation Expiry

**Scenario**: User abandons cart

**Recovery**: Automatic cleanup after 15 minutes

## Best Practices

### 1. Always Release Locks

```typescript
try {
  lockAcquired = await acquireLock(itemId, userId);
  // ... perform operations
} finally {
  if (lockAcquired) {
    await releaseLock(itemId);
  }
}
```

### 2. Set Appropriate TTLs

- **Locks**: Short (5s) - Just enough for operation
- **Reservations**: Medium (15min) - Typical checkout time
- **Metadata**: Same as reservations for consistency

### 3. Handle Redis Failures Gracefully

```typescript
try {
  await redisClient.ping();
  return true;
} catch (error) {
  console.warn('Redis unavailable, using fallback');
  return false;
}
```

### 4. Clean Up on Order Completion

```typescript
// When order is placed
await clearUserReservations(userId);
await decrementInventory(items);
```

## Configuration

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
LOCK_TTL=5              # seconds
RESERVATION_TTL=900     # seconds (15 minutes)
```

### Tuning Parameters

- **Lock TTL**: Increase if operations take longer
- **Reservation TTL**: Adjust based on checkout flow
- **Retry Count**: Increase for high-contention items
- **Backoff Strategy**: Tune for your traffic patterns

## Security Considerations

1. **Lock Value Uniqueness**: Includes userId and timestamp
2. **TTL Protection**: Prevents indefinite locks
3. **User Isolation**: Each user's reservations are separate
4. **Atomic Operations**: Uses Redis atomic commands

## Future Enhancements

1. **Priority Reservations**: VIP users get preference
2. **Reservation Transfer**: Move items between users
3. **Bulk Operations**: Reserve multiple items atomically
4. **Analytics**: Track reservation patterns
5. **Dynamic TTL**: Adjust based on item popularity

## Troubleshooting

### Issue: Items showing as unavailable but inventory exists

**Cause**: Stale reservations

**Solution**:
```bash
# Clear all reservations (use with caution)
redis-cli --scan --pattern "reservation:*" | xargs redis-cli del
```

### Issue: Lock acquisition always fails

**Cause**: Deadlock or stuck lock

**Solution**:
```bash
# Clear all locks
redis-cli --scan --pattern "lock:*" | xargs redis-cli del
```

### Issue: High memory usage in Redis

**Cause**: Too many reservations

**Solution**:
- Reduce RESERVATION_TTL
- Implement reservation cleanup job
- Monitor and alert on reservation count

## Conclusion

This Redis-based inventory reservation system provides:

✅ **Race Condition Prevention**: Distributed locking ensures atomic operations
✅ **Real-time Accuracy**: Live inventory tracking across all users
✅ **Automatic Cleanup**: TTL-based expiration prevents stale data
✅ **Scalability**: Redis handles high concurrency efficiently
✅ **Reliability**: Graceful degradation on failures

The system follows industry best practices and is production-ready for high-traffic e-commerce applications.
