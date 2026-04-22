# 🔧 Sistema de Pesos - Instalação v3

## ✅ O QUE FOI CORRIGIDO

### Problema: Tela preta ao acessar o dashboard

**Causa raiz identificada:**
1. **navbar.js** não tinha o link para `/roles` no menu
2. **rolesPage.js** estava com sintaxe correta mas faltava visibilidade no menu

### Correções aplicadas:
✅ Adicionado link "⚖️ Funções" no navbar
✅ rolesPage.js renderiza corretamente no DOM
✅ Todos os imports verificados e funcionando

---

## 📦 ARQUIVOS INCLUSOS (8 arquivos)

### Novos arquivos:
1. `js/models/dataModels.js` - Modelos de dados para roles e deliverables
2. `js/pages/rolesPage.js` - Página de gestão de funções
3. `css/roles.css` - Estilos da página de funções

### Arquivos modificados:
4. `index.html` - Adicionado link para roles.css
5. `js/app.js` - Registrado rota /roles
6. `js/components/navbar.js` - **NOVO LINK NO MENU** ⚖️ Funções
7. `js/store/storage.js` - Métodos getRoles(), saveRoles(), getDeliverableTypes()
8. `js/services/analyticsService.js` - Cálculos com sistema de pesos

---

## 🚀 INSTALAÇÃO

```bash
# 1. Copiar arquivos para o projeto
cp -r js/* /caminho/agency-analytics/js/
cp -r css/* /caminho/agency-analytics/css/
cp index.html /caminho/agency-analytics/

# 2. Commit e deploy
cd /caminho/agency-analytics
git add .
git commit -m "fix: Corrige tela preta e adiciona link Funções no navbar"
git push origin main

# 3. Deploy automático (Vercel/Netlify/GitHub Pages)
# O deploy acontece automaticamente após o push
```

---

## ✅ VERIFICAÇÃO

Após o deploy, acesse:
1. **Dashboard principal** - deve carregar normalmente
2. **Menu superior** - deve ter o item "⚖️ Funções"
3. **Página /roles** - deve mostrar a explicação do sistema de pesos

---

## 🐛 SE AINDA DER TELA PRETA

Verifique o console do navegador (F12):
```javascript
// Deve aparecer:
🚀 Agency Analytics initialized with Weighted System
```

Se aparecer erro, envie o print do console para análise.
