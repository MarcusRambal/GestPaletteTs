import { CategoryForm } from './subComponents/CategoryForm.js'
import { ProductForm } from './subComponents/ProductForm.js'

export class Create {


    private categoryForm: CategoryForm | null = null;
    private productForm: ProductForm | null = null;

    render(container: HTMLElement) {

    container.innerHTML = `
      <div class="create-container"> 
         <div id="CategoryForm-container"></div>
          <div id="ProductForm-container"></div> 
      </div>
    `;

    const categoryFormContainer = container.querySelector('#CategoryForm-container') as HTMLDivElement | null;
    const productFormContainer = container.querySelector('#ProductForm-container') as HTMLDivElement | null;
    

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
}