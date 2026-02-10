import redisClient from '../config/redis';
import { MenuItem } from '../models';

/**
 * Inventory Reservation Service
 * 
 * This service implements distributed inventory management using Redis to prevent
 * race conditions when multiple users try to add the same item to their cart.
 */

const LOCK_TTL = 5; // Lock expires after 5 seconds
const RESERVATION_TTL = 900; // Reservations expire after 15 minutes (900 seconds)

interface ReservationResult {
  success: boolean;
  message?: string;
  available?: number;
  reserved?: number;
}

/**
 * Acquire a distributed lock for an item
 */
async function acquireLock(menuItemId: number, userId: number): Promise<boolean> {
  try {
    const lockKey = `lock:item:${menuItemId}`;
    const lockValue = `user:${userId}:${Date.now()}`;
    
    // SET NX (only if not exists) with expiration
    const result = await redisClient.set(lockKey, lockValue, {
      NX: true,
      EX: LOCK_TTL
    });
    
    return result === 'OK';
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
}

/**
 * Release a distributed lock
 */
async function releaseLock(menuItemId: number): Promise<void> {
  try {
    const lockKey = `lock:item:${menuItemId}`;
    await redisClient.del(lockKey);
  } catch (error) {
    console.error('Error releasing lock:', error);
  }
}

/**
 * Get total reserved quantity for an item across all users
 */
async function getTotalReserved(menuItemId: number): Promise<number> {
  try {
    const pattern = `reservation:item:${menuItemId}:user:*`;
    const keys = await redisClient.keys(pattern);
    
    if (keys.length === 0) return 0;
    
    const values = await Promise.all(
      keys.map(key => redisClient.get(key))
    );
    
    return values.reduce((sum, val) => sum + (parseInt(val || '0', 10)), 0);
  } catch (error) {
    console.error('Error getting total reserved:', error);
    return 0;
  }
}

/**
 * Get reserved quantity for a specific user
 */
async function getUserReservation(menuItemId: number, userId: number): Promise<number> {
  try {
    const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
    const reserved = await redisClient.get(reservationKey);
    return parseInt(reserved || '0', 10);
  } catch (error) {
    console.error('Error getting user reservation:', error);
    return 0;
  }
}

/**
 * Reserve inventory for a user
 */
export async function reserveInventory(
  menuItemId: number,
  userId: number,
  quantity: number
): Promise<ReservationResult> {
  let lockAcquired = false;
  
  try {
    // Step 1: Acquire distributed lock with retry mechanism
    let retries = 3;
    while (retries > 0 && !lockAcquired) {
      lockAcquired = await acquireLock(menuItemId, userId);
      if (!lockAcquired) {
        retries--;
        if (retries > 0) {
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
        }
      }
    }
    
    if (!lockAcquired) {
      return {
        success: false,
        message: 'Unable to acquire lock. Please try again.'
      };
    }
    
    // Step 2: Get current inventory from database
    const menuItem = await MenuItem.findByPk(menuItemId);
    if (!menuItem) {
      return {
        success: false,
        message: 'Menu item not found'
      };
    }
    
    if (!menuItem.is_available) {
      return {
        success: false,
        message: 'Item is not available'
      };
    }
    
    // Step 3: Calculate available inventory
    const totalReserved = await getTotalReserved(menuItemId);
    const currentUserReservation = await getUserReservation(menuItemId, userId);
    const availableInventory = menuItem.inventory_count - totalReserved + currentUserReservation;
    
    // Step 4: Check if enough inventory is available
    if (availableInventory < quantity) {
      return {
        success: false,
        message: 'Insufficient inventory',
        available: Math.max(0, availableInventory),
        reserved: totalReserved
      };
    }
    
    // Step 5: Update reservation in Redis
    const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
    await redisClient.set(reservationKey, quantity.toString(), {
      EX: RESERVATION_TTL
    });
    
    // Step 6: Store reservation metadata for tracking
    const metadataKey = `reservation:meta:user:${userId}:item:${menuItemId}`;
    await redisClient.set(metadataKey, JSON.stringify({
      menuItemId,
      userId,
      quantity,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + RESERVATION_TTL * 1000).toISOString()
    }), {
      EX: RESERVATION_TTL
    });
    
    return {
      success: true,
      message: 'Inventory reserved successfully',
      available: availableInventory - quantity,
      reserved: quantity
    };
    
  } catch (error) {
    console.error('Error reserving inventory:', error);
    return {
      success: false,
      message: 'Error reserving inventory'
    };
  } finally {
    if (lockAcquired) {
      await releaseLock(menuItemId);
    }
  }
}

/**
 * Release inventory reservation for a user
 */
export async function releaseReservation(
  menuItemId: number,
  userId: number
): Promise<void> {
  try {
    const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
    const metadataKey = `reservation:meta:user:${userId}:item:${menuItemId}`;
    
    await Promise.all([
      redisClient.del(reservationKey),
      redisClient.del(metadataKey)
    ]);
  } catch (error) {
    console.error('Error releasing reservation:', error);
  }
}

/**
 * Update reservation quantity for a user
 */
export async function updateReservation(
  menuItemId: number,
  userId: number,
  newQuantity: number
): Promise<ReservationResult> {
  if (newQuantity === 0) {
    await releaseReservation(menuItemId, userId);
    return {
      success: true,
      message: 'Reservation released'
    };
  }
  return await reserveInventory(menuItemId, userId, newQuantity);
}

/**
 * Get all reservations for a user
 */
export async function getUserReservations(userId: number): Promise<Map<number, number>> {
  try {
    const pattern = `reservation:item:*:user:${userId}`;
    const keys = await redisClient.keys(pattern);
    
    const reservations = new Map<number, number>();
    
    for (const key of keys) {
      const match = key.match(/reservation:item:(\d+):user:\d+/);
      if (match) {
        const menuItemId = parseInt(match[1], 10);
        const quantity = await redisClient.get(key);
        if (quantity) {
          reservations.set(menuItemId, parseInt(quantity, 10));
        }
      }
    }
    
    return reservations;
  } catch (error) {
    console.error('Error getting user reservations:', error);
    return new Map();
  }
}

/**
 * Clear all reservations for a user
 */
export async function clearUserReservations(userId: number): Promise<void> {
  try {
    const pattern = `reservation:*:user:${userId}*`;
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Error clearing user reservations:', error);
  }
}

/**
 * Get available inventory considering reservations
 */
export async function getAvailableInventory(menuItemId: number): Promise<number> {
  try {
    const menuItem = await MenuItem.findByPk(menuItemId);
    if (!menuItem) return 0;
    
    const totalReserved = await getTotalReserved(menuItemId);
    return Math.max(0, menuItem.inventory_count - totalReserved);
  } catch (error) {
    console.error('Error getting available inventory:', error);
    return 0;
  }
}

/**
 * Verify if a user has a valid reservation for the given quantity
 */
export async function verifyReservation(
  menuItemId: number,
  userId: number,
  quantity: number
): Promise<boolean> {
  try {
    const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
    const reservedQuantityStr = await redisClient.get(reservationKey);
    
    if (!reservedQuantityStr) return false;
    
    const reservedQuantity = parseInt(reservedQuantityStr, 10);
    return reservedQuantity >= quantity;
  } catch (error) {
    console.error('Error verifying reservation:', error);
    return false;
  }
}

/**
 * Atomically consume a reservation
 */
export async function consumeReservation(
  menuItemId: number,
  userId: number,
  quantity: number
): Promise<boolean> {
  const script = `
    local key = KEYS[1]
    local requiredQty = tonumber(ARGV[1])
    local currentQty = redis.call('GET', key)
    
    if not currentQty then
      return 0
    end
    
    if tonumber(currentQty) >= requiredQty then
      redis.call('DEL', key)
      return 1
    else
      return 0
    end
  `;

  try {
    const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
    const result = await redisClient.eval(script, {
      keys: [reservationKey],
      arguments: [quantity.toString()]
    });
    
    return result === 1;
  } catch (error) {
    console.error('Error consuming reservation:', error);
    return false;
  }
}

/**
 * Refresh the TTL of an existing reservation
 */
export async function refreshReservation(
  menuItemId: number,
  userId: number
): Promise<boolean> {
  const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
  const metaKey = `reservation:meta:user:${userId}:item:${menuItemId}`;
  
  const exists = await redisClient.exists(reservationKey);
  if (!exists) return false;

  await redisClient.expire(reservationKey, RESERVATION_TTL);
  await redisClient.expire(metaKey, RESERVATION_TTL);
  
  return true;
}

export type ReconciliationResult = 
  | { status: 'active', quantity: number }
  | { status: 'restored', quantity: number }
  | { status: 'adjusted', quantity: number }
  | { status: 'removed', quantity: 0 };

/**
 * Reconcile a cart item's reservation status.
 */
export async function reconcileCartItemReservation(
  menuItemId: number,
  userId: number,
  requestedQuantity: number
): Promise<ReconciliationResult> {
  // 1. Try to refresh existing
  const refreshed = await refreshReservation(menuItemId, userId);
  if (refreshed) {
    return { status: 'active', quantity: requestedQuantity };
  }

  // 2. Reservation missing/expired. Attempt to re-reserve.
  const lockKey = `lock:item:${menuItemId}`;
  
  // Try to acquire lock with retry mechanism
  let lockAcquired = false;
  let retries = 3;
  while (retries > 0 && !lockAcquired) {
    lockAcquired = await acquireLock(menuItemId, userId);
    if (!lockAcquired) {
      retries--;
      if (retries > 0) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
      }
    }
  }
  
  if (!lockAcquired) {
    // If we can't acquire lock, we assume high contention or system issue.
    // We remove item to be safe, as per requirements.
    return { status: 'removed', quantity: 0 };
  }

  try {
    const menuItem = await MenuItem.findByPk(menuItemId);
    
    if (!menuItem || !menuItem.is_available) {
      return { status: 'removed', quantity: 0 };
    }

    const totalReserved = await getTotalReserved(menuItemId);
    const available = menuItem.inventory_count - totalReserved;
    
    let quantityToReserve = 0;
    let status: ReconciliationResult['status'] = 'removed';

    if (available >= requestedQuantity) {
      quantityToReserve = requestedQuantity;
      status = 'restored';
    } else if (available > 0) {
      quantityToReserve = available;
      status = 'adjusted';
    } else {
      return { status: 'removed', quantity: 0 };
    }

    const reservationKey = `reservation:item:${menuItemId}:user:${userId}`;
    await redisClient.set(reservationKey, quantityToReserve.toString(), {
      EX: RESERVATION_TTL
    });
    
    const metadataKey = `reservation:meta:user:${userId}:item:${menuItemId}`;
    await redisClient.set(metadataKey, JSON.stringify({
      menuItemId,
      userId,
      quantity: quantityToReserve,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + RESERVATION_TTL * 1000).toISOString()
    }), {
      EX: RESERVATION_TTL
    });

    return { status, quantity: quantityToReserve };

  } catch (err) {
    console.error(`Reconciliation error for item ${menuItemId}:`, err);
    return { status: 'removed', quantity: 0 };
  } finally {
    await redisClient.del(lockKey);
  }
}

/**
 * Health check for Redis connection
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    return false;
  }
}
