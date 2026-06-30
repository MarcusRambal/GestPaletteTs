console.log('antes del import del store')
import { storeGlobal } from './store/Store.js';
import { MainWindow } from './components/mainWindow/MainWindow.js';
import { Balance } from './components/Balance.js';
import { Create } from './components/Create/Create.js';
import { EditDelete } from './components/EditDelete/EditDelete.js';

export class Router {
  private container: HTMLElement | null;
  
  // Una sola instancia de las vistas para evitar re-renderizados innecesarios y mantener su estado interno
  private homeView: MainWindow;
  private balanceView: Balance;
  private createView:Create;
  private editDeleteView:EditDelete;

  private activeScreen: string | null = null;

  constructor(containerId: string) {
    
    this.homeView = new MainWindow();
    this.balanceView = new Balance();
    this.createView = new Create ();
    this.editDeleteView = new EditDelete();
    
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Router Error: No se encontró el contenedor con id "${containerId}"`);
      return;
    }

    storeGlobal.subscribe((state) => this.evalRoute(state.currentScreen));

    this.evalRoute(storeGlobal.get().currentScreen);
  }

  private evalRoute(screen: "home" | "facturas" | "create" | "editDelete" | "balance"): void {
    if (!this.container) return;

    if (screen === this.activeScreen) {
       // console.log(`Router: La pantalla "${screen}" ya está activa, evitando re-render innecesario.`);
      return; 
    }

    // Limpiamos el contenedor
    this.container.innerHTML = "";

    this.activeScreen = screen

    // Evaluamos la ruta y renderizamos la vista correspondiente
    switch (screen) {
      case "home": {
        this.homeView.render(this.container);
        break;
      }
      case "balance": {
        this.balanceView.render(this.container);
        break;
      }
      case "create": {
        this.createView.render(this.container);
        break;
      }
      case "editDelete": {
        this.editDeleteView.render(this.container);
        break;
      }
      default:
        this.container.innerHTML = "<h1>404 - Vista no encontrada o no implementada</h1>";
    }
  }
}