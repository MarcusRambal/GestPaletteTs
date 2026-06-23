import { storeGlobal } from '../../../store/Store.js';
import type { AppState } from '../../../store/Store.js';

export class Checkout {
  private containerElement: HTMLDivElement | null = null;
  private unsubscribeStore: (() => void) | null = null;

  render(subContainer: HTMLElement): void {
    subContainer.innerHTML = `
      <div class="checkout-container">
        <div class="checkout-summary">
          <div class="summary-row">
            <span>Total a Pagar:</span>
            <span id="checkout-total" class="total-price">$0</span>
          </div>
        </div>

        <div class="payment-methods-box">
          <label>Método de Pago:</label>
          <div class="payment-buttons">
            <button class="btn-pay-method active" data-method="efectivo">💵 Efectivo</button>
            <button class="btn-pay-method" data-method="tarjeta">💳 Tarjeta</button>
            <button class="btn-pay-method" data-method="hibrido">🔄 Híbrido</button>
          </div>
        </div>

        <div id="payment-inputs-container" class="payment-inputs">
          </div>

        <div class="change-box">
          <span>Cambio (Vuelto):</span>
          <span id="checkout-change" class="change-amount">$0</span>
        </div>

        <button id="btn-facturar" class="btn-facturar" disabled>Emitir Factura (Enter)</button>
      </div>
    `;

    this.containerElement = subContainer.querySelector('.checkout-container');

    if (this.containerElement) {
      this.initEventListeners();
      
      // Render inicial y suscripción reactiva
      this.updateCheckoutView(storeGlobal.get());
      this.unsubscribeStore = storeGlobal.subscribe((state) => {
        if (state.currentScreen !== 'home') {
          this.destroy();
          return;
        }
        this.updateCheckoutView(state);
      });
    }
  }

  private initEventListeners(): void {
    if (!this.containerElement) return;

    // Listener para cambiar el método de pago mediante clicks
    const methodButtons = this.containerElement.querySelectorAll('.btn-pay-method');
    methodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.getAttribute('data-method') as 'efectivo' | 'tarjeta' | 'hibrido';
        
        // Reset de montos al cambiar de método
        storeGlobal.update({ 
          paymentMethod: method,
          amountCash: 0,
          amountCard: 0
        });
      });
    });

    // Botón definitivo de Facturar
    const btnFacturar = this.containerElement.querySelector('#btn-facturar') as HTMLButtonElement;
    btnFacturar.addEventListener('click', () => this.procesarFacturacion());
  }

  private updateCheckoutView(state: AppState): void {
    if (!this.containerElement) return;

    // 1. Calcular el Total Matemático en caliente
    const total = state.selectedProducts.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    
    // Actualizar labels en la UI
    this.containerElement.querySelector('#checkout-total')!.textContent = `$${total}`;

    // 2. Gestionar clases de botones activos
    const methodButtons = this.containerElement.querySelectorAll('.btn-pay-method');
    methodButtons.forEach(btn => {
      if (btn.getAttribute('data-method') === state.paymentMethod) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 3. Re-renderizar cajas de texto de pago dinámicamente si es necesario
    this.renderDynamicInputs(state, total);

    // 4. Calcular el vuelto y validez de la factura
    let cashback = 0;
    let isEnoughCash = false;

    if (state.paymentMethod === 'efectivo') {
      cashback = state.amountCash - total;
      isEnoughCash = state.amountCash >= total;
    } else if (state.paymentMethod === 'tarjeta') {
      cashback = 0; // Tarjeta cobra exacto por IPC de datáfono/pasarela externa
      isEnoughCash = total > 0; 
    } else if (state.paymentMethod === 'hibrido') {
      const totalPayment = state.amountCash + state.amountCard;
      cashback = totalPayment - total;
      // En híbrido no se permite dar vuelto de más en tarjeta; el total pagado debe ser exacto o dar vuelto solo del efectivo
      isEnoughCash = totalPayment >= total && state.amountCard <= total;
    }

    const changeLabel = this.containerElement.querySelector('#checkout-change')!;
    changeLabel.textContent = cashback >= 0 ? `$${cashback}` : `$0 (Falta dinero)`;
    
    // Control de bloqueo del botón
    const btnFacturar = this.containerElement.querySelector('#btn-facturar') as HTMLButtonElement;
    btnFacturar.disabled = !isEnoughCash || state.selectedProducts.length === 0;
  }

  private renderDynamicInputs(state: AppState, total: number): void {
    const inputsContainer = this.containerElement!.querySelector('#payment-inputs-container')!;
    
    // Para evitar parpadeos y pérdida de foco mientras se escribe, verificamos si la estructura básica ya está armada
    const currentRenderedMethod = inputsContainer.getAttribute('data-current-method');
    
    if (currentRenderedMethod !== state.paymentMethod) {
      inputsContainer.setAttribute('data-current-method', state.paymentMethod);
      
      if (state.paymentMethod === 'efectivo') {
        inputsContainer.innerHTML = `
          <div class="input-group">
            <label>Efectivo Recibido:</label>
            <input type="number" id="input-cash" value="${state.amountCash || ''}" placeholder="$0.00" min="0">
          </div>
        `;
      } else if (state.paymentMethod === 'tarjeta') {
        inputsContainer.innerHTML = `
          <div class="input-group">
            <label>Monto Tarjeta (Automático):</label>
            <input type="number" value="${total}" disabled>
          </div>
        `;
      } else if (state.paymentMethod === 'hibrido') {
        inputsContainer.innerHTML = `
          <div class="input-group-row">
            <div class="input-subgroup">
              <label>Parte Efectivo:</label>
              <input type="number" id="input-cash" value="${state.amountCash || ''}" placeholder="$0.00">
            </div>
            <div class="input-subgroup">
              <label>Parte Tarjeta:</label>
              <input type="number" id="input-card" value="${state.amountCard || ''}" placeholder="$0.00">
            </div>
          </div>
        `;
      }

      // Colgar listeners a los nuevos inputs generados
      const inputCash = inputsContainer.querySelector('#input-cash') as HTMLInputElement | null;
      const inputCard = inputsContainer.querySelector('#input-card') as HTMLInputElement | null;

      inputCash?.addEventListener('input', () => {
        storeGlobal.update({ amountCash: parseFloat(inputCash.value) || 0 });
      });

      inputCard?.addEventListener('input', () => {
        storeGlobal.update({ amountCard: parseFloat(inputCard.value) || 0 });
      });
    }
  }

  private async procesarFacturacion(): Promise<void> {
    const state = storeGlobal.get();
    console.log("Iniciando despacho de factura a SQLite via IPC...", state.selectedProducts);
    
    // Aquí irá tu canal IPC en el futuro: window.paletteAPI.Facturas.save(...)
    
    // Limpieza post-venta del POS exitosa:
    storeGlobal.update({
      selectedProducts: [],
      amountCash: 0,
      amountCard: 0,
      paymentMethod: 'efectivo'
    });
    
    alert("¡Factura procesada con éxito!");
  }

  private destroy(): void {
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
  }
}