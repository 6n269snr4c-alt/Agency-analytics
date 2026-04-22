# Agency Analytics v2 - Sistema de Pesos por Função

## 🎯 O QUE MUDOU?

### Problema Anterior
No sistema antigo, todos os entregáveis tinham o mesmo "peso" no cálculo do custo:
```
Custo por Entregável = Salário / Número Total de Entregáveis
```

**Exemplo do problema:**
- Filmmaker com salário de R$ 3.000
- Entregáveis: 5 vídeos editados + 80 clipes
- Custo antigo: R$ 3.000 / 85 = **R$ 35,29 por entregável**

❌ **Problema:** Um vídeo editado completo custava o mesmo que um clipe simples!

---

### Solução Atual: Sistema de Pesos

Agora cada tipo de entregável tem um **peso** que representa sua complexidade/tempo:

```
Custo por Unidade de Peso = Salário / Soma dos Pesos dos Entregáveis
```

**Mesmo exemplo com pesos:**
- Vídeo Editado = **Peso 5** (complexo)
- Clipe = **Peso 1** (simples)
- Soma dos pesos: (5 vídeos × 5) + (80 clipes × 1) = **105 pontos**
- Custo novo: R$ 3.000 / 105 = **R$ 28,57 por ponto**

✅ **Resultado:**
- Custo de 1 vídeo editado = R$ 28,57 × 5 = **R$ 142,85**
- Custo de 1 clipe = R$ 28,57 × 1 = **R$ 28,57**

**Agora o vídeo completo custa 5x mais que o clipe, refletindo a realidade!** 🎉

---

## 📋 NOVA ESTRUTURA

### 1. Tipos de Entregáveis
Cadastro centralizado de todos os tipos de entregáveis que existem:

```javascript
{
  id: 'video_editado',
  name: 'Vídeo Editado',
  roles: ['Editor de Vídeo', 'Filmmaker'],  // Quais funções fazem isso
  defaultWeight: 5,                          // Peso padrão
  description: 'Vídeo completo editado e finalizado'
}
```

**Tipos Padrão Cadastrados:**
- Criativo Estático (peso 1)
- Vídeo Editado (peso 5)
- Clipe/Corte (peso 1)
- Roteiro (peso 2)
- Gestão de Tráfego (peso 3)
- Filmagem (peso 4)
- Motion Graphics (peso 4)
- Carrossel (peso 2)
- Stories (peso 0.5)
- Reels/TikTok (peso 2)

---

### 2. Funções (Roles)
Cada função tem seus próprios pesos configurados:

```javascript
{
  id: 'role_filmmaker',
  name: 'Filmmaker',
  deliverableWeights: {
    'video_editado': 5,    // Pode sobrescrever o peso padrão
    'clipe': 1,
    'filmagem': 4
  },
  description: 'Responsável por filmagem e edição'
}
```

**Funções Padrão:**
- Designer
- Copywriter
- Editor de Vídeo
- Filmmaker
- Gestor de Tráfego
- Head Executivo
- Head Criativo
- Fotógrafo
- Motion Designer
- Estrategista
- Social Media

---

### 3. Pessoas
Agora cada pessoa tem seus entregáveis registrados por tipo:

```javascript
{
  id: 'person_123',
  name: 'João Silva',
  role: 'Filmmaker',
  salary: 3000,
  deliverables: {
    'video_editado': 5,   // 5 vídeos editados
    'clipe': 80           // 80 clipes
  }
}
```

---

## 🛠️ COMO USAR

### Passo 1: Acessar Gestão de Funções

Clique em **"⚙️ Gestão de Funções"** no menu lateral.

### Passo 2: Configurar Pesos

Para cada função listada:

1. Clique no ícone **⚖️ (Configurar Pesos)**
2. Você verá todos os tipos de entregáveis que aquela função faz
3. Defina o peso de cada um:
   - **0.5** = Muito simples (ex: Stories)
   - **1** = Simples (ex: Clipe, Criativo básico)
   - **2-3** = Médio (ex: Carrossel, Roteiro)
   - **4-5** = Complexo (ex: Vídeo completo, Filmagem)

**Exemplo: Configurando Filmmaker**

| Tipo de Entregável | Peso | Justificativa |
|-------------------|------|---------------|
| Vídeo Editado | 5 | Processo completo: edição, efeitos, finalização |
| Clipe | 1 | Apenas corte de vídeo existente |
| Filmagem | 4 | Captação em campo, múltiplas tomadas |

### Passo 3: Salvar e Aplicar

1. Clique em **"Salvar Pesos"**
2. Os pesos são aplicados automaticamente a todos os cálculos
3. Todas as análises (Dashboard, ROI, Comparativos) já usam o novo sistema

---

## 📊 IMPACTO NOS CÁLCULOS

### Custo por Pessoa
**Antes:**
```
Designer com 20 criativos
Custo/Entregável = R$ 2.000 / 20 = R$ 100
```

**Agora:**
```
Designer com:
- 15 Criativos Estáticos (peso 1 cada) = 15 pontos
- 3 Carrosséis (peso 2 cada) = 6 pontos
- 10 Stories (peso 0.5 cada) = 5 pontos
Total: 26 pontos

Custo/Ponto = R$ 2.000 / 26 = R$ 76,92
```

### Custo em Contratos
**Antes:**
```
Contrato com 2 designers, cada um faz 10 criativos
Custo = Designer A (R$ 100 × 10) + Designer B (R$ 150 × 10)
      = R$ 1.000 + R$ 1.500 = R$ 2.500
```

**Agora:**
```
Mesmo contrato, mas com pesos:
- Designer A: custo R$ 76,92/ponto × 10 pontos = R$ 769,20
- Designer B: custo R$ 115,38/ponto × 10 pontos = R$ 1.153,80
Total: R$ 1.923,00
```

**Mais preciso porque considera a produtividade real de cada pessoa!**

---

## 🎓 EXEMPLOS PRÁTICOS

### Exemplo 1: Filmmaker Eficiente vs Ineficiente

**Filmmaker A - Eficiente**
- Salário: R$ 3.000
- Entregas: 10 vídeos (peso 5) + 100 clipes (peso 1) = 150 pontos
- Custo/ponto: R$ 3.000 / 150 = **R$ 20,00**

**Filmmaker B - Menos Produtivo**
- Salário: R$ 3.000
- Entregas: 5 vídeos (peso 5) + 50 clipes (peso 1) = 75 pontos
- Custo/ponto: R$ 3.000 / 75 = **R$ 40,00**

**Resultado:** Filmmaker A é **2x mais eficiente** (custo menor por ponto)!

---

### Exemplo 2: Designer Especializado em Carrosséis

**Designer Júlia**
- Salário: R$ 2.500
- Entregas mensais:
  - 5 Criativos Estáticos (peso 1) = 5 pontos
  - 15 Carrosséis (peso 2) = 30 pontos
  - Total: **35 pontos**
- Custo/ponto: R$ 2.500 / 35 = **R$ 71,43**

**Custo Real:**
- 1 Criativo Estático = R$ 71,43 × 1 = R$ 71,43
- 1 Carrossel = R$ 71,43 × 2 = **R$ 142,86**

**Insight:** Júlia está melhor alocada em carrosséis (seu forte)!

---

## 🔄 MIGRAÇÃO DE DADOS

### Se você já tem dados cadastrados:

1. **Pessoas já cadastradas:**
   - Continua funcionando normalmente
   - Configure os pesos das funções
   - O sistema aplicará automaticamente

2. **Contratos existentes:**
   - Mantém tudo igual
   - Os cálculos serão atualizados com os novos pesos

3. **Sem necessidade de recadastrar nada!**

---

## 📈 BENEFÍCIOS DO SISTEMA

✅ **Precisão nos Custos**
- Reflete a complexidade real de cada entregável
- Custos mais justos por cliente

✅ **Identificação de Produtividade**
- Compara pessoas da mesma função
- Identifica quem é mais eficiente

✅ **Melhor Precificação**
- Sabe exatamente quanto custa cada tipo de trabalho
- Precifica com margem adequada

✅ **Alocação Inteligente**
- Aloca pessoas mais eficientes em trabalhos complexos
- Maximiza ROI dos contratos

✅ **Flexibilidade**
- Ajusta pesos conforme a realidade da agência
- Diferentes funções têm pesos diferentes para o mesmo entregável

---

## 🚀 PRÓXIMOS PASSOS

1. **Acesse "Gestão de Funções"**
2. **Configure os pesos** de cada função
3. **Revise os cálculos** no Dashboard
4. **Compare** a análise antiga vs nova
5. **Ajuste os pesos** conforme necessário

---

## 💡 DICAS

### Como Definir Pesos Corretos?

**Método 1: Baseado em Tempo**
```
Se 1 Criativo = 2 horas
E 1 Vídeo = 8 horas

Peso do Vídeo = 8 / 2 = 4
```

**Método 2: Baseado em Valor**
```
Se 1 Criativo vale R$ 150
E 1 Vídeo vale R$ 600

Peso do Vídeo = 600 / 150 = 4
```

**Método 3: Baseado em Complexidade**
```
Escala de 0.5 a 5:
- 0.5 = Trivial (Stories)
- 1 = Simples (Post estático)
- 2 = Médio (Carrossel)
- 3 = Complexo (Roteiro)
- 4 = Muito Complexo (Filmagem)
- 5 = Extremamente Complexo (Vídeo completo)
```

### Recomendação
**Comece com pesos conservadores e ajuste ao longo do tempo baseado nos resultados reais!**

---

## 📞 SUPORTE

Se tiver dúvidas sobre como configurar ou usar o sistema de pesos, entre em contato!

**Lembre-se:** Este sistema foi feito especificamente para resolver o problema de pesos diferentes entre entregáveis. Aproveite ao máximo! 🚀
