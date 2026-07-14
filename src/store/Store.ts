console.log("antes del import de los tipados")
import { Product, Category, CartItem } from "../../types/types.js";


export interface AppState {
  //Router
  currentScreen: "home" | "balance" | "create" | "editDelete"; // Puedes limitar las pantallas válidas aquí

  //Products and Search
  productsCatalog: Product[];
  filteredCatalog: Product[];
  searchQuery: string;
  categoriesCatalog: Category[]; 
  selectedCategory: string;
  selectedProductForEdit: Product | null;
  
  //Table
  selectedProducts:CartItem[];

  //Checkout
  paymentMethod: 'efectivo' | 'tarjeta' | 'hibrido';
  amountCash: number;  // Cuánto paga en efectivo
  amountCard: number;  // Cuánto paga con tarjeta

  focusedProductIndex: number; // -1 significa ninguno, 0 el primero, 1 el segundo, etc.
  triggerSelectProduct: boolean; // Un flag/gatillo para avisar que se presionó Enter


  colors: string[];
  facturasCargadas: any[]; 
  
}

// Definimos el tipo para las funciones suscriptoras
type SubscriberCallback = (state: AppState) => void;

class Store {
  // En TS debemos declarar las propiedades antes del constructor
  private state: AppState;
  private subscribers: SubscriberCallback[] = [];

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  // Obtener el estado (retorna el tipo AppState estricto)
  get(): AppState {
    return this.state;
  }

  // Registrar un componente para escuchar los cambios
  subscribe(callback: SubscriberCallback): () => void {
  this.subscribers.push(callback);
  
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
      console.log("Store: Suscripción removida exitosamente.");
    };
  }

  // Modificar el estado usando Partial para permitir cambios parciales
  update(nuevoFragmento: Partial<AppState>): void {    
    //Evitar spam si la pantalla no cambia al boton
    if (nuevoFragmento.currentScreen && nuevoFragmento.currentScreen === this.state.currentScreen) {
      console.log(`Store: La pantalla "${nuevoFragmento.currentScreen}" ya está activa, evitando actualización innecesaria.`);
    return; 
  }
    this.state = { ...this.state, ...nuevoFragmento };
      
    console.log("Store: Estado actualizado:", this.state);
    // Notificar a cada componente suscrito
    this.subscribers.forEach(callback => callback(this.state));
  }


  // 🎯 NUEVO MÉTODO: Manejo inteligente del Carrito de Compras
  addProductToCart(product: Product): void {
    // 1. Clonamos el array actual del carrito para respetar la inmutabilidad de JS
    const currentCart = [...this.state.selectedProducts];

    // 2. Buscamos si el producto ya existe en el carrito usando su ID de SQLite
    const existingItemIndex = currentCart.findIndex(item => item.product.id === product.id);

    if (existingItemIndex !== -1) {
      // 🚀 SI YA EXISTE: Clonamos el ítem e incrementamos su cantidad (cantidad + 1)
      currentCart[existingItemIndex] = {
        ...currentCart[existingItemIndex],
        quantity: currentCart[existingItemIndex].quantity + 1
      };
      console.log(`Store: Incrementando cantidad para ${product.name}. Nueva cantidad: ${currentCart[existingItemIndex].quantity}`);
    } else {
      // ✨ SI ES NUEVO: Lo agregamos al array con cantidad inicial de 1
      currentCart.push({
        product: product,
        quantity: 1
      });
      console.log(`Store: Agregando nuevo producto al carrito: ${product.name}`);
    }

    // 3. Despachamos el nuevo carrito usando el método update existente
    this.update({ selectedProducts: currentCart });
  }

  decreaseProductQuantity(productId: number): void {
  const currentCart = [...this.state.selectedProducts];
  const itemIndex = currentCart.findIndex(item => item.product.id === productId);

  if (itemIndex === -1) return;

  const currentQuantity = currentCart[itemIndex].quantity;

  if (currentQuantity > 1) {
    // Restamos 1 de forma inmutable
    currentCart[itemIndex] = {
      ...currentCart[itemIndex],
      quantity: currentQuantity - 1
    };
    console.log(`Store: Se restó 1 unidad a Producto ID ${productId}`);
  } else {
    // Si era el último, removemos la fila del array
    currentCart.splice(itemIndex, 1);
    console.log(`Store: Producto ID ${productId} removido por llegar a 0 unidades.`);
  }

  this.update({ selectedProducts: currentCart });
}

  /**
   * Elimina por completo un producto del carrito sin importar la cantidad acumulada.
   */
  removeProductFromCart(productId: number): void {
    const currentCart = this.state.selectedProducts.filter(item => item.product.id !== productId);
    console.log(`Store: Producto ID ${productId} eliminado por completo del carrito.`);
    this.update({ selectedProducts: currentCart });
  }

}

// Instancia única para toda la aplicación (Singleton)
export const storeGlobal = new Store({
  currentScreen: "home",
  productsCatalog: [],
  filteredCatalog: [],
  searchQuery: "",
  selectedCategory: "",
  categoriesCatalog: [],
  facturasCargadas: [],
  selectedProducts: [],
  selectedProductForEdit: null,
  paymentMethod: 'efectivo',
  amountCash: 0,
  amountCard: 0,
  focusedProductIndex: -1,
  triggerSelectProduct: false,
  colors: [
  "cat-strawberry", "cat-raspberry", "cat-blackberry", "cat-cherry", "cat-watermelon", "cat-bubblegum",
  "cat-mango", "cat-passion", "cat-lemon", "cat-banana", "cat-lime", "cat-mint", "cat-kiwi", "cat-pistachio",
  "cat-chocolate", "cat-nut", "cat-caramel", "cat-coffee", "cat-vanilla", "cat-coconut",
  "cat-blueberry", "cat-sky", "cat-turquoise", "cat-grape", "cat-lavender", "cat-cyan", "cat-denim", "cat-plum",
  "cat-slate", "cat-charcoal"]
});