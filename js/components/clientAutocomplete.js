// clientAutocomplete.js
// Autocomplete reutilizável para campos "Cliente" em qualquer formulário.
// Usa a lista unificada de clientService (contratos recorrentes + projetos pontuais).
// Uso: attachClientAutocomplete(inputElement)

import clientService from '../services/clientService.js';

// ─── ID único para o dropdown ativo ──────────────────────────────────────────
let _activeDropdownId = null;

function _removeDropdown() {
    if (_activeDropdownId) {
        const el = document.getElementById(_activeDropdownId);
        if (el) el.remove();
        _activeDropdownId = null;
    }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Ativa o autocomplete de clientes em um <input>.
 * Pode ser chamado múltiplas vezes (re-attach seguro).
 *
 * @param {HTMLInputElement} input - O campo de texto
 */
export function attachClientAutocomplete(input) {
    if (!input) return;

    // Evitar listeners duplicados
    if (input._autocompleteAttached) return;
    input._autocompleteAttached = true;

    // Posição relativa: o wrapper precisa de position:relative
    const wrapper = input.parentElement;
    if (wrapper && getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
    }

    input.addEventListener('input', () => _onInput(input));
    input.addEventListener('keydown', (e) => _onKeydown(e, input));
    input.addEventListener('blur', () => {
        // Pequeno delay para permitir click no item antes de fechar
        setTimeout(_removeDropdown, 150);
    });
}

function _onInput(input) {
    const query = input.value.trim();
    _removeDropdown();

    if (query.length < 1) return;

    const all     = clientService.getAllClientNames();
    const q       = query.toLowerCase();
    const matches = all.filter(n => n.toLowerCase().includes(q));

    if (matches.length === 0) return;

    _showDropdown(input, matches, query);
}

function _showDropdown(input, matches, query) {
    const dropId = 'client-ac-' + Date.now();
    _activeDropdownId = dropId;

    const dropdown = document.createElement('div');
    dropdown.id    = dropId;
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 9999;
        background: var(--bg-card, #1a1a1a);
        border: 1px solid var(--fast-green, #7cfc00);
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 220px;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;

    let highlighted = -1;

    matches.forEach((name, idx) => {
        const item = document.createElement('div');
        item.dataset.idx = idx;

        // Destacar a parte que bate com a query
        const lc  = name.toLowerCase();
        const pos = lc.indexOf(query.toLowerCase());
        let label = name;
        if (pos !== -1) {
            label =
                _esc(name.slice(0, pos)) +
                `<strong style="color:var(--fast-green,#7cfc00)">${_esc(name.slice(pos, pos + query.length))}</strong>` +
                _esc(name.slice(pos + query.length));
        }

        item.innerHTML = label;
        item.style.cssText = `
            padding: 0.6rem 0.875rem;
            cursor: pointer;
            font-size: 0.9rem;
            border-bottom: 1px solid var(--border, #2a2a2a);
            transition: background 0.1s;
        `;

        item.addEventListener('mouseenter', () => {
            _setHighlight(dropdown, idx);
            highlighted = idx;
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = '';
        });
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // impede blur antes do click
            input.value = name;
            input._autocompleteAttached = false; // permite re-attach futuro
            _removeDropdown();
            // Disparar evento para que outros listeners (validação, etc.) detectem a mudança
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        dropdown.appendChild(item);
    });

    input.parentElement.appendChild(dropdown);

    // Navegação por teclado via closure
    input._acHighlighted   = highlighted;
    input._acDropdownId    = dropId;
    input._acMatches       = matches;
}

function _onKeydown(e, input) {
    const dropId = input._acDropdownId;
    if (!dropId) return;
    const dropdown = document.getElementById(dropId);
    if (!dropdown) return;

    const items = dropdown.querySelectorAll('div');
    let hi      = input._acHighlighted ?? -1;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        hi = Math.min(hi + 1, items.length - 1);
        _setHighlight(dropdown, hi);
        input._acHighlighted = hi;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        hi = Math.max(hi - 1, 0);
        _setHighlight(dropdown, hi);
        input._acHighlighted = hi;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (hi >= 0 && items[hi]) {
            e.preventDefault();
            input.value = input._acMatches[hi];
            input._autocompleteAttached = false;
            _removeDropdown();
            input.dispatchEvent(new Event('input',  { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    } else if (e.key === 'Escape') {
        _removeDropdown();
    }
}

function _setHighlight(dropdown, idx) {
    dropdown.querySelectorAll('div').forEach((el, i) => {
        el.style.background = i === idx
            ? 'rgba(124,252,0,0.1)'
            : '';
    });
}

function _esc(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
