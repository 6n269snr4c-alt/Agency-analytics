// firebaseApp.js
// Inicializa o app do Firebase UMA ÚNICA VEZ, compartilhado entre o
// storage.js (Firestore) e o authService.js (Auth). Usa import() dinâmico
// de propósito — um import estático de URL remota travaria o carregamento
// do módulo inteiro se a rede falhasse; com import() dinâmico, a falha é
// só uma Promise rejeitada, capturável com segurança por quem chamar.

import { firebaseConfig } from './firebaseConfig.js';

let _appPromise = null;

export function getFirebaseApp() {
    if (!_appPromise) {
        _appPromise = (async () => {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
            return initializeApp(firebaseConfig);
        })();
    }
    return _appPromise;
}
