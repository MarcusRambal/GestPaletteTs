import { storeGlobal } from '../../../store/Store.js';
import type { Category, Product } from '../../../../types/types.js';
import type { AppState } from '../../../store/Store.js';

export class Search {
  private dropdownElement: HTMLDivElement | null = null; 
  private searchInput: HTMLInputElement | null = null;
  private searchButton: HTMLButtonElement | null = null;
  private filterButton: HTMLButtonElement | null = null;
  private unsubscribeStore: (() => void) | null = null;

  // ==========================================
  // 🌟 EVENTOS GUARDADOS COMO PROPIEDADES DE CLASE (Evita fugas de memoria)
  // ==========================================

  // Evento 1: Secuestro de foco inteligente (Global)
  private handleFocusStealing = (e: MouseEvent): void => {
    if (storeGlobal.get().currentScreen !== 'home' || !this.searchInput) {
      return;
    }

    const target = e.target as HTMLElement;
    
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' || 
      target.closest('.filter-dropdown')
    ) {
      return; 
    }

    this.searchInput.focus();
  };

  // Evento 2: Cerrar dropdown al dar clic fuera (Global)
  private handleCloseDropdown = (): void => {
    if (this.dropdownElement) {
      this.dropdownElement.classList.add('hidden');
    }
  };

  // Evento 3: Click en el botón de filtros (Local)
  private handleFilterButtonClick = (e: Event): void => {
    e.stopPropagation(); // Evita que handleCloseDropdown lo cierre al instante
    this.dropdownElement?.classList.toggle('hidden');
  };

  // Evento 4: Click en el botón de búsqueda (Local)
  private handleSearchButtonClick = (): void => {
    if (this.searchInput) {
      this.searchQuery(this.searchInput.value);
    }
  };

  // Evento 5: Entrada de texto en el input de búsqueda (Local)
  private handleSearchInput = (): void => {
    if (!this.searchInput) return;
    const query = this.searchInput.value;
    
    // Usamos el helper unificado para saber cuántos productos quedan
    const filtered = this.getFilteredProducts({ ...storeGlobal.get(), searchQuery: query });

    storeGlobal.update({ 
      searchQuery: query,
      focusedProductIndex: filtered.length > 0 ? 0 : -1 
    });
  };

  // Evento 6: Navegación y selección por teclado (Local)
  private handleSearchKeyDown = (e: KeyboardEvent): void => {
    const state = storeGlobal.get();
    const currentProducts = this.getFilteredProducts(state);
    const totalItems = currentProducts.length;
    const currentIndex = state.focusedProductIndex;

    switch(e.key) {
      case "Enter": {
        e.preventDefault();

        if (currentIndex >= 0 && currentIndex < totalItems) {
          const productoSeleccionado = currentProducts[currentIndex];
          this.selectProduct(productoSeleccionado);

          if (state.currentScreen === 'home' && this.searchInput) {
            this.searchInput.value = '';
            storeGlobal.update({ searchQuery: '', focusedProductIndex: 0 });
          }
          this.searchInput?.focus();
        }
        break;
      }

      case "ArrowDown": {
        e.preventDefault();
        if (totalItems === 0) return;
        const nextIndex = currentIndex + 1 >= totalItems ? 0 : currentIndex + 1;
        storeGlobal.update({ focusedProductIndex: nextIndex });
        break;
      }

      case "ArrowUp": {
        e.preventDefault();
        if (totalItems === 0) return;
        const prevIndex = currentIndex - 1 < 0 ? totalItems - 1 : currentIndex - 1;
        storeGlobal.update({ focusedProductIndex: prevIndex });
        break;
      }
    }
  };

  // Evento 7: Delegación de clics en el Dropdown de Categorías (Local)
  private handleDropdownClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const item = target.closest('.dropdown-item') as HTMLDivElement | null;

    if (item) {
      e.stopPropagation();
      const category = item.getAttribute('data-category') || '';
      storeGlobal.update({ 
        selectedCategory: category, 
        focusedProductIndex: 0 
      });
    }
  };

  // ==========================================
  // RENDERIZADO Y FLUJO PRINCIPAL
  // ==========================================

  render(subContainer: HTMLElement): void {
    this.destroy();

    const currentQuery = storeGlobal.get().searchQuery || '';
    subContainer.innerHTML = `
      <div class="search-container">
        <div class="search-bar-box">
          <input type="text" id="search-input" class="search-input" value="${currentQuery}" placeholder="Buscar producto...">
          <button id="search-button" class="search-button">Buscar</button>
        </div>
          
        <div class="search-filter"> 
          <button id="filter-button">Filtrar <span>🔽</span></button>
          <div id="filter-dropdown" class="filter-dropdown hidden"></div>
        </div>
      </div>
    `;

    this.searchButton = subContainer.querySelector('#search-button');
    this.searchInput = subContainer.querySelector('#search-input');
    this.filterButton = subContainer.querySelector('#filter-button');
    this.dropdownElement = subContainer.querySelector('#filter-dropdown');

    if (this.searchButton && this.searchInput && this.filterButton && this.dropdownElement) {

      // Foco inicial fluido
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.focus();
          if (currentQuery) {
            this.searchInput.setSelectionRange(currentQuery.length, currentQuery.length);
          }
        }
      }, 50);

      // Vincular eventos seguros globales
      document.addEventListener('click', this.handleFocusStealing);
      document.addEventListener('click', this.handleCloseDropdown);

      // Vincular eventos locales del componente
      this.filterButton.addEventListener('click', this.handleFilterButtonClick);
      this.searchButton.addEventListener('click', this.handleSearchButtonClick);
      this.searchInput.addEventListener('input', this.handleSearchInput);
      this.searchInput.addEventListener('keydown', this.handleSearchKeyDown);
      this.dropdownElement.addEventListener('click', this.handleDropdownClick);

      // Carga inicial de filtros
      this.loadFilters();
      
      let lastCategoriesLength = storeGlobal.get().categoriesCatalog.length;
      let lastSelectedCategory = storeGlobal.get().selectedCategory;
      
      this.unsubscribeStore = storeGlobal.subscribe((state) => {
        const categoriesChanged = state.categoriesCatalog.length !== lastCategoriesLength;
        const selectionChanged = state.selectedCategory !== lastSelectedCategory;

        if (categoriesChanged || selectionChanged) {
          lastCategoriesLength = state.categoriesCatalog.length;
          lastSelectedCategory = state.selectedCategory;

          console.log("Search: Detectado cambio crítico en categorías. Repintando dropdown...");
          this.renderDropdownOptions(state.categoriesCatalog, state.selectedCategory);
        }
      });
      
    } else {
      console.error("Search Component Error: No se encontraron los elementos necesarios en el DOM.");
    }
  }

  /**
   * Helper unificado para obtener productos filtrados. Evita duplicación de lógica.
   */
  private getFilteredProducts(state: AppState): Product[] {
  let products = state.productsCatalog;

  // 1. Filtrar por Categoría seleccionada si no es la opción por defecto ("Todos")
  if (state.selectedCategory !== '') {
    products = products.filter(p => p.category_name === state.selectedCategory);
  }

  // 2. Filtrar por término de búsqueda (Query) en el nombre del producto
  if (state.searchQuery.trim() !== '') {
    const query = state.searchQuery.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(query));
  }

  return products;
}

  private async loadFilters(): Promise<void> {
    try {
      if (storeGlobal.get().categoriesCatalog && storeGlobal.get().categoriesCatalog.length > 0) {
        const state = storeGlobal.get();
        this.renderDropdownOptions(state.categoriesCatalog, state.selectedCategory);
        return;
      }
      
      const categories: Category[] = await window.paletteAPI.Products.getCategories();
      storeGlobal.update({ categoriesCatalog: categories });
    } catch (error) {
      console.error("Error al cargar las categorías en el buscador:", error);
    }
  }

  /**
   * Renderiza el dropdown usando solo strings de HTML dinámico.
   * La interactividad se gestiona de forma segura mediante delegación de eventos.
   */
  private renderDropdownOptions(categories: Category[], selectedCategory: string): void {
    if (!this.dropdownElement) return;

    let html = `
      <div class="dropdown-item ${selectedCategory === '' ? 'active' : ''}" data-category="">
        Todos los productos
      </div>
    `;

    categories.forEach(cat => {
      html += `
        <div class="dropdown-item ${selectedCategory === cat.name ? 'active' : ''}" data-category="${cat.name}">
          ${cat.name}
        </div>
      `;
    });

    this.dropdownElement.innerHTML = html;
  }

  private searchQuery(query: string): void {
    if (query === storeGlobal.get().searchQuery) return;
    storeGlobal.update({ searchQuery: query });
  }

  private selectProduct(product: Product): void {
    const currentScreen = storeGlobal.get().currentScreen;

    if (currentScreen === 'home') {
      storeGlobal.addProductToCart(product);
    } else if (currentScreen === 'editDelete') {
      storeGlobal.update({ selectedProductForEdit: product }); 
    }
  }

  // ==========================================
  // 🌟 MÉTODO DE LIMPIEZA ABSOLUTA (Destructor)
  // ==========================================
  public destroy(): void {
    // 1. Apagamos los eventos que se pegaron al 'document' global
    document.removeEventListener('click', this.handleFocusStealing);
    document.removeEventListener('click', this.handleCloseDropdown);

    // 2. Apagamos los listeners locales de los elementos del DOM actuales
    if (this.filterButton) {
      this.filterButton.removeEventListener('click', this.handleFilterButtonClick);
    }
    if (this.searchButton) {
      this.searchButton.removeEventListener('click', this.handleSearchButtonClick);
    }
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.handleSearchInput);
      this.searchInput.removeEventListener('keydown', this.handleSearchKeyDown);
    }
    if (this.dropdownElement) {
      this.dropdownElement.removeEventListener('click', this.handleDropdownClick);
    }

    // 3. Apagamos la suscripción activa al store
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    console.log("Search: El componente se desmontó. Limpieza completa de memoria realizada.");
  }
}