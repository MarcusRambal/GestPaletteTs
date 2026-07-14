import { Router } from './router.js';
import { storeGlobal } from './store/Store.js';

// Inicializamos el enrutador
const router = new Router('main-screen');

const sidebar = document.getElementById('sidebar-navigation');

// ========================================================
// 1. CONTROL DE EVENTOS: Solo expresamos intenciones al Store
// ========================================================
if (sidebar) {
  sidebar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const navButton = target.closest('[data-screen]');
    
    if (navButton) {
      const screen = navButton.getAttribute('data-screen');
      if (screen) {
        storeGlobal.update({ currentScreen: screen as any });
      }
    }
  });
}

// ========================================================
// 2. SUSCRIPCIÓN AL STORE: El DOM reacciona al estado global
// ========================================================
// Guardamos la última pantalla procesada para evitar manipular el DOM innecesariamente
let lastActiveScreen: string | null = null;

storeGlobal.subscribe((state) => {
  const currentScreen = state.currentScreen;

  // Optimización: Solo tocamos el DOM si la pantalla realmente cambió
  if (currentScreen !== lastActiveScreen && sidebar) {
    lastActiveScreen = currentScreen;

    console.log(`[Navigation] Sincronizando clase activa para la pantalla: ${currentScreen}`);

    // Buscamos todos los botones con el atributo 'data-screen' en el menú lateral
    const navButtons = sidebar.querySelectorAll('[data-screen]');

    navButtons.forEach((btn) => {
      const buttonScreen = btn.getAttribute('data-screen');
      
      if (buttonScreen === currentScreen) {
        btn.classList.add('active'); // Marcamos el botón de la vista actual
      } else {
        btn.classList.remove('active'); // Limpiamos el resto
      }
    });
  }
});