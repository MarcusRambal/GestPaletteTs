import { storeGlobal } from './store/Store.js';
import { MainWindow } from './components/mainWindow/MainWindow.js';
import { Balance } from './components/Balance.js';
import { Create } from './components/Create/Create.js';
import { EditDelete } from './components/EditDelete/EditDelete.js';

// Importamos los componentes compartidos
import { Search } from './components/mainWindow/subComponents/Search.js'; 
import { Products } from './components/mainWindow/subComponents/Products.js';

export class Router {
  private container: HTMLElement | null;
  
  // Instancias únicas de las vistas
  private homeView: MainWindow;
  private balanceView: Balance;
  private createView: Create;
  private editDeleteView: EditDelete;

  // Instancias únicas compartidas (inyectadas)
  private sharedSearch: Search;
  private sharedProducts: Products;

  private activeScreen: string | null = null;

  constructor(containerId: string) {
    // 1. Creamos las instancias de búsqueda y lista una sola vez en memoria
    this.sharedSearch = new Search();
    this.sharedProducts = new Products();
    
    // 2. Inyectamos las mismas instancias a las vistas que las necesitan
    this.homeView = new MainWindow(this.sharedSearch, this.sharedProducts);
    this.balanceView = new Balance();
    this.createView = new Create();
    
    // EditDelete recibe las dependencias reales
    this.editDeleteView = new EditDelete(this.sharedSearch, this.sharedProducts);
    
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Router Error: No se encontró el contenedor con id "${containerId}"`);
      return;
    }

    storeGlobal.subscribe((state) => this.evalRoute(state.currentScreen));

    this.evalRoute(storeGlobal.get().currentScreen);
  }

  /**
   * 🌟 LIMPIEZA DE COMPONENTES COMPARTIDOS
   * Al reutilizar Search y Products entre pantallas (Home y EditDelete),
   * debemos apagar sus listeners y suscripciones activas al desmontar cualquiera de ellas.
   */
  private destroySharedComponents(): void {
    console.log("[Router] Apagando componentes compartidos (Search & Products)...");
    this.sharedSearch.destroy();
    this.sharedProducts.destroy();
  }

  /**
   * 🌟 MÉTODO AUXILIAR: Se encarga de apagar de forma segura los listeners 
   * globales del componente que se está ocultando en el DOM.
   */
  private cleanupPreviousView(screen: string | null): void {
    if (!screen) return;

    console.log(`[Router] Desmontando y limpiando memoria de la pantalla: "${screen}"`);

    switch (screen) {
      case "home":
        // 1. Propagar destrucción en cascada dentro de MainWindow (Table y Checkout)
        if (typeof this.homeView.destroy === 'function') {
          this.homeView.destroy();
        }
        // 2. Apagar las suscripciones de los componentes compartidos inyectados
        this.destroySharedComponents();
        break;

      case "editDelete":
        // 1. Propagar destrucción interna de EditDelete si tuviera métodos propios

        if (typeof this.editDeleteView.destroy === 'function') {
          this.editDeleteView.destroy();
        }
        // 2. Apagar las suscripciones de los componentes compartidos inyectados
        this.destroySharedComponents();

        break;

      case "create":
        // Destruimos la vista Create (internamente limpia ProductForm y CategoryForm)
        if (typeof this.createView.destroy === 'function') {
          this.createView.destroy();
        }
        break;

      case "balance":
        /*
        if (typeof this.balanceView.destroy === 'function') {
          this.balanceView.destroy();
        }
          */
        break;
    }
  }

  private evalRoute(screen: "home" | "facturas" | "create" | "editDelete" | "balance"): void {
    if (!this.container) return;

    if (screen === this.activeScreen) {
      return; 
    }

    // 🌟 1. LIMPIEZA PREVENTIVA: Apagamos todos los eventos y suscripciones antes de cambiar de vista
    this.cleanupPreviousView(this.activeScreen);

    // 2. Limpiamos físicamente el DOM para evitar fugas de nodos huérfanos
    this.container.innerHTML = "";
    this.activeScreen = screen;

    // 3. Renderizamos la nueva pantalla activando sus suscripciones frescas
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