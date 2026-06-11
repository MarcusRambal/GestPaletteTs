import { Product } from "../../types/types.js";


export interface AppState {
  currentScreen: "home" | "balance" | "configuracion"; // Puedes limitar las pantallas válidas aquí
  productsCatalog: Product[];
  facturasCargadas: any[]; 
}

// Definimos el tipo para las funciones suscriptoras
type SubscriberCallback = (state: AppState) => void;

class Store {
  // En TS debemos declarar las propiedades antes del constructor
  private state: AppState;
  private subscribers: SubscriberCallback[] = [];

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  // Obtener el estado (retorna el tipo AppState estricto)
  get(): AppState {
    return this.state;
  }

  // Modificar el estado usando Partial para permitir cambios parciales
  update(nuevoFragmento: Partial<AppState>): void {
    //Evitar spam si la pantalla no cambia al boton
    if (nuevoFragmento.currentScreen && nuevoFragmento.currentScreen === this.state.currentScreen) {
      console.log(`Store: La pantalla "${nuevoFragmento.currentScreen}" ya está activa, evitando actualización innecesaria.`);
    return; 
  }
    this.state = { ...this.state, ...nuevoFragmento };
    
    // Notificar a cada componente suscrito
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Registrar un componente para escuchar los cambios
  subscribe(callback: SubscriberCallback): void {
    this.subscribers.push(callback);
  }
}

// Instancia única para toda la aplicación (Singleton)
export const storeGlobal = new Store({
  currentScreen: "home",
  productsCatalog: [],
  facturasCargadas: []
});