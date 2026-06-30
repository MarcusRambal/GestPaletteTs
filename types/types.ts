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