import { storeGlobal } from "../../../store/Store.js"
import type { CartItem } from "../../../../types/types.js";

export class Table {

    private listElement: HTMLDivElement | null = null;
    private unsubscribeStore: (() => void) | null = null;


    constructor () {

    }


    render(subContainer: HTMLElement): void {
    subContainer.innerHTML = `
      <div class="selectedProducts-container">
        <div class="selectedProducts-list" id="selectedProducts-list">
          <p class="loading">No hay Productos seleccionados</p>
        </div>
      </div>
    `;

    // Capturamos el contenedor específico donde se inyectarán las filas
    this.listElement = subContainer.querySelector('#selectedProducts-list');

    if (this.listElement) {
      // 1. Render inicial con lo que tenga el Store en ese momento
      this.renderCartItems(storeGlobal.get().selectedProducts);

      // 2. Nos suscribimos a los cambios del Store para re-renderizar reactivamente
      this.unsubscribeStore = storeGlobal.subscribe((state) => {
        // Alerta de ciclo de vida (SPA): Si cambiamos de pestaña, nos auto-destruimos
        if (state.currentScreen !== 'home') {
          this.destroy();
          return;
        }
        
        this.renderCartItems(state.selectedProducts);
      });
    } else {
      console.error("Table Component Error: No se encontró el contenedor '#selectedProducts-list' en el DOM.");
    }
  }

  private renderCartItems(cartItems: CartItem[]): void {
    if (!this.listElement) return;

    // Si el carrito está vacío, mostramos el mensaje por defecto
    if (cartItems.length === 0) {
      this.listElement.innerHTML = `<p class="loading">No hay Productos seleccionados</p>`;
      return;
    }

    // Limpiamos el contenedor antes de repintar
    this.listElement.innerHTML = '';

    // En tu archivo Table.ts, dentro del método renderCartItems:

    cartItems.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'cart-item-row';
        
        const subtotal = item.product.price * item.quantity;

        // Modificamos el HTML para incluir los botones interactivos
        itemRow.innerHTML = `
            <div class="cart-item-info">
            <span class="cart-item-name">${item.product.name}</span>
            <span class="cart-item-category">${item.product.category_name}</span>
            </div>
            <div class="cart-item-quantity-box">
            <button class="btn-cart-action decrease-btn" data-id="${item.product.id}">-</button>
            <span class="cart-item-quantity">${item.quantity}</span>
            </div>
            <div class="cart-item-price-box">
            <span class="cart-item-subtotal">$${subtotal}</span>
            <button class="btn-cart-delete delete-btn" data-id="${item.product.id}">🗑️</button>
            </div>
        `;

        // 🎯 Capturamos los botones específicos de esta fila
        const decreaseBtn = itemRow.querySelector('.decrease-btn') as HTMLButtonElement;
        const deleteBtn = itemRow.querySelector('.delete-btn') as HTMLButtonElement;

        // Listener para restar 1
        decreaseBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitamos efectos colaterales de clicks en cascada
            storeGlobal.decreaseProductQuantity(item.product.id);
        });

        // Listener para eliminar la fila completa
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            storeGlobal.removeProductFromCart(item.product.id);
        });

        this.listElement!.appendChild(itemRow);
        });
  }

  private destroy(): void {
    if (this.unsubscribeStore) {
      console.log("Table Component: Cancelando suscripción reactiva del Store.");
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
  }


}