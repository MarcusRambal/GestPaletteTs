import { storeGlobal } from '../store/Store.js';

export class Balance {
  render(contenedor: HTMLElement): void {
    contenedor.innerHTML = `
      <h1>Bienvenido al balance</h1>
      <button id="btn-volver">Volver al inicio</button>
    `;

    // 1. Capturamos el botón asegurando que es un HTMLButtonElement
    const btnVolver = contenedor.querySelector('#btn-volver') as HTMLButtonElement | null;

    if (btnVolver) {
      // 2. Escuchamos el click usando nuestro Store ya tipado
      btnVolver.addEventListener('click', () => {
        // Usamos los nombres exactos de tu interfaz AppState: 'update' y 'currentScreen'
        storeGlobal.update({ currentScreen: "home" });
      });
    } else {
      console.error("Balance Error: No se encontró el botón '#btn-volver' en el DOM.");
    }
  }
}