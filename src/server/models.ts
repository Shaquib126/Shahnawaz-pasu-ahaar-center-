import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['Feed', 'Medicine', 'Appetite'] },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  icon: { type: String },
  imageUrl: { type: String }
}, { timestamps: true });

const cartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const customerInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String }
});

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true },
  items: [cartItemSchema],
  customerInfo: customerInfoSchema,
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['Pending Payment', 'Processing', 'Delivered'],
    default: 'Pending Payment'
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String },
  photoURL: { type: String },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Product = mongoose.model('Product', productSchema);
export const Order = mongoose.model('Order', orderSchema);
