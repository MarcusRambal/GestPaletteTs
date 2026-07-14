import { storeGlobal } from "../../../store/Store.js"
import type { CartItem } from "../../../../types/types.js";

export class Table {
  private listElement: HTMLDivElement | null = null;
  private unsubscribeStore: (() => void) | null = null;

  constructor() {}

  render(subContainer: HTMLElement): void {
    // 🌟 Limpieza preventiva antes de renderizar
    this.destroy();

    subContainer.innerHTML = `
      <div class="selectedProducts-container">
        <div class="selectedProducts-list" id="selectedProducts-list">
          <p class="loading">No hay Productos seleccionados</p>
        </div>
      </div>
    `;

    this.listElement = subContainer.querySelector('#selectedProducts-list');

    if (this.listElement) {
      // 1. Render inicial
      this.renderCartItems(storeGlobal.get().selectedProducts);

      // 2. Escuchamos de forma reactiva los cambios del Store
      this.unsubscribeStore = storeGlobal.subscribe((state) => {
        this.renderCartItems(state.selectedProducts);
      });

      // 🌟 3. Delegación de eventos: Un único listener para toda la lista
      this.listElement.addEventListener('click', this.handleCartActions);
    } else {
      console.error("Table Component Error: No se encontró el contenedor '#selectedProducts-list' en el DOM.");
    }
  }

  private renderCartItems(cartItems: CartItem[]): void {
    if (!this.listElement) return;

    if (cartItems.length === 0) {
      this.listElement.innerHTML = `<p class="loading">No hay Productos seleccionados</p>`;
      return;
    }

    this.listElement.innerHTML = '';

    cartItems.forEach((item) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'cart-item-row';
      const subtotal = item.product.price * item.quantity;

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

      this.listElement!.appendChild(itemRow);
    });
  }

  /**
   * 🌟 Manejador único de clics usando delegación de eventos
   */
  private handleCartActions = (e: Event): void => {
    const target = e.target as HTMLElement;
    console.log(`[Table Component] Click detectado en: ${target.tagName}, Clases: ${target.className}`);

    // Acción para el botón de disminuir (-)
    const decreaseBtn = target.closest('.decrease-btn') as HTMLButtonElement | null;
    if (decreaseBtn) {
      e.stopPropagation();
      const id = parseInt(decreaseBtn.getAttribute('data-id') || '0', 10);
      if (id) storeGlobal.decreaseProductQuantity(id);
      return;
    }

    // Acción para el botón de eliminar (🗑️)
    const deleteBtn = target.closest('.delete-btn') as HTMLButtonElement | null;
    if (deleteBtn) {
      e.stopPropagation();
      const id = parseInt(deleteBtn.getAttribute('data-id') || '0', 10);
      if (id) storeGlobal.removeProductFromCart(id);
      return;
    }
  };

  /**
   * 🌟 EL DESTRUCTOR PÚBLICO:
   * Ahora es accesible desde MainWindow.ts para limpiar de forma segura
   * tanto la suscripción al Store como el listener de eventos del DOM.
   */
  public destroy(): void {
    // 1. Limpiamos el event listener para evitar retención del DOM en memoria
    if (this.listElement) {
      this.listElement.removeEventListener('click', this.handleCartActions);
    }

    // 2. Apagamos de forma segura la suscripción del Store
    if (this.unsubscribeStore) {
      console.log("Table Component: Desuscribiendo del Store de manera limpia.");
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
  }
}