import { storeGlobal } from '../../../store/Store.js';
import type { Category } from '../../../../types/types.js';

export class ProductForm {
  private container: HTMLDivElement | null = null;

  render(subContainer: HTMLElement): void {
    // Estructura base inicial
    subContainer.innerHTML = `
      <div class="ProductForm-container">
        </div>
    `;

    this.container = subContainer.querySelector('.ProductForm-container');

    // Nos suscribimos para escuchar si hay cambios en el catálogo de categorías
    storeGlobal.subscribe((state) => {
      this.checkAndRenderForm(state.categoriesCatalog);
    });

    // Primera evaluación con el estado actual
    this.checkAndRenderForm(storeGlobal.get().categoriesCatalog);
  }

  private checkAndRenderForm(categories: Category[]): void {
    if (!this.container) return;

    // 🛡️ REGLA DE NEGOCIO: Bloqueo defensivo si no hay categorías
    if (!categories || categories.length === 0) {
      this.container.innerHTML = `
        <div class="form-warning-box">
          <p>⚠️ <strong>No se pueden registrar productos todavía.</strong></p>
          <p>Primero debes crear al menos una categoría (ej. Paletas, Helados) en el formulario adyacente para poder clasificar tus productos.</p>
        </div>
      `;
      return;
    }

    // Guardamos los valores que el usuario ya haya escrito por si el Store se actualiza en medio de la escritura
    const formOld = this.container.querySelector('#create-product-form') as HTMLFormElement | null;
    const oldName = (formOld?.querySelector('#prod-name') as HTMLInputElement)?.value || '';
    const oldPrice = (formOld?.querySelector('#prod-price') as HTMLInputElement)?.value || '';
    const oldCategory = (formOld?.querySelector('#prod-category') as HTMLSelectElement)?.value || '';

    // Si hay categorías, pintamos el formulario limpio y funcional
    this.container.innerHTML = `
    <div class = "productForm-container">
      <h3>✨ Registrar Nuevo Producto</h3>
      <form id="create-product-form" class="editor-form">
        <div class="form-group">
          <label for="prod-name">Nombre del Producto</label>
          <input type="text" id="prod-name" required placeholder="Ej. Paleta de Coco con Arequipe">
        </div>

        <div class="form-group">
          <label for="prod-price">Precio de Venta ($)</label>
          <input type="number" id="prod-price" required min="0" placeholder="Ej. 3500">
        </div>

        <div class="form-group">
          <label for="prod-category">Categoría Asignada</label>
          <select id="prod-category" required>
            </select>
        </div>

        <button type="submit" class="btn-primary">Guardar en Inventario</button>
      </form>
       </div>
    `;

    // Repoblamos el Select Dropdown con las categorías actuales
    const select = this.container.querySelector('#prod-category') as HTMLSelectElement;
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id.toString();
      option.textContent = cat.name;
      select.appendChild(option);
    });

    // Restauramos los valores viejos si existían
    if (formOld) {
      (this.container.querySelector('#prod-name') as HTMLInputElement).value = oldName;
      (this.container.querySelector('#prod-price') as HTMLInputElement).value = oldPrice;
      select.value = oldCategory || categories[0].id.toString();
    }

    // Escuchamos el envío del formulario recién renderizado
    this.setupFormSubmit();
  }

  private setupFormSubmit(): void {
    const form = this.container?.querySelector('#create-product-form') as HTMLFormElement | null;
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = form.querySelector('#prod-name') as HTMLInputElement;
      const priceInput = form.querySelector('#prod-price') as HTMLInputElement;
      const categorySelect = form.querySelector('#prod-category') as HTMLSelectElement;

      const selectedId = parseInt(categorySelect.value);
      const selectedName = categorySelect.options[categorySelect.selectedIndex].text;

      try {
          // 1. Enviamos a SQLite solo lo que su tabla acepta (id de categoría, no el texto)
          const cleanSQLPayload = {
            name: nameInput.value.trim(),
            price: parseFloat(priceInput.value),
            category_id: selectedId
          };

          const newProductId = await window.paletteAPI.Products.createProduct(cleanSQLPayload);

          // 2. Reconstruimos el objeto completo con la forma que espera tu interfaz de TypeScript (con category_name y active)
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

          form.reset();
          alert("¡Producto guardado de forma segura en la base de datos relacional!");
        } catch (error) {
          console.error(error);
        }
    });
  }
}