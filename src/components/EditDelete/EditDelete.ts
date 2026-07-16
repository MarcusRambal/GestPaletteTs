import { storeGlobal } from '../../store/Store.js';
import { Search } from '../mainWindow/subComponents/Search.js'; 
import { Products } from '../mainWindow/subComponents/Products.js'; 
import type { Product } from '../../../types/types.js';

export class EditDelete {
  private container: HTMLElement | null = null;
  private searchComponent: Search;
  private productsComponent: Products;
  private unsubscribe: (() => void) | null = null;

  // Referencias para el desmontado limpio de eventos
  private formElement: HTMLFormElement | null = null;
  private deleteBtnElement: HTMLButtonElement | null = null;

  // Bindeamos los métodos para poder agregarlos y removerlos con total seguridad
  private handleSubmitBound = this.handleSubmit.bind(this);
  private handleDeleteBound = this.handleDelete.bind(this);

  // ID del producto activo bajo edición
  private activeProductId: number | null = null;

  constructor(searchInstance: Search, productsInstance: Products) {
    this.searchComponent = searchInstance;
    this.productsComponent = productsInstance;
  }

  render(mainContainer: HTMLElement): void {
    // 🌟 Limpieza preventiva de seguridad al renderizar
    this.destroy();
    
    this.container = mainContainer;

    // 1. Estructuramos la pantalla dividida (Split Screen)
    mainContainer.innerHTML = `
      <div class="edit-delete-layout">
        <div class="management-sidebar">
          <div id="search-slot"></div>
          <div id="products-slot"></div>
        </div>

        <div class="management-form-panel" id="edit-form-slot">
          <div class="empty-state-notice">
            <p>🔍 Selecciona un producto de la lista con las flechas o un clic para editar sus propiedades o eliminarlo.</p>
          </div>
        </div>
      </div>
    `;

    // 2. Inyectamos los componentes existentes en sus respectivos slots
    const searchSlot = mainContainer.querySelector('#search-slot') as HTMLElement;
    const productsSlot = mainContainer.querySelector('#products-slot') as HTMLElement;

    if (searchSlot) this.searchComponent.render(searchSlot);
    if (productsSlot) this.productsComponent.render(productsSlot);

    // 3. Suscripción limpia al Store global
    this.unsubscribe = storeGlobal.subscribe((state) => {
      // Reaccionamos al cambio de selección de producto
      this.renderEditForm(state.selectedProductForEdit);
    });

    // Carga inicial por si ya había uno seleccionado
    this.renderEditForm(storeGlobal.get().selectedProductForEdit);
  }

  private renderEditForm(product: Product | null): void {
    const formSlot = this.container?.querySelector('#edit-form-slot');
    if (!formSlot) return;

    // 🌟 Limpiamos de forma proactiva eventos de formularios anteriores antes de inyectar nuevo HTML
    this.cleanupFormEvents();

    if (!product) {
      this.activeProductId = null;
      formSlot.innerHTML = `
        <div class="empty-state-notice">
          <p>🔍 Selecciona un producto de la lista para editar sus propiedades o eliminarlo.</p>
        </div>
      `;
      return;
    }

    this.activeProductId = product.id;

    // Dibujamos el formulario pre-cargado
    formSlot.innerHTML = `
      <div class="edit-product-card">
        <h3>✏️ Editar Producto: <span class="highlight">${product.name}</span></h3>
        <form id="edit-product-form" class="editor-form">
          <div class="form-group">
            <label for="edit-prod-name">Nombre del Producto</label>
            <input type="text" id="edit-prod-name" value="${product.name}" required>
          </div>

          <div class="form-group">
            <label for="edit-prod-price">Precio ($)</label>
            <input type="number" id="edit-prod-price" value="${product.price}" required min="0">
          </div>

          <div class="form-group">
            <label for="edit-prod-category">Categoría Actual: <strong>${product.category_name}</strong></label>
            <select id="edit-prod-category" required></select>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-save">Guardar Cambios</button>
            <button type="button" id="btn-delete-prod" class="btn-danger">Desactivar Producto</button>
          </div>
        </form>
      </div>
    `;

    // Llenar el select de categorías
    const select = formSlot.querySelector('#edit-prod-category') as HTMLSelectElement;
    storeGlobal.get().categoriesCatalog.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id.toString();
      option.textContent = cat.name;
      if (cat.id === product.category_id) option.selected = true;
      select.appendChild(option);
    });

    // Guardar referencias físicas de los nuevos nodos del formulario
    this.formElement = formSlot.querySelector('#edit-product-form');
    this.deleteBtnElement = formSlot.querySelector('#btn-delete-prod');

    // Escuchar eventos de forma segura
    this.setupFormEvents();
  }

  private setupFormEvents(): void {
    if (this.formElement) {
      this.formElement.addEventListener('submit', this.handleSubmitBound);
    }
    if (this.deleteBtnElement) {
      this.deleteBtnElement.addEventListener('click', this.handleDeleteBound);
    }
  }

  private cleanupFormEvents(): void {
    if (this.formElement) {
      this.formElement.removeEventListener('submit', this.handleSubmitBound);
      this.formElement = null;
    }
    if (this.deleteBtnElement) {
      this.deleteBtnElement.removeEventListener('click', this.handleDeleteBound);
      this.deleteBtnElement = null;
    }
  }

  /**
   * ACCIÓN 1: Guardar Cambios (UPDATE en SQLite)
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!this.activeProductId || !this.formElement) return;

    const nameInput = this.formElement.querySelector('#edit-prod-name') as HTMLInputElement | null;
    const priceInput = this.formElement.querySelector('#edit-prod-price') as HTMLInputElement | null;
    const categorySelect = this.formElement.querySelector('#edit-prod-category') as HTMLSelectElement | null;

    if (!nameInput || !priceInput || !categorySelect) return;

    const updatedName = nameInput.value.trim();
    const updatedPrice = parseFloat(priceInput.value);
    const updatedCategoryId = parseInt(categorySelect.value);
    const updatedCategoryName = categorySelect.options[categorySelect.selectedIndex].text;

    // Obtenemos el estado actual del Store para validar en memoria
    const state = storeGlobal.get();


    const exactActiveDuplicate = state.productsCatalog.some(p => 
      p.id !== this.activeProductId && p.name.toLowerCase().trim() === updatedName.toLowerCase().trim()
    );

    if (exactActiveDuplicate) {
      alert(`El producto "${updatedName}" ya existe en tus productos activos.`);
      nameInput.focus();
      return;
    }

    // 🌟 VALIDACIÓN 2: Choque directo de nombres inactivos
    const exactInactiveDuplicate = state.disabledProducts?.some(p => 
      p.name.toLowerCase().trim() === updatedName.toLowerCase().trim()
    );

    if (exactInactiveDuplicate) {
      alert(`Existe un producto inactivo llamado "${updatedName}". Actívalo en su lugar.`);
      nameInput.focus();
      return;
    }

    // 🌟 VALIDACIÓN 3: Detector inteligente de Typos (Similitud Fonética/Escrita)
    const similarProduct = state.productsCatalog.find(p => 
      p.id !== this.activeProductId && areHighlySimilar(p.name, updatedName)
    );

    if (similarProduct) {
      const confirmTypo = confirm(
        `⚠️ Alerta de Similitud:\n\nEl nombre "${updatedName}" es muy similar a "${similarProduct.name}" que ya existe en la categoría "${similarProduct.category_name}".\n\n¿Estás seguro de que no es un error de dedo y quieres guardarlo de todas formas?`
      );
      if (!confirmTypo) {
        nameInput.focus();
        return; // El usuario decide cancelar y corregir el typo
      }
    }

    try {
      // 1. Payload limpio para la base de datos
      const updatePayload = {
        name: updatedName,
        price: updatedPrice,
        category_id: updatedCategoryId
      };
      
       

      // 2. Persistencia en SQLite a través del IPC
      await window.paletteAPI.Products.updateProduct(this.activeProductId, updatePayload);

       
      // 3. Objeto del producto actualizado
      const updatedProduct: Product = {
        id: this.activeProductId,
        name: updatedName,
        price: updatedPrice,
        category_id: updatedCategoryId,
        category_name: updatedCategoryName,
        active: 1
      };

      // 4. Sincronizamos el catálogo de productos disponibles
      const updatedCatalog = state.productsCatalog.map(p => 
        p.id === this.activeProductId ? updatedProduct : p
      );

      // 5. Sincronizamos el carrito (selectedProducts) si el producto editado estaba en él
      const updatedCart = state.selectedProducts.map(item => {
        if (item.product.id === this.activeProductId) {
          return { ...item, product: updatedProduct };
        }
        return item;
      });

      storeGlobal.update({
        productsCatalog: updatedCatalog,
        selectedProducts: updatedCart,
        // Limpiamos la selección activa para resetear la pantalla a su estado vacío o actualizado
        selectedProductForEdit: null 
      });

      // 4. Feedback no bloqueante o corrección de foco táctil si sigues usando confirmaciones
      const nameInputToFocus = this.container?.querySelector('#edit-prod-name') as HTMLInputElement | null;
      nameInputToFocus?.focus();

      console.log(`[EditDelete] Producto ID: ${this.activeProductId} editado con éxito.`);
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      alert("No se pudieron guardar los cambios del producto.");
    }
  }

  /**
   * ACCIÓN 2: Desactivar Producto (Borrado Lógico)
   */
  private async handleDelete(): Promise<void> {
    if (!this.activeProductId) return;

    if (confirm("¿Estás seguro de que deseas desactivar este producto del menú?")) {
      try {
        // 1. Borrado lógico a través del canal IPC (ej. pone active = 0 en SQLite)
        await window.paletteAPI.Products.deleteProduct(this.activeProductId);

        // 2. Leemos el estado actual
        const state = storeGlobal.get();

        // 3. Removemos el producto del catálogo disponible
        const updatedCatalog = state.productsCatalog.filter(p => p.id !== this.activeProductId);

        // 4. Removemos el producto del carrito activo (no puedes vender algo inactivo)
        const updatedCart = state.selectedProducts.filter(item => item.product.id !== this.activeProductId);

        // 5. Despachamos la actualización atómica de estado
        // 🌟 selectedProductForEdit: null limpia la interfaz de edición inmediatamente
        storeGlobal.update({
          productsCatalog: updatedCatalog,
          selectedProducts: updatedCart,
          selectedProductForEdit: null 
        });

        console.log(`[EditDelete] Producto ID: ${this.activeProductId} desactivado exitosamente.`);
      } catch (error) {
        console.error("Error al desactivar el producto:", error);
        alert("Ocurrió un error al intentar desactivar el producto.");
      }
    }
  }

  /**
   * 🌟 DESTRUCTOR SIMÉTRICO:
   * Detiene suscripciones globales del Store y remueve eventos locales.
   */
  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    this.cleanupFormEvents();
    this.container = null;
    this.activeProductId = null;
    console.log("[EditDelete] Vista destruida y liberada de memoria de forma limpia.");
  }
}


// Helper de Levenshtein (calcula la distancia entre dos strings)
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => 
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,    // borrado
          matrix[i][j - 1] + 1,    // inserción
          matrix[i - 1][j - 1] + 1 // sustitución
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

// Determina si dos textos son extremadamente similares
function areHighlySimilar(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return true;

  const distance = getLevenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  // Si la distancia es muy corta en relación al largo del texto (ej. diferencia de 1 o 2 letras)
  // Para palabras de más de 8 letras, una distancia de hasta 2 indica una similitud crítica (ej: typo)
  return distance <= 2 && maxLength > 5;
}