import { storeGlobal } from './store/Store.js';
import { MainWindow } from './components/mainWindow/MainWindow.js';
import { Balance } from './components/Balance.js';

export class Router {
  private container: HTMLElement | null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Router Error: No se encontró el contenedor con id "${containerId}"`);
      return;
    }

    // TS ya sabe gracias a la interfaz del Store que 'state.currentScreen' es un string específico
    storeGlobal.suscribe((state) => this.evalRoute(state.currentScreen));

    this.evalRoute(storeGlobal.get().currentScreen);
  }

  // Especificamos que 'screen' debe ser estrictamente uno de los tipos válidos del AppState
  private evalRoute(screen: "home" | "facturas" | "configuracion" | "balance"): void {
    // Protección por si el constructor falló al encontrar el contenedor
    if (!this.container) return;

    // Limpiamos el contenedor antes de inyectar la nueva vista
    this.container.innerHTML = "";

    // Decidimos qué componente instanciar y renderizar
    switch (screen) {
      case "home": {
        const home = new MainWindow();
        home.render(this.container);
        break;
      }
      case "balance": {
        const balance = new Balance();
        balance.render(this.container);
        break;
      }
      default:
        this.container.innerHTML = "<h1>404 - Vista no encontrada o no implementada</h1>";
    }
  }
}