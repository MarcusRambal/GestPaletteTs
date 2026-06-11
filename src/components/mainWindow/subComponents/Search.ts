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

    // 1. Capturamos los elementos del DOM con su tipado específico
    const searchButton = subContainer.querySelector('#search-button') as HTMLButtonElement | null;
    const searchInput = subContainer.querySelector('#search-input') as HTMLInputElement | null;

    // Opcional: por si necesitas programar los otros botones más adelante
    const filterButton = subContainer.querySelector('#filter-button') as HTMLButtonElement | null;
    const newTagButton = subContainer.querySelector('#newTag-button') as HTMLButtonElement | null;

    // 2. Vinculamos el evento de forma segura
    if (searchButton && searchInput) {
      searchButton.addEventListener('click', () => {
        const query = searchInput.value; // TS sabe perfectamente que un HTMLInputElement tiene '.value'
        this.ejecutarBusqueda(query);
      });
      
      // Tip extra: Permitir buscar también al presionar 'Enter' dentro del input
      searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.ejecutarBusqueda(searchInput.value);
        }
      });
    } else {
      console.error("Search Component Error: No se encontraron los elementos necesarios en el DOM.");
    }
  }

  ejecutarBusqueda(query: string): void {
    console.log("Buscando de forma nativa:", query);
    // Próximo paso: filtrar 'activeProducts' en el componente Products mediante el Store Global
  }
}