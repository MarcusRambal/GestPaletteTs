import { storeGlobal } from "../../../store/Store.js";

// Pool estático de los 30 colores semánticos que definimos
const COLOR_POOL = [
  "cat-strawberry", "cat-raspberry", "cat-blackberry", "cat-cherry", "cat-watermelon", "cat-bubblegum",
  "cat-mango", "cat-passion", "cat-lemon", "cat-banana", "cat-lime", "cat-mint", "cat-kiwi", "cat-pistachio",
  "cat-chocolate", "cat-nut", "cat-caramel", "cat-coffee", "cat-vanilla", "cat-coconut",
  "cat-blueberry", "cat-sky", "cat-turquoise", "cat-grape", "cat-lavender", "cat-cyan", "cat-denim", "cat-plum",
  "cat-slate", "cat-charcoal"
];

export class CategoryForm {
  private container: HTMLDivElement | null = null;
  private formElement: HTMLFormElement | null = null;

  // Guardamos la referencia de la función para poder remover el listener limpiamente
  private handleSubmitBound = this.handleSubmit.bind(this);

  render(subContainer: HTMLElement): void {
    // 1. Limpieza defensiva previa
    this.destroy();

    subContainer.innerHTML = `
        <h3>✨ Registrar Nueva Categoría</h3>
        <form id="create-category-form" class="editor-form">
          <div class="form-group">
            <label for="cat-name">Nombre de la Categoría</label>
            <input type="text" id="cat-name" required placeholder="Ej. Copas Especiales">
          </div>
          <button type="submit" class="btn-primary">Añadir Categoría</button>
        </form>
    `;

    this.container = subContainer as HTMLDivElement;
    this.formElement = this.container.querySelector('#create-category-form');
    
    this.setupForm();
  }

  private setupForm(): void {
    if (this.formElement) {
      this.formElement.addEventListener('submit', this.handleSubmitBound);
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!this.formElement) return;

    const nameInput = this.formElement.querySelector('#cat-name') as HTMLInputElement | null;
    if (!nameInput) return;

    const categoryName = nameInput.value.trim();
    if (!categoryName) return;

    // 1. Recuperar el catálogo actual de categorías desde el Store
    const currentCategories = storeGlobal.get().categoriesCatalog;

    // 2. Validación defensiva: Evitar nombres duplicados
    const nameExists = currentCategories.some(
      cat => cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );
    if (nameExists) {
      console.log(`La categoría "${categoryName}" ya existe. No se puede registrar duplicados.`);
      return;
    }

    // 3. Extraer los colores que ya están siendo utilizados en la base de datos
    const usedColors = currentCategories.map(cat => cat.color);

    // 4. Buscar el primer color del pool que NO esté en la lista de usados
    const nextAvailableColor = COLOR_POOL.find(color => !usedColors.includes(color));

    // 5. Caso de borde: Si se llenan las 30, asignamos un color gris neutro por defecto
    const finalColor = nextAvailableColor || "cat-slate";

    const newCategoryPayload = {
      name: categoryName,
      color: finalColor
    };

    try {
      // 6. Persistencia en SQLite a través del canal IPC
      const newId = await window.paletteAPI.Products.createCategory(newCategoryPayload);
      
      // 7. Actualización reactiva del Store global
      storeGlobal.update({
        categoriesCatalog: [
          ...currentCategories, 
          { id: newId, name: categoryName, color: finalColor }
        ]
      });
      
      // 8. Feedback y limpieza
      this.formElement.reset();
      console.log(`Categoría "${categoryName}" registrada exitosamente con ID ${newId} y color "${finalColor}".`);
    } catch (error) {
      console.error("Error al crear la categoría en la base de datos:", error);
    }
  }

  /**
   * 🌟 DESTRUCTOR SEGURO:
   * Remueve los manejadores de eventos del DOM y limpia referencias para evitar fugas de memoria.
   */
  public destroy(): void {
    if (this.formElement) {
      this.formElement.removeEventListener('submit', this.handleSubmitBound);
      this.formElement = null;
    }
    this.container = null;
    console.log("[CategoryForm] Eventos removidos e instancia destruida.");
  }
}