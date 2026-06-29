// authService.js
// Trava o app até alguém logar com e-mail/senha. De propósito NÃO existe
// tela de cadastro aqui — contas são criadas manualmente no Console do
// Firebase (Authentication > Users), pra controlar quem tem acesso.

import { getFirebaseApp } from '../firebaseApp.js';

let _auth = null;
let _fns = null; // funções do SDK (signIn, onAuthStateChanged, signOut, etc.)
let _authInitPromise = null;

async function _initAuth() {
    if (!_authInitPromise) {
        _authInitPromise = (async () => {
            const app = await getFirebaseApp();
            const mod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
            _auth = mod.getAuth(app);
            _fns = mod;
            return _auth;
        })();
    }
    return _authInitPromise;
}

/**
 * Resolve quando o usuário estiver autenticado — mostrando a tela de login
 * (dentro de #content) se ainda não estiver. Rejeita só se o serviço de
 * autenticação em si estiver inacessível (sem internet, Firebase fora do
 * ar) — nesse caso o app não tem como decidir se é seguro mostrar os
 * dados, então não prossegue.
 */
export async function ensureAuthenticated() {
    const auth = await _initAuth();

    return new Promise((resolve, reject) => {
        const unsubscribe = _fns.onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                if (user) {
                    resolve(user);
                } else {
                    renderLoginScreen(resolve);
                }
            },
            (error) => {
                unsubscribe();
                reject(error);
            }
        );
    });
}

export async function logout() {
    if (_auth && _fns) {
        await _fns.signOut(_auth);
    }
    location.reload();
}

export function getCurrentUserEmail() {
    return _auth && _auth.currentUser ? _auth.currentUser.email : null;
}

// ─── Tela de login ──────────────────────────────────────────────────────────

function renderLoginScreen(onSuccess) {
    const contentEl = document.getElementById('content');
    const navbarEl  = document.getElementById('navbar');
    if (navbarEl) navbarEl.innerHTML = '';

    contentEl.innerHTML = `
        <div class="login-screen">
            <form class="login-card" id="login-form">
                <h1 class="login-title">⚡ Fast Analytics</h1>
                <p class="login-subtitle">Entre com sua conta pra acessar o painel</p>

                <div class="form-group">
                    <label class="form-label">E-mail</label>
                    <input type="email" class="form-input" id="login-email" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label class="form-label">Senha</label>
                    <input type="password" class="form-input" id="login-password" required autocomplete="current-password">
                </div>

                <div id="login-error" class="login-error" style="display:none;"></div>

                <button type="submit" class="btn btn-primary" style="width:100%; margin-top:0.5rem;" id="login-submit">
                    Entrar
                </button>

                <a href="#" id="login-forgot" class="login-forgot">Esqueci minha senha</a>
            </form>
        </div>

        <style>${loginStyles()}</style>
    `;

    const form       = document.getElementById('login-form');
    const errorBox   = document.getElementById('login-error');
    const submitBtn  = document.getElementById('login-submit');
    const forgotLink = document.getElementById('login-forgot');

    const showError = (msg) => {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.style.display = 'none';
        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';

        try {
            const cred = await _fns.signInWithEmailAndPassword(_auth, email, password);
            onSuccess(cred.user);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
            showError(friendlyAuthError(err));
        }
    });

    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        errorBox.style.display = 'none';
        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            showError('Digite seu e-mail no campo acima primeiro, depois clique em "Esqueci minha senha".');
            return;
        }
        try {
            await _fns.sendPasswordResetEmail(_auth, email);
            showError('Te mandamos um e-mail com instruções pra trocar a senha.');
            errorBox.style.color = 'var(--fast-green, #7cfc00)';
        } catch (err) {
            showError(friendlyAuthError(err));
        }
    });
}

function friendlyAuthError(err) {
    const code = err && err.code || '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        return 'E-mail ou senha incorretos.';
    }
    if (code.includes('too-many-requests')) {
        return 'Muitas tentativas — espera um pouco e tenta de novo.';
    }
    if (code.includes('network-request-failed')) {
        return 'Sem conexão com o servidor de login. Verifique sua internet.';
    }
    return 'Não foi possível entrar. Tenta de novo em alguns instantes.';
}

function loginStyles() {
    return `
        .login-screen {
            min-height: 70vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-card {
            width: 100%;
            max-width: 360px;
            background: var(--bg-darker, #15151a);
            border: 1px solid var(--border, #2a2a2a);
            border-radius: 12px;
            padding: 2rem;
        }
        .login-title { margin: 0 0 0.3rem; font-size: 1.4rem; color: var(--primary, #00ff41); }
        .login-subtitle { margin: 0 0 1.5rem; font-size: 0.85rem; color: var(--text-secondary, #999); }
        .login-error {
            font-size: 0.82rem;
            color: var(--error, #f44336);
            margin: 0.75rem 0;
            padding: 0.6rem;
            background: rgba(244,67,54,0.1);
            border-radius: 6px;
        }
        .login-forgot {
            display: block;
            text-align: center;
            margin-top: 1rem;
            font-size: 0.8rem;
            color: var(--text-secondary, #999);
        }
    `;
}
