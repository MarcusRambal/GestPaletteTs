import { storeGlobal } from '../../../store/Store.js';
import type { Product } from '../../../../types/types.js';
import type { AppState} from '../../../store/Store.js';

export class Products {
  private productList: HTMLDivElement | null = null;
  private unsubscribeStore: (() => void) | null = null;

  // Banderas de control de última sincronización
  private lastSearchQuery: string | null = null;
  private lastSelectedCategory: string | null = null;
  private lastProductsLength: number = 0;
  private lastFilteredCatalog: Product[] | null = null;

  constructor() {}

  render(subContainer: HTMLElement): void {
    // 🌟 Limpieza preventiva antes de montar la nueva vista
    this.destroy();

    subContainer.innerHTML = `
      <div class="products-container">
        <div class="products-header"> 
          <h3>Productos</h3>
        </div>
        <div class="products-list" id="products-list">
          <p class="loading">Cargando productos...</p>
        </div>
      </div>
    `;

    this.productList = subContainer.querySelector('#products-list') as HTMLDivElement | null;
    
    if (this.productList) {
      // 🌟 Un único event listener delegado para TODAS las tarjetas de producto
      this.productList.addEventListener('click', this.handleProductClick);

      // Iniciar la suscripción reactiva descendente de manera segura al renderizar
      this.unsubscribeStore = storeGlobal.subscribe((state) => {
        this.handleStoreUpdate(state);
      });
    }

    this.loadProducts();
  }

  /**
   * Procesa la actualización del Store y decide si redibujar o solo mover el foco
   */
  private handleStoreUpdate(state: AppState): void {
    if (!this.productList || !document.body.contains(this.productList)) {
      console.log("Products: El componente no está visible en el DOM, ignorando renderizado de fondo.");
      return;
    }

    const filteredProducts = this.getFilteredProducts(state);

    // Bandera para detectar si el catálogo se cargó por primera vez
    const catalogHasLoaded = state.productsCatalog.length > 0 && this.lastProductsLength === 0;

    // 🌟 Detectamos si el catálogo de origen (filteredCatalog) cambió físicamente
    const filteredCatalogChanged = state.filteredCatalog !== this.lastFilteredCatalog;

    // Evaluamos si cambió el término de búsqueda, la categoría seleccionada o el catálogo base
    if (
      state.searchQuery !== this.lastSearchQuery || 
      state.selectedCategory !== this.lastSelectedCategory ||
      catalogHasLoaded || filteredCatalogChanged
    ) {
      // Sincronizamos las banderas de control local
      this.lastSearchQuery = state.searchQuery;
      this.lastSelectedCategory = state.selectedCategory;
      this.lastProductsLength = state.productsCatalog.length;
      this.lastFilteredCatalog = state.filteredCatalog || null;

      // Renderizamos únicamente la porción de productos filtrados
      this.renderList(filteredProducts);
    }

    // Mover el foco visual (esto corre siempre de manera fluida)
    this.updateFocusedProduct(state.focusedProductIndex);
  }

  /**
   * 🌟 MOTOR DE FILTRADO UNIFICADO:
   * Garantiza consistencia total con la lógica de navegación por teclado del buscador.
   */
  private getFilteredProducts(state: AppState): Product[] {
    // 🌟 Si estamos en una vista de gestión y existe filteredCatalog en el Store, 
    // lo usamos como base de datos local. Si no, usamos el catálogo general de activos.
    const isEditDelete = state.currentScreen === 'editDelete';
    let products = (isEditDelete && state.filteredCatalog) 
      ? state.filteredCatalog 
      : state.productsCatalog;

    // 1. Filtrar por categoría
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

  private async loadProducts(): Promise<void> {
    if (!this.productList) return;

    try {
      const state = storeGlobal.get();

      // Si los productos ya están en memoria, no tocamos la base de datos (SQLite / API)
      if (state.productsCatalog.length > 0) {
        this.productList.innerHTML = "";
        
        this.lastSearchQuery = state.searchQuery;
        this.lastSelectedCategory = state.selectedCategory;
        this.lastProductsLength = state.productsCatalog.length;
        this.lastFilteredCatalog = state.filteredCatalog || null;

        const filtered = this.getFilteredProducts(state);
        this.renderList(filtered);
        return;
      }
      
      const products: Product[] = await window.paletteAPI.Products.getProducts();
      this.productList.innerHTML = ""; 

      // Al actualizar, la suscripción reactiva se encarga del renderizado
      storeGlobal.update({ productsCatalog: products });

    } catch (error) {
      console.error("Error al cargar productos:", error);
      this.productList.innerHTML = `<p class="error-text">Error al cargar el catálogo de productos.</p>`;
    }
  }

  /**
   * Renderiza la lista pre-filtrada.
   * Cero listeners individuales; utiliza una estructura de datos limpia en HTML dinámico.
   */
  private renderList(products: Product[]): void {
    if (!this.productList) return;

    this.productList.innerHTML = ""; // Limpiar spinner de carga o estado previo

    if (products.length === 0) {
      this.productList.innerHTML = `<p class="null-text">No hay productos que coincidan con los filtros.</p>`;
      return;
    }

    let html = "";
    products.forEach((product) => {
      const categoryClass = `cat-${product.category_name.toLowerCase().trim()}`;
      
      html += `
        <div class="product-card ${categoryClass}" data-id="${product.id}">
          <div class="product-info">
            <span class="product-name">${product.name}</span>
            <span class="product-category-name">${product.category_name}</span> 
          </div>
          <div class="product-price-badge">$${product.price}</div>
        </div>
      `;
    });

    this.productList.innerHTML = html;
  }

  /**
   * Manejador delegado de clics para las tarjetas de producto.
   * Evita fugas de memoria al estar anclado permanentemente al contenedor padre.
   */
  private handleProductClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const card = target.closest('.product-card') as HTMLDivElement | null;

    if (card) {
      const productId = parseInt(card.getAttribute('data-id') || '0', 10);
      const state = storeGlobal.get();
      
      // 🌟 Buscamos de forma segura: si estamos en editDelete, buscamos en filteredCatalog 
      // (que tiene los activos o inactivos según la pestaña). Si no, caemos a productsCatalog.
      const sourceCatalog = (state.currentScreen === 'editDelete' && state.filteredCatalog)
        ? state.filteredCatalog
        : state.productsCatalog;

      const product = sourceCatalog.find(p => p.id === productId);

      if (product) {
        const currentScreen = state.currentScreen;
        if (currentScreen === 'home') {
          storeGlobal.addProductToCart(product);
        } else if (currentScreen === 'editDelete') {
          storeGlobal.update({ selectedProductForEdit: product });
        }
        console.log("Producto seleccionado por CLIC delegado:", product);
      }
    }
  };

  /**
   * Actualiza el enfoque visual (.focused) del producto seleccionado
   */
  private updateFocusedProduct(focusedIndex: number): void {
    if (!this.productList) return;
    const productCards = this.productList.querySelectorAll('.product-card');

    productCards.forEach((card, index) => {
      if (index === focusedIndex) {
        card.classList.add('focused');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });            
      } else {
        card.classList.remove('focused');
      }
    });
  }

  /**
   * 🌟 DESTRUCTOR PÚBLICO:
   * Apaga la suscripción al store y desmonta de raíz los listeners del DOM
   */
  public destroy(): void {
    // 1. Limpiar el listener delegado del contenedor
    if (this.productList) {
      this.productList.removeEventListener('click', this.handleProductClick);
    }

    // 2. Cancelar de forma segura la suscripción activa al Store
    if (this.unsubscribeStore) {
      console.log("Products: Cancelando suscripción al Store para prevenir fugas de memoria.");
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
  }
}