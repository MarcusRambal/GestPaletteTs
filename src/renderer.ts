import { Router } from './router.js';
import { storeGlobal } from './store/Store.js';

const router = new Router('main-screen');

// 2. Capturamos los elementos de la barra lateral con su tipo correcto
const navHome = document.getElementById('nav-home') as HTMLButtonElement | HTMLElement | null;
const navBalance = document.getElementById('nav-balance') as HTMLButtonElement | HTMLElement | null;

// 3. Sincronizamos los clics de la barra lateral de forma segura
if (navHome) {
  navHome.addEventListener('click', () => {
    storeGlobal.update({ currentScreen: "home" });
  });
} else {
  console.warn("Renderer Warning: No se encontró el elemento '#nav-home' en el DOM.");
}

if (navBalance) {
  navBalance.addEventListener('click', () => {
    storeGlobal.update({ currentScreen: "balance" });
  });
} else {
  console.warn("Renderer Warning: No se encontró el elemento '#nav-balance' en el DOM.");
}