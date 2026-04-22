# 📦 SISTEMA DE PESOS - FAST DIGITAL 360

## ✅ INSTRUÇÕES DE INSTALAÇÃO

### 🎯 O QUE ESTE PACOTE CONTÉM:

**5 ARQUIVOS NOVOS** (adicionar ao projeto):
- `js/models/dataModels.js` - Modelos de dados com pesos
- `js/pages/rolesPage.js` - Página de Gestão de Funções
- `css/roles.css` - Estilos da página de funções  
- `SISTEMA_DE_PESOS.md` - Documentação completa
- `RESUMO_EXECUTIVO.md` - Guia executivo rápido

**4 ARQUIVOS ATUALIZADOS** (substituir os existentes):
- `index.html` - Adicionado link para roles.css
- `js/app.js` - Adicionada rota /roles
- `js/store/storage.js` - Adicionadas funções getRoles(), saveRoles(), getDeliverableTypes()
- `js/services/analyticsService.js` - Cálculos atualizados para usar pesos

---

## 🚀 COMO INSTALAR (3 PASSOS):

### 1️⃣ Extrair arquivos
```bash
# Baixe o ZIP e extraia
unzip sistema-pesos-fast.zip
cd sistema-pesos-fast
```

### 2️⃣ Copiar para seu projeto GitHub
```bash
# Entre no seu projeto
cd /caminho/para/seu/agency-analytics

# Copie TODOS os arquivos (sobrescreve os 4 existentes)
cp -r /caminho/onde/extraiu/sistema-pesos-fast/* .
```

### 3️⃣ Fazer commit e push
```bash
git add .
git commit -m "feat: Sistema de Pesos por Função integrado"
git push
```

---

## ✅ PRONTO!

Após o push, a Vercel fará deploy automático.

Acesse: **SEU-PROJETO.vercel.app/roles**

Lá você poderá configurar os pesos para cada função!

---

## 📊 COMO USAR O SISTEMA:

1. Acesse **"Gestão de Funções"** no menu
2. Adicione as funções da sua agência (ex: Filmmaker, Designer, etc)
3. Configure os pesos para cada tipo de entregável por função
4. Pronto! Os cálculos já usarão os pesos automaticamente

---

## 📚 DOCUMENTAÇÃO:

- **SISTEMA_DE_PESOS.md** - Documentação técnica completa
- **RESUMO_EXECUTIVO.md** - Guia rápido para gestores

---

**Desenvolvido para Fast Digital 360** ⚡  
**Data:** Abril 2026
