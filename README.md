# 🚀 Agency Analytics

Sistema web para análise de produtividade e rentabilidade de agências criativas.

## ✨ **NOVO**: Funcionalidades Avançadas

- **🎯 Dados de Demonstração**: Carregue dados realistas com 1 clique
- **⚠️ Sistema de Alertas**: Insights automáticos sobre problemas e oportunidades
- **📊 Comparação entre Profissionais**: Compare produtividade por cargo
- **💡 Oportunidades**: Identifique automaticamente seus melhores contratos e profissionais

## 📋 Funcionalidades Completas

- **Contratos**: Cadastro e gestão de clientes e contratos
- **Pessoas**: Gerenciamento de equipe e colaboradores
- **Squads**: Criação e organização de times de trabalho
- **Analytics**: 
  - ROI geral da operação
  - ROI por squad e por contrato
  - Custo por entregável
  - Produtividade comparativa
  - Ranking de performance
  - Ticket médio por pessoa

## 🏗️ Arquitetura

```
/
├── index.html              # Página principal
├── css/
│   ├── main.css           # Estilos base
│   └── components.css     # Componentes UI
└── js/
    ├── app.js             # Entry point
    ├── router.js          # Navegação SPA
    ├── store/
    │   └── storage.js     # Camada de persistência
    ├── services/
    │   ├── analyticsService.js   # Cálculos e análises
    │   ├── contractService.js    # Lógica de contratos
    │   ├── personService.js      # Lógica de pessoas
    │   └── squadService.js       # Lógica de squads
    ├── components/
    │   └── navbar.js      # Navegação
    └── pages/
        ├── dashboardPage.js      # Dashboard principal
        ├── contractsPage.js      # Página de contratos
        ├── peoplePage.js         # Página de pessoas
        └── squadsPage.js         # Página de squads
```

## 🎯 Padrões de Arquitetura

### Service Layer
Toda a lógica de negócio fica nos services:
- **analyticsService**: Cálculos de ROI, produtividade, comparações
- **contractService**: CRUD e validações de contratos
- **personService**: CRUD e validações de pessoas
- **squadService**: CRUD e validações de squads

### Storage Layer
Wrapper sobre localStorage que facilita migração futura para API:
```javascript
import storage from './store/storage.js';
const contracts = storage.getContracts();
```

### Component-Based UI
Componentes reutilizáveis e páginas modulares.

## 📊 Regras de Negócio

### ROI por Contrato
```
ROI = Receita - (Custo das pessoas atribuídas)
Margem = (ROI / Receita) × 100
```

### Custo por Entregável
```
Custo por Entregável = Salário / Total de Entregáveis da Pessoa
```

### ROI de Squad
```
ROI Squad = Receita Total dos Contratos - Custo Total do Squad
```

### Produtividade
Ranking baseado em:
- Volume de entregas
- Custo por entrega
- Ticket médio dos clientes

## 🧠 Sistema de Insights Automáticos

O sistema analisa seus dados e gera alertas e oportunidades automaticamente:

### Alertas Críticos (Vermelho)
- Contratos no prejuízo
- Margem geral < 20%
- Profissionais sobrecarregados (>100 entregas/mês)
- Squads no prejuízo

### Alertas de Atenção (Amarelo)
- Contratos com margem baixa (0-15%)
- Margem geral entre 20-30%
- Profissionais com carga alta (60-100 entregas)
- Pessoas sem contratos atribuídos
- Ponto único de falha (apenas 1 profissional no cargo)

### Informações (Azul)
- Disparidade de eficiência entre profissionais
- Squads muito grandes para poucos contratos

### Oportunidades (Verde)
- Contratos modelo (margem >40%)
- Top performers do time
- Benchmarks a serem replicados

## 🚀 Como Usar

### ⚡ Quick Start (Recomendado)

1. Clone e sirva localmente:
```bash
git clone [seu-repo]
cd agency-analytics
python3 -m http.server 8000
```

2. Acesse: `http://localhost:8000`

3. **Clique em "Carregar Dados Demo"** no Dashboard

4. Explore:
   - Dashboard → Veja insights e alertas automáticos
   - Comparação → Compare designers, copywriters, etc.
   - Contratos/Pessoas/Squads → Gerencie seus dados

### Desenvolvimento Local

1. Clone o repositório:
```bash
git clone [seu-repo]
cd agency-analytics
```

2. Sirva os arquivos com um servidor HTTP:
```bash
# Python
python -m http.server 8000

# Node.js (http-server)
npx http-server

# PHP
php -S localhost:8000
```

3. Acesse: `http://localhost:8000`

### Deploy na Vercel

1. Instale a Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Ou conecte o repositório GitHub diretamente na interface da Vercel.

### Deploy em Outros Hosts

Este é um site 100% estático. Pode ser hospedado em:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- Qualquer servidor web

Basta fazer upload dos arquivos para o servidor.

## 💾 Dados

### Persistência
Atualmente usa `localStorage` do navegador.

### Exportar Dados
Na página de contratos, clique em "Exportar Dados" para baixar um JSON com todos os dados.

### Importar Dados
Para importar dados, abra o Console do navegador:
```javascript
const data = { /* seus dados */ };
import('./js/store/storage.js').then(m => m.default.importData(data));
```

### Limpar Dados
```javascript
import('./js/store/storage.js').then(m => m.default.clearAll());
```

## 🎨 Personalização

### Cores
Edite as variáveis CSS em `css/main.css`:
```css
:root {
    --primary: #00ff41;        /* Verde neon */
    --bg-dark: #0a0a0a;        /* Fundo escuro */
    --bg-card: #1a1a1a;        /* Cards */
}
```

## 🔄 Migração para API

A arquitetura está preparada para migração fácil para backend:

1. **Storage Layer**: Substitua `storage.js` por chamadas HTTP
2. **Services**: Mantêm a mesma interface
3. **UI**: Nenhuma mudança necessária

Exemplo de migração:
```javascript
// Antes (localStorage)
getContracts() {
    return JSON.parse(localStorage.getItem('contracts'));
}

// Depois (API)
async getContracts() {
    const response = await fetch('/api/contracts');
    return response.json();
}
```

## 📈 Melhorias Futuras

Sugestões implementadas:
- ✅ Múltiplos tipos de entregáveis
- ✅ Comparação por cargo
- ✅ ROI detalhado por squad
- ✅ Exportação de dados

Próximas melhorias:
- [ ] Peso por tipo de entregável
- [ ] Custo por hora (além de salário)
- [ ] Capacidade máxima por pessoa
- [ ] Alertas de sobrecarga
- [ ] Simulações "what-if"
- [ ] Gráficos e visualizações
- [ ] Histórico temporal
- [ ] Metas e KPIs

## 🐛 Troubleshooting

### Dados não aparecem após refresh
Certifique-se de que o localStorage está habilitado no navegador.

### Erro ao importar módulos
Use um servidor HTTP. Arquivos não podem ser abertos diretamente (`file://`).

### Estilos não carregam
Verifique se os arquivos CSS estão no caminho correto.

## 📝 Licença

MIT License - use livremente!

## 👨‍💻 Autor

Desenvolvido com ⚡ para agências que querem dados reais de performance.
