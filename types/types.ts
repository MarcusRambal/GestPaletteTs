export interface Product {
  id: number;
  name: string;
  category_name: string;
  price: number;
  active: number; // 1 para activo, 0 para inactivo
}


export interface Category {
  id: number;
  name: string;
}


export interface CartItem {
  product: Product;
  quantity: number;
}