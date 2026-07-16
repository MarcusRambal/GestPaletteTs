console.log('en el import de tipados')
export interface Product {
  id: number;
  name: string;
  category_name: string;
  category_id:number;
  price: number;
  active: number; // 1 para activo, 0 para inactivo
}


export interface Category {
  id: number;
  name: string;
  color:string;
}


export interface CartItem {
  product: Product;
  quantity: number;
}

export interface InvoiceItem {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Invoice {
  total: number;
  payment_method: 'efectivo' | 'tarjeta' | 'hibrido';
  cash_amount: number;      
  transfer_amount: number; 
  cash_received: number;    
  items: InvoiceItem[];     // Usamos el tipo individual definido arriba
}