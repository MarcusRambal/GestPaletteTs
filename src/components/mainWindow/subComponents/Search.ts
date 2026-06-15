import { storeGlobal } from '../../../store/Store.js';
import type { Product } from '../../../../types/types.js';

export class Search {

  render(subContainer: HTMLElement): void {

    subContainer.innerHTML = `
      <div class="search-bar-box">
        <input type="text" id="search-input" placeholder="Buscar producto...">
        <button id="search-button">Buscar</button>
        <button id="filter-button">Filtrar <span>🔽</span></button>
        <button id="newTag-button">Nueva Etiqueta</button>
      </div>
    `;

    
    const searchButton = subContainer.querySelector('#search-button') as HTMLButtonElement | null;
    const searchInput = subContainer.querySelector('#search-input') as HTMLInputElement | null;

   

    const filterButton = subContainer.querySelector('#filter-button') as HTMLButtonElement | null;
    const newTagButton = subContainer.querySelector('#newTag-button') as HTMLButtonElement | null;

    if (searchButton && searchInput) {
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
      
    } else {
      console.error("Search Component Error: No se encontraron los elementos necesarios en el DOM.");
    }
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
  }
}