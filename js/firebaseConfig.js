// firebaseConfig.js
//
// Configuração do projeto "fast-analytics-1b0da" no Firebase.
//
// Essas chaves não precisam ficar escondidas — diferente de uma senha, a
// apiKey do Firebase é pública por natureza. A segurança de verdade vem das
// Regras do Firestore (veja o passo a passo que te mandei junto).

export const firebaseConfig = {
    apiKey: "AIzaSyAKagpk-731QsORRNey0jD2ocDaEsuKWik",
    authDomain: "fast-analytics-1b0da.firebaseapp.com",
    projectId: "fast-analytics-1b0da",
    storageBucket: "fast-analytics-1b0da.firebasestorage.app",
    messagingSenderId: "948312718910",
    appId: "1:948312718910:web:1a37b9893a6612f146db6f"
};

// Onde tudo fica salvo no Firestore: um único documento, dentro de uma
// única coleção. Não precisa mudar isso.
export const FIRESTORE_COLLECTION = 'fast_analytics';
export const FIRESTORE_DOC_ID = 'main';
