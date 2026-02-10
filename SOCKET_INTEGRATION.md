# WebSocket Integration Guide

This guide explains how to connect to the WebSocket server for real-time order updates.

## Connection

Connect to the Socket.IO server using the same base URL as the API (`http://localhost:5000`).

### Authentication
You must provide the JWT token in the handshake auth object.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: "YOUR_JWT_TOKEN"
  }
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});
```

## Events

### Client Events (Received by User)

#### 1. `order_status_update`
Triggered when an admin updates the status of your order.

**Payload:**
```json
{
  "orderId": 123,
  "status": "Preparing",
  "updatedAt": "2026-02-10T12:00:00.000Z",
  "message": "Order #123 placed successfully!" // optional message
}
```

**Example Usage:**
```javascript
socket.on("order_status_update", (data) => {
  console.log(`Order #${data.orderId} status updated to: ${data.status}`);
  // Update UI toast or notification
});
```

### Admin Events (Received by Admin)

#### 1. `new_order`
Triggered when a new order is placed by any user.

**Payload:**
```json
{
  "orderId": 123,
  "userId": 456,
  "total_amount": 29.99,
  "items": 3
}
```

**Example Usage:**
```javascript
socket.on("new_order", (data) => {
  console.log(`New order #${data.orderId} received! Total: ${data.total_amount}`);
  // Play sound or show alert
});
```

## Rooms

-   **User Room**: Each authenticated user automatically joins a room named `user_{userId}`.
-   **Admin Room**: Users with `role: 'admin'` automatically join `admin_room`.

## Troubleshooting

-   Ensure the JWT token is valid and not expired.
-   Check server logs for "User connected" or "Authentication error".
-   If using local dev with default self-signed certs (if HTTPS enabled), allow insecure connections or use HTTP.
