// rolesPage.js - Gestão de Funções (Sistema de Pesos)

import storage from '../store/storage.js';

export function renderRolesPage() {
    const contentEl = document.getElementById('content');
    
    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">⚙️ Gestão de Funções</h1>
            <p class="page-subtitle">Configure os pesos dos entregáveis para cada função</p>
        </div>

        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
            <h3 style="margin-top: 0;">📌 Como funciona o sistema de pesos?</h3>
            <p><strong>O peso determina a complexidade de cada tipo de entregável.</strong></p>
            <p><strong>Exemplo para Filmmaker:</strong></p>
            <ul style="margin: 0.5rem 0 0.5rem 1.5rem;">
                <li>Vídeo Editado = <strong>Peso 5</strong> (muito complexo)</li>
                <li>Clipe = <strong>Peso 1</strong> (simples)</li>
            </ul>
            <p style="margin-top: 1rem;"><strong>Resultado:</strong> 5 vídeos + 80 clipes = (5×5) + (80×1) = 105 pontos<br>
            Os clipes não pesam tanto quanto os vídeos! ✅</p>
        </div>

        <div class="empty-state">
            <div class="empty-state-icon">🚧</div>
            <h3>Página em Construção</h3>
            <p>O sistema de pesos está sendo finalizado.</p>
            <p>Por enquanto, os cálculos usam valores padrão.</p>
        </div>
    `;
}
