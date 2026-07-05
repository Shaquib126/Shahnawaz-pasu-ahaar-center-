import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Razorpay from "razorpay";
import crypto from "crypto";

import mongoose from "mongoose";
import { Product, Order, User, PushSubscription, SystemConfig } from "./src/server/models";
import webpush from "web-push";

// Configure VAPID details for Push Notifications
let vapidPublicKey: string | null = null;
async function configureVapid() {
  if (!process.env.MONGODB_URI) {
    console.log("No MONGODB_URI. Skipping VAPID configuration.");
    return;
  }
  
  try {
    let vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      // Look in DB
      const dbConfig = await SystemConfig.findOne({ key: "vapid_keys" });
      if (dbConfig && dbConfig.value && dbConfig.value.publicKey) {
        vapidKeys = dbConfig.value;
        console.log("Using persistent VAPID keys from Database");
      } else {
        // Generate new keys
        const generated = webpush.generateVAPIDKeys();
        vapidKeys = {
          publicKey: generated.publicKey,
          privateKey: generated.privateKey
        };
        const newConfig = new SystemConfig({
          key: "vapid_keys",
          value: vapidKeys
        });
        await newConfig.save();
        console.log("Generated and saved new VAPID keys to Database");
      }
    } else {
      console.log("Using VAPID keys from Environment Variables");
    }

    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:saqibjamal723@gmail.com";
    webpush.setVapidDetails(
      vapidSubject,
      vapidKeys.publicKey!,
      vapidKeys.privateKey!
    );
    
    vapidPublicKey = vapidKeys.publicKey || null;
    console.log("VAPID details set successfully.");
  } catch (err) {
    console.error("Error configuring VAPID:", err);
  }
}

// Send push notification to matching subscriptions
async function sendPushNotification(email: string, payload: any) {
  if (!process.env.MONGODB_URI) return;
  try {
    // Find subscriptions for this email, or unsubscribed/anonymous endpoints during testing
    const query = email 
      ? { $or: [{ email: email.toLowerCase() }, { email: "" }, { email: null }] } 
      : {};
      
    const subscriptions = await PushSubscription.find(query);
    console.log(`Found ${subscriptions.length} push subscriptions matching email: ${email}`);

    const payloadString = JSON.stringify(payload);
    
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, payloadString);
        console.log(`Successfully sent push notification to: ${sub.endpoint}`);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Subscription expired/revoked. Removing: ${sub.endpoint}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error(`Error sending push to ${sub.endpoint}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error("Error in sendPushNotification:", err);
  }
}

// Lazy initialization of Razorpay client
let razorpayClient: Razorpay | null = null;
function getRazorpay() {
  if (!razorpayClient) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay keys are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected to MongoDB successfully");
      await configureVapid();
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  } else {
    console.log("MONGODB_URI not found. Skipping MongoDB connection.");
  }

  app.use(express.json());

  // --- MongoDB API Routes ---

  // Get VAPID public key for web push subscription
  app.get("/api/notifications/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  // Subscribe to web push notifications
  app.post("/api/notifications/subscribe", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const { subscription, email, firebaseUid } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription details" });
      }
      
      const updated = await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { 
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          email: email ? email.toLowerCase() : undefined,
          firebaseUid: firebaseUid || undefined
        },
        { upsert: true, new: true }
      );
      
      res.status(201).json({ success: true, subscription: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sync User
  app.post("/api/users/sync", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const { uid, email, displayName, photoURL } = req.body;
      let user = await User.findOne({ firebaseUid: uid });
      if (!user) {
        user = new User({ firebaseUid: uid, email, displayName, photoURL });
        await user.save();
      } else {
        user.email = email;
        user.displayName = displayName;
        user.photoURL = photoURL;
        await user.save();
      }
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all products
  app.get("/api/products", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.json([]);
    try {
      const products = await Product.find().lean();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a product
  app.post("/api/products", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const product = new Product(req.body);
      await product.save();
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update a product
  app.put("/api/products/:id", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a product
  app.delete("/api/products/:id", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all orders
  app.get("/api/orders", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.json([]);
    try {
      const email = req.query.email;
      const query = typeof email === 'string' ? { "customerInfo.email": email } : {};
      const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get a single order by public ID
  app.get("/api/orders/:id", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const orderId = req.params.id.trim().toUpperCase();
      const order = await Order.findOne({ id: orderId }).lean();
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create an order
  app.post("/api/orders", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const order = new Order(req.body);
      await order.save();
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const orderId = req.params.id;
      const newStatus = req.body.status;

      // Find the existing order first to check previous status
      let existingOrder = await Order.findOne({ id: orderId });
      if (!existingOrder && mongoose.Types.ObjectId.isValid(orderId)) {
        existingOrder = await Order.findById(orderId);
      }

      const previousStatus = existingOrder ? existingOrder.status : null;

      // Now perform the update
      let order = await Order.findOneAndUpdate({ id: orderId }, { status: newStatus }, { new: true });
      if (!order && mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });
      }

      if (order && previousStatus === 'Processing' && newStatus === 'Shipped') {
        const customerEmail = order.customerInfo?.email;
        console.log(`Order status transitioned from Processing to Shipped for order #${order.id}. Sending push notification...`);
        
        await sendPushNotification(customerEmail, {
          title: "Order Shipped! 🚚",
          body: `Good news! Your order #${order.id} has been shipped and is on its way.`,
          icon: "/icon.png",
          badge: "/icon.png",
          data: {
            orderId: order.id,
            status: "Shipped"
          }
        });
      }

      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete an order (Cancel / Remove order from DB)
  app.delete("/api/orders/:id", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      let result = await Order.findOneAndDelete({ id: req.params.id });
      if (!result && mongoose.Types.ObjectId.isValid(req.params.id)) {
        result = await Order.findByIdAndDelete(req.params.id);
      }
      res.json({ success: true, deleted: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { items, orderId, totalAmount } = req.body;
      
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        // Fallback for preview environments without Razorpay configured
        console.log("RAZORPAY keys not found. Using mock checkout.");
        return res.json({ id: "mock_session", amount: totalAmount * 100, currency: "INR" });
      }

      const razorpay = getRazorpay();
      
      const options = {
        amount: Math.round(totalAmount * 100), // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_${orderId || Date.now()}`
      };
      
      const order = await razorpay.orders.create(options);
      
      // Link this Razorpay Order ID to our local order if it was already created as Pending Payment
      if (orderId && process.env.MONGODB_URI) {
        const updatedOrder = await Order.findOneAndUpdate(
          { id: orderId },
          { razorpayOrderId: order.id },
          { new: true }
        );
        if (updatedOrder) {
          console.log(`Associated Razorpay order ID ${order.id} with local database order ID ${orderId}`);
        } else {
          console.log(`Could not find local order ${orderId} to associate Razorpay order ID ${order.id}`);
        }
      }
      
      res.json({ id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
    } catch (error: any) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Verify Razorpay payment signature securely on the server
  app.post("/api/verify-payment", async (req, res) => {
    if (!process.env.MONGODB_URI) return res.status(400).json({ error: "DB not connected" });
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
      
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return res.status(500).json({ error: "Razorpay secret not configured" });
      }

      // Generate the expected signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        console.log(`Razorpay payment signature verified successfully for order: ${orderId}`);
        
        // Find order and update status to 'Processing'
        let order = await Order.findOneAndUpdate(
          { id: orderId },
          { 
            status: 'Processing', 
            razorpayOrderId: razorpay_order_id, 
            razorpayPaymentId: razorpay_payment_id 
          },
          { new: true }
        );

        if (!order) {
          // Attempt to find by Razorpay order ID if public ID was not found or mismatched
          order = await Order.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            { 
              status: 'Processing', 
              razorpayPaymentId: razorpay_payment_id 
            },
            { new: true }
          );
        }

        if (order) {
          console.log(`Successfully updated Order #${order.id} to Processing after secure server verification`);
          res.json({ success: true, order });
        } else {
          console.warn(`Signature is valid but could not locate matching order in DB for orderId: ${orderId} or razorpayOrderId: ${razorpay_order_id}`);
          res.status(404).json({ error: "Signature verified but matching database order not found" });
        }
      } else {
        console.error(`Razorpay signature verification failed for order ${orderId}. Expected ${expectedSignature} but got ${razorpay_signature}`);
        res.status(400).json({ error: "Invalid payment signature" });
      }
    } catch (err: any) {
      console.error("Error in verify-payment endpoint:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Handle Razorpay direct webhooks (e.g. for payments processed in background or tab closure)
  app.post("/api/payment-webhook", express.json(), async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (webhookSecret) {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(req.body))
          .digest("hex");

        if (expectedSignature !== signature) {
          console.error("Invalid webhook signature received");
          return res.status(400).json({ error: "Invalid signature" });
        }
      } else {
        console.log("No RAZORPAY_WEBHOOK_SECRET configured. Proceeding with event execution without verification.");
      }

      const event = req.body.event;
      console.log(`Received Razorpay webhook event: ${event}`);

      if (event === "payment.captured") {
        const paymentEntity = req.body.payload.payment.entity;
        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;

        // Find the corresponding order and update status to 'Processing'
        const order = await Order.findOneAndUpdate(
          { razorpayOrderId: razorpayOrderId },
          { status: 'Processing', razorpayPaymentId: razorpayPaymentId },
          { new: true }
        );
        
        if (order) {
          console.log(`Webhook updated Order #${order.id} status to Processing (payment captured)`);
        } else {
          console.warn(`No order found matching Razorpay Order ID: ${razorpayOrderId}`);
        }
      }

      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Error in webhook handler:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
