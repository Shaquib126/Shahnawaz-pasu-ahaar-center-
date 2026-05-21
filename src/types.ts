export type Category = 'Feed' | 'Medicine' | 'Appetite';

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  price: number;
  stock: number;
  icon?: string;
  imageUrl?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
