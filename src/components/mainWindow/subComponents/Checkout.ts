import { storeGlobal } from '../../../store/Store.js';
import type { AppState } from '../../../store/Store.js';
import type { Invoice, InvoiceItem } from '../../../../types/types.js';

export class Checkout {
  private containerElement: HTMLDivElement | null = null;
  private unsubscribeStore: (() => void) | null = null;

  // Guardamos referencias a los inputs dinámicos actuales para limpiarlos
  private activeInputCash: HTMLInputElement | null = null;
  private activeInputCard: HTMLInputElement | null = null;

  constructor() {}

  render(subContainer: HTMLElement): void {
    // 🌟 Limpieza preventiva antes de renderizar
    this.destroy();

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
            <button class="btn-pay-method" data-method="efectivo">💵 Efectivo</button>
            <button class="btn-pay-method" data-method="tarjeta">💳 Tarjeta</button>
            <button class="btn-pay-method" data-method="hibrido">🔄 Híbrido</button>
          </div>
        </div>

        <div id="payment-inputs-container" class="payment-inputs"></div>

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
      
      // Render inicial y suscripción reactiva descendente impecable
      this.updateCheckoutView(storeGlobal.get());
      this.unsubscribeStore = storeGlobal.subscribe((state) => {
        this.updateCheckoutView(state);
      });
    }
  }

  private initEventListeners(): void {
    if (!this.containerElement) return;

    // 🌟 1. Delegación de eventos para la selección de método de pago
    const paymentButtonsContainer = this.containerElement.querySelector('.payment-buttons');
    paymentButtonsContainer?.addEventListener('click', this.handlePaymentMethodChange);

    // 🌟 2. Delegación de entrada de datos (inputs dinámicos)
    const inputsContainer = this.containerElement.querySelector('#payment-inputs-container');
    inputsContainer?.addEventListener('input', this.handleInputPayment);

    // 3. Botón de facturar
    const btnFacturar = this.containerElement.querySelector('#btn-facturar') as HTMLButtonElement;
    btnFacturar?.addEventListener('click', this.invoiceHandler);
  }

  /**
   * Maneja el clic en los botones de método de pago (Delegado)
   */
  private handlePaymentMethodChange = (e: Event): void => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.btn-pay-method') as HTMLButtonElement | null;
    
    if (btn) {
      e.stopPropagation();
      const method = btn.getAttribute('data-method') as 'efectivo' | 'tarjeta' | 'hibrido';
      
      storeGlobal.update({ 
        paymentMethod: method,
        amountCash: 0,
        amountCard: 0
      });
    }
  };

  /**
   * Maneja la escritura en los inputs de pago (Delegado)
   * Evita fugas de memoria al no colgar listeners individuales a inputs que mueren.
   */
  private handleInputPayment = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value) || 0;

    if (target.id === 'input-cash') {
      storeGlobal.update({ amountCash: value });
    } else if (target.id === 'input-card') {
      storeGlobal.update({ amountCard: value });
    }
  };

  private updateCheckoutView(state: AppState): void {
    if (!this.containerElement) return;

    const total = state.selectedProducts.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    
    // Actualizar labels
    this.containerElement.querySelector('#checkout-total')!.textContent = `$${total}`;

    // Actualizar clases activas en los botones de pago
    const methodButtons = this.containerElement.querySelectorAll('.btn-pay-method');
    methodButtons.forEach(btn => {
      if (btn.getAttribute('data-method') === state.paymentMethod) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Re-renderizar o actualizar inputs dinámicos de pago
    this.renderDynamicInputs(state, total);

    // Cálculos de vuelto
    let cashback = 0;
    let isEnoughCash = false;

    if (state.paymentMethod === 'efectivo') {
      cashback = state.amountCash - total;
      isEnoughCash = state.amountCash >= total;
    } else if (state.paymentMethod === 'tarjeta') {
      cashback = 0;
      isEnoughCash = total > 0; 
    } else if (state.paymentMethod === 'hibrido') {
      const totalPayment = state.amountCash + state.amountCard;
      cashback = totalPayment - total;
      isEnoughCash = totalPayment >= total && state.amountCard <= total;
    }

    const changeLabel = this.containerElement.querySelector('#checkout-change')!;
    changeLabel.textContent = cashback >= 0 ? `$${cashback}` : `$0 (Falta dinero)`;
    
    // Control de bloqueo del botón facturar
    const btnFacturar = this.containerElement.querySelector('#btn-facturar') as HTMLButtonElement;
    if (btnFacturar) {
      btnFacturar.disabled = !isEnoughCash || state.selectedProducts.length === 0;
    }
  }

  private renderDynamicInputs(state: AppState, total: number): void {
    const inputsContainer = this.containerElement!.querySelector('#payment-inputs-container') as HTMLDivElement | null;
    if (!inputsContainer) return;
    
    const currentRenderedMethod = inputsContainer.getAttribute('data-current-method');
    
    // Si cambió el método de pago, recreamos el HTML interno (seguro porque usamos delegación de eventos)
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
            <input type="number" id="input-card-disabled" value="${total}" disabled>
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
    } else {
      // 🌟 PREVENCIÓN DE PÉRDIDA DE FOCO: Si el método es el mismo, solo actualizamos los valores de forma directa
      // Esto evita renderizar de nuevo y que el input pierda la posición del cursor mientras escribes.
      const cashInput = inputsContainer.querySelector('#input-cash') as HTMLInputElement | null;
      const cardInput = inputsContainer.querySelector('#input-card') as HTMLInputElement | null;
      const cardDisabledInput = inputsContainer.querySelector('#input-card-disabled') as HTMLInputElement | null;

      if (cashInput && document.activeElement !== cashInput) {
        cashInput.value = state.amountCash ? state.amountCash.toString() : '';
      }
      if (cardInput && document.activeElement !== cardInput) {
        cardInput.value = state.amountCard ? state.amountCard.toString() : '';
      }
      if (cardDisabledInput) {
        cardDisabledInput.value = total.toString();
      }
    }
  }

  private invoiceHandler = async (): Promise<void> => {
    const state = storeGlobal.get();
    
    if (state.selectedProducts.length === 0) {
      alert("No hay productos seleccionados para facturar.");
      return;
    }

    const total = state.selectedProducts.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    // 1. Mapeamos las variables de pago basándonos en tu base de datos
    let cashAmount = 0;
    let transferAmount = 0;
    let cashReceived = 0;

    if (state.paymentMethod === 'efectivo') {
      cashAmount = total;
      cashReceived = state.amountCash;
    } else if (state.paymentMethod === 'tarjeta') {
      transferAmount = total;
      cashReceived = 0;
    } else if (state.paymentMethod === 'hibrido') {
      cashAmount = state.amountCash;
      transferAmount = state.amountCard;
      // En modo híbrido, el efectivo recibido para calcular el vuelto 
      // sigue siendo lo que ingresaron en la parte de efectivo
      cashReceived = state.amountCash; 
    }

    // 2. Construimos la lista de items mapeada usando estrictamente el tipo InvoiceItem
    const items: InvoiceItem[] = state.selectedProducts.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      unit_price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity
    }));

    // 3. Tipamos el objeto completo como "Invoice" garantizando robustez de datos
    const invoicePayload: Invoice = {
      total,
      payment_method: state.paymentMethod,
      cash_amount: cashAmount,
      transfer_amount: transferAmount,
      cash_received: cashReceived,
      items
    };

    try {
      // Bloquear botón para evitar doble envío accidental (Double Click / Enter Key repetido)
      const btnFacturar = this.containerElement?.querySelector('#btn-facturar') as HTMLButtonElement;
      if (btnFacturar) {
        btnFacturar.disabled = true;
      }

      console.log("[Checkout] Despachando factura a base de datos...", invoicePayload);
      
      // Llamamos al canal de nuestra API de Electron expuesta
      const result = await window.paletteAPI.Invoice.createInvoice(invoicePayload);

      if (result.success) {
        alert(`¡Factura ${result.invoiceNumber} guardada con éxito!`);

        // 4. Limpiamos el carrito y restablecemos el estado de cobro en el Store de forma reactiva
        storeGlobal.update({
          selectedProducts: [],
          amountCash: 0,
          amountCard: 0,
          paymentMethod: 'efectivo'
        });
      }

    } catch (error: any) {
      console.error("Error al emitir factura:", error);
      alert(`Error al guardar la factura: ${error.message || error}`);
      
      // Reactivamos el botón visualmente basándonos en el estado actual si algo falla
      this.updateCheckoutView(storeGlobal.get());
    }
  };

  /**
   * 🌟 EL DESTRUCTOR PÚBLICO:
   * Limpia de forma segura todas las suscripciones y listeners delegados
   */
  public destroy(): void {
    if (this.containerElement) {
      // Desvincular listeners delegados del DOM
      const paymentButtonsContainer = this.containerElement.querySelector('.payment-buttons');
      paymentButtonsContainer?.removeEventListener('click', this.handlePaymentMethodChange);

      const inputsContainer = this.containerElement.querySelector('#payment-inputs-container');
      inputsContainer?.removeEventListener('input', this.handleInputPayment);

      const btnFacturar = this.containerElement.querySelector('#btn-facturar');
      btnFacturar?.removeEventListener('click', this.invoiceHandler);
    }

    // Apagar la suscripción del Store
    if (this.unsubscribeStore) {
      console.log("Checkout Component: Desuscribiendo del Store de manera limpia.");
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
  }
}