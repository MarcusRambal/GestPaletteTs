import { storeGlobal } from '../../../store/Store.js';
import type { Product } from '../../../../types/types.js';


export class Products {
  private productList: HTMLDivElement | null = null;

  private lastSearchQuery: string | null  = null
  private lastSelectedCategory: string | null = null
  private lastProductsLength: number = 0; 

  constructor() {
    this.productList = null;


    storeGlobal.subscribe((state) => {
  
        if (!this.productList || !document.body.contains(this.productList)) {
          console.log("Products: El componente no está visible en el DOM, ignorando renderizado de fondo.");
          return;
        }

        // Creamos una variable auxiliar para saber si el catálogo en el store tiene productos,
        // pero nosotros en nuestra propiedad local todavía no tenemos registro de ellos.
        const catalogHasLoaded = state.productsCatalog.length > 0 && (!this.lastProductsLength || this.lastProductsLength === 0);

        // Evaluamos si cambió el texto, cambió la categoría, O si los productos acaban de cargarse por primera vez
        if (
          state.searchQuery !== this.lastSearchQuery || 
          state.selectedCategory !== this.lastSelectedCategory ||
          catalogHasLoaded
        ) {
          
          // Sincronizamos las banderas de control
          this.lastSearchQuery = state.searchQuery;
          this.lastSelectedCategory = state.selectedCategory;
          this.lastProductsLength = state.productsCatalog.length; 

          this.renderList(state.productsCatalog, state.searchQuery, state.selectedCategory);
        }

        this.updateFocusedProduct(state.focusedProductIndex);
      });
  }

  render(subContainer: HTMLElement): void {
    subContainer.innerHTML = `

    <div class = "products-container">
        <div class="products-header"> 
          <h3>Productos</h3>
        </div>

      
          <div class="products-list" id="products-list">
            <p class="loading">Cargando productos...</p>
          </div>
      </div>
    `;

    // Asignamos el contenedor casteándolo correctamente
    this.productList = subContainer.querySelector('#products-list') as HTMLDivElement | null;
    
    this.loadProducts();
  }

  private async loadProducts(): Promise<void> {
   
    if (!this.productList) return;

    try {
      // Si hay productos en el catalogo evitamos volver a llamar a la api
      if(storeGlobal.get().productsCatalog.length > 0  ){
      
        //  console.log("Productos ya cargados en el store, evitando llamada a API.");
        this.productList.innerHTML = ""; 
        const state = storeGlobal.get();
        this.renderList(state.productsCatalog, state.searchQuery, state.selectedCategory);
        return;
      }
      

      const products: Product[] = await window.paletteAPI.Products.getProducts();
      
     // console.log("Productos obtenidos:", products);

      this.productList.innerHTML = ""; 

      storeGlobal.update({ productsCatalog: products });

    } catch (error) {
      console.error("Error al cargar productos:", error);
      this.productList.innerHTML = `<p class="error-text">Error al cargar productos.</p>`;
    }
  }

    // Renderizar productos
    private renderList (products: Product[], searchQuery: string, selectedCategory: string): void {

      console.log("Volviendo a renderizar")

      
      if (!this.productList){
        console.log("No hay productos que mostrar")
        return
      } 

      this.productList.innerHTML = ""; // Limpiamos el mensaje de carga

      if (products.length === 0) {
          this.productList.innerHTML = `<p class="null-text">No hay productos registrados.</p>`;
          return;
        }
      
      // Verificamos si hay input en la barra de busqueda y renderizamos el filtro
      if(searchQuery  && searchQuery.trim() !== '') {
          console.log("Filtrando productos por búsqueda:", searchQuery);
          products = products.filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) 
          );
        }

      if (selectedCategory && selectedCategory.trim() !== '') {
          console.log("Filtrando productos por categoría:", selectedCategory);
          products = products.filter(product => 
          product.category_name.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
        );
      }

      if (products.length === 0) {
        this.productList.innerHTML = `<p class="null-text">No hay productos que coincidan con los filtros.</p>`;
         return;
      }

        products.forEach((product, index )=> {
          
        
          const productCard = document.createElement('div') as HTMLDivElement;
          
          productCard.dataset.id = product.id.toString();

          const categoryClass = `cat-${product.category_name.toLowerCase().trim()}`;
          productCard.className = `product-card ${categoryClass}`;

          productCard.innerHTML = `
            <div class="product-info">
              <span class="product-name">${product.name}</span>
              <span class="product-category-name">${product.category_name}</span> 
            </div>
            <div class="product-price-badge">$${product.price}</div>
          `;

          productCard.addEventListener('click', () => {
          // 1. Sincronización visual opcional: 
          // Si haces clic, es buena UX que el índice del teclado se mueva a esta tarjeta
          storeGlobal.update({ focusedProductIndex: index });

          // 2. Despachas el producto al flujo del carrito
          console.log("Producto seleccionado por CLIC directamente al Store:", product);
        });

          this.productList!.appendChild(productCard);
        });

    }

    private updateFocusedProduct(focusedIndex: number): void {
      if (!this.productList) return;
        const productCards = this.productList.querySelectorAll('.product-card');

        productCards.forEach((card, index) => {
          if (index === focusedIndex) {
            card.classList.add('focused');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });            
          } else {
            card.classList.remove('focused');
          }
        });
    }
}