import { CategoryForm } from './subComponents/CategoryForm.js';
import { ProductForm } from './subComponents/ProductForm.js';

export class Create {
  private categoryForm: CategoryForm | null = null;
  private productForm: ProductForm | null = null;

  constructor() {}

  render(container: HTMLElement): void {
    // 🌟 1. Limpieza preventiva: si existían formularios anteriores, los destruimos de raíz
    this.destroy();

    container.innerHTML = `
      <div class="create-container"> 
        <div id="CategoryForm-container"></div>
        <div id="ProductForm-container"></div> 
      </div>
    `;

    const categoryFormContainer = container.querySelector('#CategoryForm-container') as HTMLDivElement | null;
    const productFormContainer = container.querySelector('#ProductForm-container') as HTMLDivElement | null;

    // 2. Instanciación e inicialización segura
    if (categoryFormContainer) {
      this.categoryForm = new CategoryForm();
      this.categoryForm.render(categoryFormContainer);
    } else {
      console.error("Create Error: No se encontró '#CategoryForm-container' en el DOM.");
    }

    if (productFormContainer) {
      this.productForm = new ProductForm();
      this.productForm.render(productFormContainer);
    } else {
      console.error("Create Error: No se encontró '#ProductForm-container' en el DOM.");
    }
  }

  /**
   * 🌟 DESTRUCTOR EN CASCADA:
   * Se encarga de apagar de forma segura los eventos de los subformularios
   * y liberar sus referencias en memoria.
   */
  public destroy(): void {
    if (!this.productForm && !this.categoryForm) {
      return;
    }

    console.log("[Create] Desmontando vista de creación. Destruyendo subformularios...");

    // Destrucción segura mediante encadenamiento opcional
    if (this.productForm && typeof this.productForm.destroy === 'function') {
      this.productForm.destroy();
    }
    
    if (this.categoryForm && typeof this.categoryForm.destroy === 'function') {
      this.categoryForm.destroy();
    }

    // Anulamos las referencias para que el recolector de basura (Garbage Collector) actúe
    this.productForm = null;
    this.categoryForm = null;

    console.log("Create: Subformularios destruidos limpiamente de la memoria.");
  }
}