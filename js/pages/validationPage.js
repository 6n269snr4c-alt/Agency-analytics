// validationPage.js - Validation page for cost verification

import contractService from '../services/contractService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';

export function renderValidationPage() {
    const contentEl = document.getElementById('content');
    
    const contracts = contractService.getAllContracts();
    const people = personService.getAllPeople();
    
    // Calculate total contract costs
    let totalContractCost = 0;
    const contractBreakdown = [];
    
    contracts.forEach(contract => {
        const roi = analyticsService.getContractROI(contract.id);
        totalContractCost += roi.cost;
        contractBreakdown.push({
            client: contract.client,
            cost: roi.cost
        });
    });
    
    // Calculate total payroll
    const totalPayroll = people.reduce((sum, person) => sum + person.salary, 0);
    
    // Calculate difference
    const difference = totalPayroll - totalContractCost;
    const differencePercentage = totalPayroll > 0 ? (difference / totalPayroll) * 100 : 0;
    
    const isValid = Math.abs(difference) < 0.01; // tolerance of 1 cent
    
    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Validação de Custos</h1>
            <p class="page-subtitle">Prova real: a soma dos custos dos contratos deve igualar a folha de pagamento</p>
        </div>

        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <!-- Total Contract Costs -->
            <div class="card" style="background: var(--bg-darker); border: 2px solid var(--border); padding: 1.5rem; border-radius: 8px;">
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                    📊 Soma de Todos os Contratos
                </div>
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">
                    R$ ${formatCurrency(totalContractCost)}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">
                    ${contracts.length} ${contracts.length === 1 ? 'contrato' : 'contratos'}
                </div>
            </div>

            <!-- Total Payroll -->
            <div class="card" style="background: var(--bg-darker); border: 2px solid var(--border); padding: 1.5rem; border-radius: 8px;">
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                    💰 Folha de Pagamento Total
                </div>
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">
                    R$ ${formatCurrency(totalPayroll)}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">
                    ${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'}
                </div>
            </div>

            <!-- Difference -->
            <div class="card" style="background: var(--bg-darker); border: 2px solid ${isValid ? 'var(--success)' : 'var(--error)'}; padding: 1.5rem; border-radius: 8px;">
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                    ${isValid ? '✅ Validação' : '⚠️ Diferença'}
                </div>
                <div style="font-size: 2rem; font-weight: bold; color: ${isValid ? 'var(--success)' : 'var(--error)'};">
                    ${isValid ? 'CORRETO' : 'R$ ' + formatCurrency(Math.abs(difference))}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">
                    ${isValid ? 'Custos batem perfeitamente!' : `${differencePercentage.toFixed(1)}% da folha`}
                </div>
            </div>
        </div>

        ${!isValid ? `
            <div style="background: var(--bg-darker); border: 2px solid var(--error); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0; color: var(--error);">⚠️ Atenção: Valores não batem!</h3>
                <p style="margin: 0; color: var(--text-secondary);">
                    ${difference > 0 
                        ? `Há <strong>R$ ${formatCurrency(difference)}</strong> na folha que não está sendo alocado aos contratos. Verifique se todos os colaboradores estão em contratos ativos.`
                        : `Os contratos têm <strong>R$ ${formatCurrency(Math.abs(difference))}</strong> a mais que a folha. Isso pode indicar erro nos cálculos ou pessoas duplicadas.`
                    }
                </p>
            </div>
        ` : ''}

        <!-- Breakdown by Contract -->
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
            <h3 style="margin: 0 0 1.5rem 0; color: var(--primary);">Breakdown por Contrato</h3>
            
            ${contractBreakdown.length > 0 ? `
                <div style="display: grid; gap: 0.75rem;">
                    ${contractBreakdown.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 4px;">
                            <span style="font-weight: 500;">${item.client}</span>
                            <span style="color: var(--primary); font-weight: bold;">R$ ${formatCurrency(item.cost)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 1.1rem;">TOTAL:</strong>
                        <strong style="font-size: 1.3rem; color: var(--primary);">R$ ${formatCurrency(totalContractCost)}</strong>
                    </div>
                </div>
            ` : `
                <p style="color: var(--text-secondary); text-align: center;">Nenhum contrato cadastrado</p>
            `}
        </div>

        <!-- Breakdown by Person -->
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem;">
            <h3 style="margin: 0 0 1.5rem 0; color: var(--primary);">Folha de Pagamento</h3>
            
            ${people.length > 0 ? `
                <div style="display: grid; gap: 0.75rem;">
                    ${people.map(person => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 4px;">
                            <div>
                                <span style="font-weight: 500;">${person.name}</span>
                                <span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">(${person.role})</span>
                            </div>
                            <span style="color: var(--primary); font-weight: bold;">R$ ${formatCurrency(person.salary)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 1.1rem;">TOTAL:</strong>
                        <strong style="font-size: 1.3rem; color: var(--primary);">R$ ${formatCurrency(totalPayroll)}</strong>
                    </div>
                </div>
            ` : `
                <p style="color: var(--text-secondary); text-align: center;">Nenhuma pessoa cadastrada</p>
            `}
        </div>

        <!-- Info Box -->
        <div style="background: var(--bg-darker); border-left: 4px solid var(--primary); padding: 1.5rem; margin-top: 2rem; border-radius: 4px;">
            <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">💡 Como interpretar</h4>
            <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-secondary);">
                <li style="margin-bottom: 0.5rem;">Se os valores <strong>batem</strong>: todos os salários estão sendo alocados corretamente aos contratos</li>
                <li style="margin-bottom: 0.5rem;">Se <strong>sobra na folha</strong>: há pessoas sem contratos ou com poucos entregáveis</li>
                <li>Se <strong>falta na folha</strong>: erro nos cálculos ou pessoas duplicadas em contratos</li>
            </ul>
        </div>
    `;
}

function formatCurrency(value) {
    return value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
