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
  private actionBtnElement: HTMLButtonElement | null = null;

  // Bindeamos los métodos para poder agregarlos y removerlos con total seguridad
  private handleSubmitBound = this.handleSubmit.bind(this);
  private handleToggleActiveBound = this.handleToggleActive.bind(this);

  // ID del producto activo bajo edición
  private activeProductId: number | null = null;
  private isEditingInactive: boolean = false;

  constructor(searchInstance: Search, productsInstance: Products) {
    this.searchComponent = searchInstance;
    this.productsComponent = productsInstance;
  }

  async render(mainContainer: HTMLElement): Promise<void> {
    // 🌟 Limpieza preventiva de seguridad al renderizar
    this.destroy();
    this.container = mainContainer;

    const state = storeGlobal.get();
    if (!state.disabledProducts || state.disabledProducts.length === 0) {
      try {
        console.log("[EditDelete] Cargando catálogo de productos inactivos por primera vez...");
        const inactiveFromDB = await window.paletteAPI.Products.getDisabledProducts();
        storeGlobal.update({ disabledProducts: inactiveFromDB });
      } catch (error) {
        console.error("Error al cargar productos desactivados:", error);
      }
    }

    storeGlobal.update({
      filteredCatalog: storeGlobal.get().productsCatalog,
      selectedProductForEdit: null
    });

    // 1. Estructuramos la pantalla dividida (Split Screen)
    mainContainer.innerHTML = `
      <div class="edit-delete-layout">
        <div class="management-sidebar">
          <div class="sidebar-toggle-bar">
            <button id="btn-show-active" class="toggle-tab active">Activos</button>
            <button id="btn-show-inactive" class="toggle-tab">Inactivos (<span id="inactive-count">0</span>)</button>
          </div>
          <div id="search-slot"></div>
          <div id="products-slot"></div>
        </div>

        <div class="management-form-panel" id="edit-form-slot">
          <div class="empty-state-notice">
            <p>🔍 Selecciona un producto para editar sus propiedades o cambiar su estado.</p>
          </div>
        </div>
      </div>
    `;

    this.updateInactiveCounter();
    this.setupTabEvents();
    

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

  private updateInactiveCounter(): void {
    const counter = this.container?.querySelector('#inactive-count');
    if (counter) {
      counter.textContent = (storeGlobal.get().disabledProducts?.length || 0).toString();
    }
  }


  private setupTabEvents(): void {
    const btnActive = this.container?.querySelector('#btn-show-active');
    const btnInactive = this.container?.querySelector('#btn-show-inactive');

    btnActive?.addEventListener('click', () => {
      btnActive.classList.add('active');
      btnInactive?.classList.remove('active');
      // 🌟 Cambiamos el catálogo del visualizador al catálogo activo
      storeGlobal.update({ 
        filteredCatalog: storeGlobal.get().productsCatalog,
        selectedProductForEdit: null // Limpiamos selección al cambiar de pestaña
      });
    });

    btnInactive?.addEventListener('click', () => {
      btnInactive.classList.add('active');
      btnActive?.classList.remove('active');
      // 🌟 Cambiamos el catálogo del visualizador a los productos inactivos
      storeGlobal.update({ 
        filteredCatalog: storeGlobal.get().disabledProducts || [],
        selectedProductForEdit: null
      });
    });
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
    this.isEditingInactive = product.active === 0;

    const actionBtnText = this.isEditingInactive ? "🟢 Reactivar Producto" : "🔴 Desactivar Producto";
    const actionBtnClass = this.isEditingInactive ? "btn-success" : "btn-danger";
    const isDisabledAttr = this.isEditingInactive ? 'disabled' : '';

    // Dibujamos el formulario pre-cargado
    formSlot.innerHTML = `
      <div class="edit-product-card ${this.isEditingInactive ? 'inactive-card-border' : ''}">
        <h3>✏️ Editar Producto: <span class="highlight">${product.name}</span> ${this.isEditingInactive ? '<span class="badge-inactive">(Inactivo)</span>' : ''}</h3>
        <form id="edit-product-form" class="editor-form ${this.isEditingInactive ? 'form-disabled' : ''}">
          
          <div class="form-group">
            <label for="edit-prod-name">Nombre del Producto</label>
            <input type="text" id="edit-prod-name" value="${product.name}" required ${isDisabledAttr}>
            ${this.isEditingInactive ? '<small class="form-help">Reactiva el producto para poder modificar su nombre.</small>' : ''}
          </div>

          <div class="form-group">
            <label for="edit-prod-price">Precio ($)</label>
            <input type="number" id="edit-prod-price" value="${product.price}" required min="0" ${isDisabledAttr}>
            ${this.isEditingInactive ? '<small class="form-help">Reactiva el producto para poder modificar su precio.</small>' : ''}
          </div>

          <div class="form-group">
            <label for="edit-prod-category">Categoría</label>
            <select id="edit-prod-category" required ${isDisabledAttr}></select>
            ${this.isEditingInactive ? '<small class="form-help">Reactiva el producto para poder cambiar su categoría.</small>' : ''}
          </div>

          <div class="form-actions">
            <!-- 🌟 Ocultamos o deshabilitamos el botón de guardar si está inactivo -->
            ${!this.isEditingInactive ? '<button type="submit" class="btn-save">Guardar Cambios</button>' : ''}
            <button type="button" id="btn-toggle-active" class="${actionBtnClass}">${actionBtnText}</button>
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
    this.actionBtnElement = formSlot.querySelector('#btn-toggle-active');

    // Escuchar eventos de forma segura
    this.setupFormEvents();
  }

  private setupFormEvents(): void {
    if (this.formElement) {
      this.formElement.addEventListener('submit', this.handleSubmitBound);
    }
    if (this.actionBtnElement) {
      this.actionBtnElement.addEventListener('click', this.handleToggleActiveBound);
    }
  }

  private cleanupFormEvents(): void {
    if (this.formElement) {
      this.formElement.removeEventListener('submit', this.handleSubmitBound);
      this.formElement = null;
    }
    if (this.actionBtnElement) {
      this.actionBtnElement.removeEventListener('click', this.handleToggleActiveBound);
      this.actionBtnElement = null;
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
/*
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
*/

  private async handleToggleActive(): Promise<void> {
    if (!this.activeProductId) return;

    const state = storeGlobal.get();
    const productToChange = this.isEditingInactive 
      ? state.disabledProducts?.find(p => p.id === this.activeProductId)
      : state.productsCatalog.find(p => p.id === this.activeProductId);

    if (!productToChange) return;

    const newActiveState = this.isEditingInactive ? 1 : 0;
    const confirmMessage = this.isEditingInactive
      ? `¿Deseas reactivar "${productToChange.name}" y devolverlo al catálogo de ventas?`
      : `¿Estás seguro de que deseas desactivar "${productToChange.name}" del menú de ventas?`;

    if (confirm(confirmMessage)) {
      try {
        // 1. Persistencia en la Base de Datos
        await window.paletteAPI.Products.toggleActiveState(this.activeProductId, newActiveState);

        let updatedCatalog = [...state.productsCatalog];
        let updatedDisabled = [...(state.disabledProducts || [])];

        if (newActiveState === 1) {
          // --- PROCESO DE REACTIVACIÓN ---
          const reactivatedProduct: Product = {
            ...productToChange,
            active: 1
          };
          // Agregamos a activos y removemos de inactivos
          updatedCatalog.push(reactivatedProduct);
          updatedDisabled = updatedDisabled.filter(p => p.id !== this.activeProductId);

          console.log(`[EditDelete] Producto "${productToChange.name}" reactivado con éxito.`);
        } else {
          // --- PROCESO DE DESACTIVACIÓN (Borrado Lógico) ---
          const deactivatedProduct: Product = {
            ...productToChange,
            active: 0
          };
          // Removemos de activos y agregamos a inactivos
          updatedCatalog = updatedCatalog.filter(p => p.id !== this.activeProductId);
          updatedDisabled.push(deactivatedProduct);

          // Limpiamos del carrito de compras si estaba ahí
          const updatedCart = state.selectedProducts.filter(item => item.product.id !== this.activeProductId);
          storeGlobal.update({ selectedProducts: updatedCart });

          console.log(`[EditDelete] Producto "${productToChange.name}" desactivado con éxito.`);
        }

        // 2. Actualización atómica en el Store Global
        storeGlobal.update({
          productsCatalog: updatedCatalog,
          disabledProducts: updatedDisabled,
          selectedProductForEdit: null, // Limpiamos el formulario
          // Refrescamos la lista de la barra lateral según la pestaña en la que estábamos
          filteredCatalog: this.isEditingInactive ? updatedDisabled : updatedCatalog
        });

      } catch (error) {
        console.error("Error al cambiar el estado del producto:", error);
        alert("Ocurrió un error al procesar el cambio de estado del producto.");
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