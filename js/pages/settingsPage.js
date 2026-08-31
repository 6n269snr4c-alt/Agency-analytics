// settingsPage.js — Configurações do sistema
// Permite ajustar os thresholds dos insights (alertas, avisos, oportunidades)
// sem precisar editar código. Os valores são salvos no localStorage/Firestore.

import storage from '../store/storage.js';
import { INSIGHT_DEFAULTS } from '../services/insightsService.js';

export function renderSettingsPage() {
    const contentEl = document.getElementById('content');
    const saved = (storage.getSettings() || {}).insights || {};
    const t = { ...INSIGHT_DEFAULTS, ...saved };

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">⚙️ Configurações</h1>
            <p class="page-subtitle">Ajuste os critérios dos insights que aparecem no Dashboard</p>
        </div>

        <div class="settings-grid">

            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">🔴 Margem da Agência</h2></div>
                <div class="widget-body">
                    <div class="setting-row">
                        <label class="setting-label">
                            Alerta crítico se margem abaixo de
                            <span class="setting-hint">Aparece em vermelho no Dashboard quando a margem geral da operação cai abaixo desse valor</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-margemCritica" value="${t.margemCritica}" min="0" max="100" step="1"> %
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">
                            Aviso de atenção se margem abaixo de
                            <span class="setting-hint">Aparece em amarelo quando a margem está entre o valor crítico e esse valor</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-margemAtencao" value="${t.margemAtencao}" min="0" max="100" step="1"> %
                        </div>
                    </div>
                </div>
            </div>

            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">📋 Contratos Individuais</h2></div>
                <div class="widget-body">
                    <div class="setting-row">
                        <label class="setting-label">
                            Margem baixa se abaixo de
                            <span class="setting-hint">Contratos com margem positiva mas abaixo desse valor aparecem como "margem baixa"</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-margemBaixa" value="${t.margemBaixa}" min="0" max="100" step="1"> %
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">
                            Contrato modelo se margem acima de
                            <span class="setting-hint">Contratos acima desse valor aparecem como oportunidade "Contratos modelo" no Dashboard</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-margemModelo" value="${t.margemModelo}" min="0" max="100" step="1"> %
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">
                            Quantidade de contratos modelo a exibir
                            <span class="setting-hint">Quantos contratos modelo aparecem nas Oportunidades (os melhores)</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-topModeloQtd" value="${t.topModeloQtd}" min="1" max="20" step="1">
                        </div>
                    </div>
                </div>
            </div>

            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">👥 Carga de Trabalho</h2></div>
                <div class="widget-body">
                    <div class="setting-row">
                        <label class="setting-label">
                            Sobrecarregado (crítico) se acima de
                            <span class="setting-hint">Multiplicador vs a média dos pares do mesmo cargo. Ex: 2.0 = o dobro da média</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-cargaCritica" value="${t.cargaCritica}" min="1" max="10" step="0.1"> x
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">
                            Carga elevada (aviso) se acima de
                            <span class="setting-hint">Multiplicador mais brando — gera um aviso amarelo, não vermelho</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-cargaAtencao" value="${t.cargaAtencao}" min="1" max="10" step="0.1"> x
                        </div>
                    </div>
                </div>
            </div>

            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">⚖️ Eficiência e Recursos</h2></div>
                <div class="widget-body">
                    <div class="setting-row">
                        <label class="setting-label">
                            Disparidade de custo/entrega acima de
                            <span class="setting-hint">Diferença % entre o mais caro e o mais barato do mesmo cargo. Acima disso → informação</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-disparidadeCusto" value="${t.disparidadeCusto}" min="0" max="500" step="5"> %
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">
                            Ponto único de falha: 1 pessoa no cargo com mais de
                            <span class="setting-hint">Se há apenas 1 pessoa num cargo e o total de contratos passa desse número → aviso</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-pontoUnicoContratos" value="${t.pontoUnicoContratos}" min="1" max="50" step="1"> contratos
                        </div>
                    </div>
                </div>
            </div>

            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">🏢 Squads</h2></div>
                <div class="widget-body">
                    <div class="setting-row">
                        <label class="setting-label">
                            Squad grande demais se mais de
                            <span class="setting-hint">Número de pessoas no squad acima do qual o sistema sugere que pode estar grande demais</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-squadGrandeMax" value="${t.squadGrandeMax}" min="1" max="30" step="1"> pessoas
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">
                            ...com menos de
                            <span class="setting-hint">Número de contratos abaixo do qual o squad grande gera o aviso</span>
                        </label>
                        <div class="setting-input-wrap">
                            <input type="number" class="form-input setting-input" id="s-squadGrandeMinContr" value="${t.squadGrandeMinContr}" min="1" max="30" step="1"> contratos
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <div style="display:flex; gap:1rem; margin-top:1.5rem;">
            <button class="btn btn-primary" onclick="window.saveSettings()">💾 Salvar Configurações</button>
            <button class="btn btn-secondary" onclick="window.resetSettings()">🔄 Restaurar Padrões</button>
        </div>

        <style>
            .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
            @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }
            .setting-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border, #2a2a2a); }
            .setting-row:last-child { border-bottom: none; }
            .setting-label { flex: 1; font-size: 0.88rem; }
            .setting-hint { display: block; font-size: 0.74rem; color: var(--text-secondary, #888); margin-top: 0.2rem; }
            .setting-input-wrap { display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; font-size: 0.85rem; color: var(--text-secondary); }
            .setting-input { width: 70px; text-align: center; font-size: 0.88rem; padding: 0.3rem; }
        </style>
    `;

    const fields = ['margemCritica','margemAtencao','margemBaixa','margemModelo','topModeloQtd',
                    'cargaCritica','cargaAtencao','disparidadeCusto','pontoUnicoContratos',
                    'squadGrandeMax','squadGrandeMinContr'];

    window.saveSettings = () => {
        const insights = {};
        fields.forEach(f => {
            const el = document.getElementById('s-' + f);
            if (el) insights[f] = parseFloat(el.value);
        });
        const current = storage.getSettings() || {};
        current.insights = insights;
        storage.saveSettings(current);
        alert('✅ Configurações salvas! O Dashboard já vai usar os novos valores.');
    };

    window.resetSettings = () => {
        if (!confirm('Restaurar todos os valores para o padrão original?')) return;
        const current = storage.getSettings() || {};
        delete current.insights;
        storage.saveSettings(current);
        renderSettingsPage();
    };
}
