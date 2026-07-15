import { storeGlobal } from '../../../store/Store.js';
import type { Category } from '../../../../types/types.js';

export class ProductForm {
  private container: HTMLDivElement | null = null;
  private formElement: HTMLFormElement | null = null;
  private unsubscribe: (() => void) | null = null;
  
  // Guardamos en caché el tamaño de la lista de categorías para reaccionar de manera inteligente
  private lastCategoriesLength: number = -1;

  // 🌟 Guardamos la referencia ligada de submit para poder removerla limpiamente al destruir
  private handleSubmitBound = this.handleSubmit.bind(this);

  render(subContainer: HTMLElement): void {
    // 1. Limpieza preventiva
    this.destroy();

    subContainer.innerHTML = `
      <div class="ProductForm-container"></div>
    `;

    this.container = subContainer.querySelector('.ProductForm-container');

    // 🌟 Suscripción inteligente: Evaluamos selectivamente
    this.unsubscribe = storeGlobal.subscribe((state) => {
      const currentCategories = state.categoriesCatalog;
      
      // Solo si el tamaño de categorías realmente cambió (ej. de 0 a 1, o de 1 a 2)
      if (currentCategories.length !== this.lastCategoriesLength) {
        this.lastCategoriesLength = currentCategories.length;
        this.handleCategoriesChange(currentCategories);
      }
    });

    // Carga inicial
    const initialCategories = storeGlobal.get().categoriesCatalog;
    this.lastCategoriesLength = initialCategories.length;
    this.handleCategoriesChange(initialCategories);
  }

  /**
   * Decide si dibuja el estado de advertencia o el formulario base (SOLO una vez)
   */
  private handleCategoriesChange(categories: Category[]): void {
    if (!this.container) return;

    // 🛡️ REGLA DE NEGOCIO: Bloqueo si no hay categorías
    if (!categories || categories.length === 0) {
      this.container.innerHTML = `
        <div class="form-warning-box">
          <p>⚠️ <strong>No se pueden registrar productos todavía.</strong></p>
          <p>Primero debes crear al menos una categoría (ej. Paletas, Helados) en el formulario adyacente para poder clasificar tus productos.</p>
        </div>
      `;
      // Limpiamos referencias del formulario anterior si pasa a estar vacío
      this.cleanupFormListener();
      return;
    }

    // Si el formulario ya existe en el DOM, NO lo volvemos a renderizar por completo.
    // Simplemente actualizamos de manera quirúrgica su select de categorías.
    const formExists = this.container.querySelector('#create-product-form') !== null;
    
    if (formExists) {
      console.log("ProductForm: Actualizando select de categorías quirúrgicamente...");
      this.updateCategorySelect(categories);
    } else {
      console.log("ProductForm: Renderizando estructura base del formulario por primera vez...");
      this.renderFormBase(categories);
    }
  }

  /**
   * Pita la estructura del formulario por primera vez
   */
  private renderFormBase(categories: Category[]): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="productForm-wrapper">
        <h3>✨ Registrar Nuevo Producto</h3>
        <form id="create-product-form" class="editor-form">
          <div class="form-group">
            <label for="prod-name">Nombre del Producto</label>
            <input type="text" id="prod-name" required placeholder="Ej. Paleta de Coco con Arequipe">
          </div>

          <div class="form-group">
            <label for="prod-price">Precio de Venta ($)</label>
            <input type="number" id="prod-price" step="1" pattern="\d*" min="1" required min="0" placeholder="Ej. 3500">
          </div>

          <div class="form-group">
            <label for="prod-category">Categoría Asignada</label>
            <select id="prod-category" required></select>
          </div>

          <button type="submit" class="btn-primary">Guardar en Inventario</button>
        </form>
      </div>
    `;

    this.formElement = this.container.querySelector('#create-product-form');
    this.updateCategorySelect(categories);
    this.setupFormSubmit();
  }

  /**
   * Modifica únicamente las opciones del select, sin alterar los inputs ni sus focos
   */
  private updateCategorySelect(categories: Category[]): void {
    const select = this.container?.querySelector('#prod-category') as HTMLSelectElement | null;
    if (!select) return;

    // Guardamos la selección que tenía el usuario antes de la actualización
    const previousSelection = select.value;

    select.innerHTML = '';

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id.toString();
      option.textContent = cat.name;
      select.appendChild(option);
    });

    // Restauramos su selección si la categoría aún existe, de lo contrario dejamos la primera
    if (previousSelection && categories.some(cat => cat.id.toString() === previousSelection)) {
      select.value = previousSelection;
    }
  }

  private setupFormSubmit(): void {
    if (this.formElement) {
      this.formElement.addEventListener('submit', this.handleSubmitBound);
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!this.formElement) return;

    const nameInput = this.formElement.querySelector('#prod-name') as HTMLInputElement | null;
    const priceInput = this.formElement.querySelector('#prod-price') as HTMLInputElement | null;
    const categorySelect = this.formElement.querySelector('#prod-category') as HTMLSelectElement | null;

    if (!nameInput || !priceInput || !categorySelect) return;

    const selectedId = parseInt(categorySelect.value);
    const selectedName = categorySelect.options[categorySelect.selectedIndex].text;

    const state = storeGlobal.get();

    if(state.productsCatalog.some(p => p.name.toLowerCase().trim() === nameInput.value.toLowerCase().trim())) {
      alert(`⚠️ Ya existe un producto activo con el nombre "${nameInput.value}". Por favor, elige otro nombre.`);
      return;
    }

    if(state.disabledProducts.some(p => p.name.toLowerCase().trim() === nameInput.value.toLowerCase().trim())) {
      const confirmReactivate = confirm(`⚠️ Existe un producto inactivo con el nombre "${nameInput.value}". ¿Deseas reactivarlo en lugar de crear uno nuevo?`);
      //implementar reactivación de producto inactivo
    }

    

    try {
      const cleanSQLPayload = {
        name: nameInput.value.trim(),
        price: parseFloat(priceInput.value),
        category_id: selectedId
      };

      const newProductId = await window.paletteAPI.Products.createProduct(cleanSQLPayload);
      const currentProducts = storeGlobal.get().productsCatalog;
      
      storeGlobal.update({
        productsCatalog: [
          ...currentProducts,
          { 
            id: newProductId, 
            name: cleanSQLPayload.name,
            price: cleanSQLPayload.price,
            category_id: cleanSQLPayload.category_id,
            category_name: selectedName,
            active: 1
          }
        ]
      });

      this.formElement.reset();
      
      console.log(`Producto "${cleanSQLPayload.name}" registrado exitosamente con ID ${newProductId}.`);
    } catch (error) {
      console.error("Error al guardar el producto:", error);
    }
  }

  /**
   * Método auxiliar para remover listeners del formulario de forma limpia
   */
  private cleanupFormListener(): void {
    if (this.formElement) {
      this.formElement.removeEventListener('submit', this.handleSubmitBound);
      this.formElement = null;
    }
  }

  /**
   * 🌟 DESTRUCTOR SEGURO:
   * Cancela la suscripción al Store global, apaga listeners y limpia referencias del DOM.
   */
  public destroy(): void {
    // 1. Cancelar suscripción del Store para evitar ejecuciones fantasma
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // 2. Limpiar listeners del DOM
    this.cleanupFormListener();

    // 3. Limpiar referencias físicas
    this.container = null;
    this.lastCategoriesLength = -1;

    console.log("[ProductForm] Suscripciones canceladas y recursos liberados.");
  }
}