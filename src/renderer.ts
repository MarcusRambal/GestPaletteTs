import { Router } from './router.js';
import { storeGlobal } from './store/Store.js';

const router = new Router('main-screen');

const navHome = document.getElementById('nav-home') as HTMLButtonElement | HTMLElement | null;
const navBalance = document.getElementById('nav-balance') as HTMLButtonElement | HTMLElement | null;
const navCreate = document.getElementById('nav-create') as HTMLButtonElement | HTMLElement | null;
const navEditDelete = document.getElementById('nav-editDelete') as HTMLButtonElement | HTMLElement | null;

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

if(navCreate) {
  navCreate.addEventListener('click', ()=> {
    storeGlobal.update({currentScreen:'create'})
  })
}else {
  console.warn("Renderer Warning: No se encontro el elemento '#nav-create' en el DOM.")
}

if(navEditDelete) {
  navEditDelete.addEventListener('click', ()=> {
    storeGlobal.update({currentScreen: 'editDelete'})
  })
}else {
  console.warn("Renderer Warning: No se encontro el elemento '#nav-editDelete' en el DOM.")
}