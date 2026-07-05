import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Razorpay from "razorpay";

import mongoose from "mongoose";
import { Product, Order, User } from "./src/server/models";

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
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  } else {
    console.log("MONGODB_URI not found. Skipping MongoDB connection.");
  }

  app.use(express.json());

  // --- MongoDB API Routes ---

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
      let order = await Order.findOneAndUpdate({ id: req.params.id }, { status: req.body.status }, { new: true });
      if (!order && mongoose.Types.ObjectId.isValid(req.params.id)) {
        order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
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
      
      res.json({ id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
    } catch (error: any) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
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
