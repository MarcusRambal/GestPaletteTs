import { storeGlobal } from '../../../store/Store.js';
import type { Category, Product } from '../../../../types/types.js';

export class Search {

  private dropdownElement: HTMLDivElement | null = null; 

  render(subContainer: HTMLElement): void {

    subContainer.innerHTML = `
    <div class = "search-container">
      <div class="search-bar-box">
        <input type="text" id="search-input" class = "search-input" placeholder="Buscar producto...">
        <button id="search-button" class= "search-button">Buscar</button>

      </div>

        
      <div class = "search-filter"> 
        <button id="filter-button">Filtrar <span>🔽</span></button>
          <div id="filter-dropdown" class="filter-dropdown hidden">
            <div class="dropdown-item active" data-category="">Todos los productos</div>
          </div>
      </ div>
      
    </div>
    `;

    
    const searchButton = subContainer.querySelector('#search-button') as HTMLButtonElement | null;
    const searchInput = subContainer.querySelector('#search-input') as HTMLInputElement | null;
    const filterButton = subContainer.querySelector('#filter-button') as HTMLButtonElement | null;

    this.dropdownElement = subContainer.querySelector('#filter-dropdown') as HTMLDivElement | null;

    if (searchButton && searchInput && filterButton && this.dropdownElement) {


      // ✨ 1. ENFOQUE INICIAL: El cursor parpadea de forma inmediata al renderizar la vista
      setTimeout(() => searchInput.focus(), 50);

      // ✨ 2. SECUESTRO DE FOCO PERSISTENTE EN PANTALLA:
      // Si el cajero hace clic en un fondo vacío del buscador o de la app, le regresamos el foco al input
      document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        
        // Excepciones: NO quitamos el foco si el usuario interactúa explícitamente con inputs, botones o el dropdown
        if (
          target.tagName === 'INPUT' || 
          target.tagName === 'BUTTON' || 
          target.closest('.filter-dropdown')
        ) {
          return; 
        }

        // Si dio click afuera (un área muerta), forzamos el foco de vuelta
        searchInput.focus();
      });


      // Evento para abrir/cerrar el dropdown
      filterButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el evento cierre el menú inmediatamente
        this.dropdownElement?.classList.toggle('hidden');
      });

      // Cerrar el dropdown si se hace clic fuera del buscador
      document.addEventListener('click', () => {
        this.dropdownElement?.classList.add('hidden');
      });


      searchButton.addEventListener('click', () => {
        const query = searchInput.value; 
        this.searchQuery(query);
      });

      searchInput.addEventListener('input', () => {
        const query = searchInput.value;
        
        
        const productsFiltered = storeGlobal.get().productsCatalog.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase())
        );

        // Enviamos todo al Store de un solo golpe: query, catálogo filtrado y reseteamos el foco al inicio
        storeGlobal.update({ 
          searchQuery: query,
          focusedProductIndex: productsFiltered.length > 0 ? 0 : -1 
        });
      });    
      
    
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
        const state = storeGlobal.get();
  
        let currentProducts = state.productsCatalog;
        if (state.searchQuery.trim() !== '') {
          currentProducts = state.productsCatalog.filter(product => 
            product.name.toLowerCase().includes(state.searchQuery.toLowerCase())
          );
        }
        
        const totalItems = currentProducts.length;
        const currentIndex = state.focusedProductIndex;
        console.log("Indice actual: ", currentIndex)

        switch(e.key) {
          case "Enter": {
            e.preventDefault();

            // Verificamos que el indice este apuntando a un producto de la lista
            if (currentIndex >= 0 && currentIndex < currentProducts.length) {
              
              const productoSeleccionado = currentProducts[currentIndex];

              console.log("¡Teclado detectado! Producto capturado en Search:", productoSeleccionado);
              
              this.selectProduct(productoSeleccionado);

              // ✨ 3. FLUJO POS POST-SELECCIÓN:
              // Limpiamos la caja de texto para la siguiente venta y aseguramos el foco
              searchInput.value = '';
              storeGlobal.update({ searchQuery: '', focusedProductIndex: 0 });
              searchInput.focus();
              

            } else {
              console.log("Presionó Enter pero el índice no apunta a ningún producto válido (o la lista está vacía).");
            }
            
            break;
          }

          case "ArrowDown": {
            e.preventDefault();
            if (totalItems === 0) return;

            // UX de bucle: si llega al final, regresa al primero (0)
            const nextIndex = currentIndex + 1 >= totalItems ? 0 : currentIndex + 1;
            console.log("Indice luego de darle una vez al downArrow: ", nextIndex)
            storeGlobal.update({ focusedProductIndex: nextIndex });
            break;
          }

          case "ArrowUp": {
            e.preventDefault();
            if (totalItems === 0) return;

            // UX de bucle: si presiona arriba en el primero, salta al último
            const prevIndex = currentIndex - 1 < 0 ? totalItems - 1 : currentIndex - 1;
            
            storeGlobal.update({ focusedProductIndex: prevIndex });
            break;
           }
         }
      });

      this.loadFilters();
      
      let lastCategoriesLength = storeGlobal.get().categoriesCatalog.length;
      let lastSelectedCategory = storeGlobal.get().selectedCategory;
      // Suscribirse al Store para repintar las opciones si cambia la categoría seleccionada
      storeGlobal.subscribe((state) => {
        // OJO: Solo repintamos el DOM si cambió el número de categorías o la selección activa
        const categoriesChanged = state.categoriesCatalog.length !== lastCategoriesLength;
        const selectionChanged = state.selectedCategory !== lastSelectedCategory;

        if (categoriesChanged || selectionChanged) {
          // Actualizamos las variables de control (caché)
          lastCategoriesLength = state.categoriesCatalog.length;
          lastSelectedCategory = state.selectedCategory;

          // Ejecutamos el redibujado en el DOM real
          console.log("Search: Detectado cambio crítico en categorías. Repintando dropdown...");
          this.renderDropdownOptions(state.categoriesCatalog, state.selectedCategory);
        }
      });
      
    } else {
      console.error("Search Component Error: No se encontraron los elementos necesarios en el DOM.");
    }
  }

  private async loadFilters(): Promise<void> {
    try {
      // Si ya existen categorías en el Store, no golpeamos la base de datos de nuevo
      if (storeGlobal.get().categoriesCatalog && storeGlobal.get().categoriesCatalog.length > 0) {
        const state = storeGlobal.get();
        this.renderDropdownOptions(state.categoriesCatalog, state.selectedCategory);
        return;
      }
      
      // Llamada limpia usando tu nueva query IPC
      const categories: Category[] = await window.paletteAPI.Products.getCategories();
      
      // Guardamos directamente en la propiedad global correspondiente de tu Store
      storeGlobal.update({ categoriesCatalog: categories });

    } catch (error) {
      console.error("Error al cargar las categorías en el buscador:", error);
    }
  }

  // Dibuja las cajitas interactivas del menú desplegable de forma dinámica
  private renderDropdownOptions(categories: Category[], selectedCategory: string): void {
    if (!this.dropdownElement) return;

    this.dropdownElement.innerHTML = '';

    // Opción por defecto para remover el filtro
    const allOption = document.createElement('div');
    allOption.className = `dropdown-item ${selectedCategory === '' ? 'active' : ''}`;
    allOption.textContent = 'Todos los productos';
    allOption.addEventListener('click', () => {
      storeGlobal.update({ selectedCategory: '', focusedProductIndex: 0 });
    });
    this.dropdownElement.appendChild(allOption);

    // Inyectamos las categorías traídas desde SQLite
    categories.forEach(cat => {
      const option = document.createElement('div');
      option.className = `dropdown-item ${selectedCategory === cat.name ? 'active' : ''}`;
      option.textContent = cat.name;

      option.addEventListener('click', () => {
        storeGlobal.update({ 
          selectedCategory: cat.name, 
          focusedProductIndex: 0 // Reseteamos foco al primer ítem del nuevo filtro
        });
      });

      this.dropdownElement?.appendChild(option);
    });
  }


  private searchQuery(query: string): void {
    console.log("Buscando de forma nativa:", query);

    if(query === storeGlobal.get().searchQuery) {
      console.log("La consulta de búsqueda es la misma que la actual, evitando actualización innecesaria.");
      return;
    }

    storeGlobal.update({ searchQuery: query });

  }

  private selectProduct (product:Product ):void {
      console.log("Producto Seleccionado: ",  product)
      storeGlobal.addProductToCart(product);
  }
}