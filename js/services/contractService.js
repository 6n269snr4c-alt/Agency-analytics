// contractsPage.js - MODIFICAÇÃO: Remover seleção de Head

// MODIFICAR A FUNÇÃO renderContractForm

function renderContractForm(contract = null) {
    const isEdit = !!contract;
    const squads = squadService.getAllSquads();
    const people = personService.getAllPeople();
    const deliverableTypes = storage.getDeliverableTypes();

    let assignedPeopleIds = [];
    let squadId = '';
    
    if (contract) {
        assignedPeopleIds = contract.assignedPeople || [];
        squadId = contract.squadId || '';
    }

    // ========================================
    // FILTRAR PESSOAS: REMOVER HEADS
    // ========================================
    const availablePeople = people.filter(person => {
        // Verificar se a pessoa é Head de algum squad
        const isHead = squads.some(squad => squad.headId === person.id);
        
        // REMOVER se for Head
        return !isHead;
    });

    return `
        <div class="modal-body" style="padding: var(--spacing-lg);">
            <form id="contractForm">
                <!-- Cliente -->
                <div class="form-group">
                    <label class="form-label">Cliente *</label>
                    <input 
                        type="text" 
                        name="client" 
                        class="form-input"
                        value="${contract ? contract.client : ''}"
                        required
                        placeholder="Nome do cliente"
                    >
                </div>

                <!-- Valor -->
                <div class="form-group">
                    <label class="form-label">Valor do Contrato (R$) *</label>
                    <input 
                        type="number" 
                        name="value" 
                        class="form-input"
                        value="${contract ? contract.value : ''}"
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    >
                </div>

                <!-- Squad -->
                <div class="form-group">
                    <label class="form-label">Squad</label>
                    <select name="squadId" class="form-select" id="squadSelect">
                        <option value="">Selecione um squad</option>
                        ${squads.map(squad => `
                            <option value="${squad.id}" ${squadId === squad.id ? 'selected' : ''}>
                                ${squad.name}
                            </option>
                        `).join('')}
                    </select>
                    <small style="color: var(--text-tertiary); font-size: 0.75rem; display: block; margin-top: 0.25rem;">
                        ℹ️ O Head Executivo será incluído automaticamente
                    </small>
                </div>

                <!-- Pessoas (SEM HEADS) -->
                <div class="form-group">
                    <label class="form-label">Pessoas do Squad</label>
                    <div style="
                        max-height: 200px;
                        overflow-y: auto;
                        border: 1px solid var(--border-color);
                        border-radius: var(--radius-md);
                        padding: var(--spacing-sm);
                        background: var(--bg-tertiary);
                    ">
                        ${availablePeople.length > 0 ? availablePeople.map(person => `
                            <label style="
                                display: flex;
                                align-items: center;
                                padding: var(--spacing-sm);
                                cursor: pointer;
                                border-radius: var(--radius-sm);
                                transition: background 0.15s ease;
                            " onmouseover="this.style.background='var(--bg-card-hover)'" 
                               onmouseout="this.style.background='transparent'">
                                <input 
                                    type="checkbox" 
                                    name="assignedPeople" 
                                    value="${person.id}"
                                    ${assignedPeopleIds.includes(person.id) ? 'checked' : ''}
                                    style="margin-right: var(--spacing-sm);"
                                >
                                <span style="flex: 1; color: var(--text-primary); font-size: 0.875rem;">
                                    ${person.name}
                                </span>
                                <span style="color: var(--text-tertiary); font-size: 0.75rem;">
                                    ${person.role}
                                </span>
                            </label>
                        `).join('') : `
                            <div style="
                                text-align: center;
                                padding: var(--spacing-lg);
                                color: var(--text-tertiary);
                            ">
                                Nenhuma pessoa disponível
                            </div>
                        `}
                    </div>
                </div>

                <!-- Entregáveis -->
                <div class="form-group">
                    <label class="form-label">Entregáveis</label>
                    <div id="deliverablesContainer">
                        ${deliverableTypes.map(type => {
                            const currentQty = contract && contract.deliverables ? 
                                (contract.deliverables[type.id] || 0) : 0;
                            
                            return `
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    gap: var(--spacing-sm);
                                    margin-bottom: var(--spacing-sm);
                                ">
                                    <label style="
                                        flex: 1;
                                        color: var(--text-secondary);
                                        font-size: 0.875rem;
                                    ">
                                        ${type.name}
                                    </label>
                                    <input 
                                        type="number" 
                                        name="deliverable_${type.id}"
                                        class="form-input"
                                        value="${currentQty}"
                                        min="0"
                                        placeholder="0"
                                        style="width: 100px;"
                                    >
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Botões -->
                <div style="
                    display: flex;
                    gap: var(--spacing-sm);
                    justify-content: flex-end;
                    margin-top: var(--spacing-xl);
                ">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'Salvar Alterações' : 'Criar Contrato'}
                    </button>
                </div>
            </form>
        </div>
    `;
}
