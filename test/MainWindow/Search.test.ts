import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Search } from '../../src/components/mainWindow/subComponents/Search.js';
import { storeGlobal } from '../../src/store/Store.js';

// 1. SIMULAR LAS APIs DE ELECTRON (window.paletteAPI)
global.window = global.window || {};
(global.window as any).paletteAPI = {
  Products: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 1, name: 'Paletas' },
      { id: 2, name: 'Helados' }
    ])
  }
};

describe('Pruebas del Componente Search.ts', () => {
  let container: HTMLElement;
  let searchComponent: Search;

  beforeEach(() => {
    // 2. Limpiar el Store antes de cada prueba
    storeGlobal.update({
      searchQuery: '',
      focusedProductIndex: 0,
      categoriesCatalog: [],
      productsCatalog: []
    });

    // 3. Crear un contenedor del DOM limpio en JSDOM
    container = document.createElement('div');
    document.body.appendChild(container);

    searchComponent = new Search();
  });

  afterEach(() => {
    document.body.innerHTML = ''; // Limpieza total del DOM virtual
  });

  test('Debería renderizar la estructura HTML básica y hacer foco inicial', () => {
    vi.useFakeTimers();

    // Act (Ejecutar)
    searchComponent.render(container);

    // Assert (Verificar estructura)
    const input = container.querySelector('#search-input') as HTMLInputElement;
    expect(input).toBeTruthy(); 
    expect(container.innerHTML).toContain('Buscar producto...'); 
    
    // 2. 🌟 Adelantamos el reloj virtual 50 milisegundos para que se ejecute el .focus()
    vi.advanceTimersByTime(50); 

    // 3. Verificamos si el input es efectivamente el elemento activo en el DOM simulado
    expect(document.activeElement).toBe(input);

    // 4. 🌟 Restauramos los relojes para que no afecten a otros tests
    vi.useRealTimers();
  });

  test('Debería actualizar el Store cuando el usuario escribe en el input', () => {
    searchComponent.render(container);
    const input = container.querySelector('#search-input') as HTMLInputElement;

    // Simular que el cajero escribe "Fresa"
    input.value = 'Fresa';
    input.dispatchEvent(new Event('input')); // Disparar el evento que escucha tu código

    // Verificar si nuestro Store reaccionó al evento
    expect(storeGlobal.get().searchQuery).toBe('Fresa');
  });
});