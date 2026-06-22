# CLAUDE.md — Contexto para o assistente

## O que é este projeto

Agente de organização de Gmail rodando em **Google Apps Script** (GAS), deployado via `clasp push`.

## Versão atual

`v1.5` — atualizar `VERSION` em `src/config.js` a cada rodada com mudanças. O número aparece visível no HTML do dashboard para o usuário confirmar que está na versão correta.

**Regra: sempre que houver qualquer alteração de código, incrementar VERSION e atualizar este arquivo.**

---

## Runtime: Google Apps Script

- Sem `require`, `import` ou módulos — todos os arquivos compartilham escopo global.
- HTTP via `UrlFetchApp.fetch()`, não `fetch()` nativo.
- Chaves de API em `PropertiesService.getScriptProperties()`, nunca hardcoded.
- `Logger` é nativo do GAS — o projeto usa `Logger_` (com underscore) para não colidir.
- Ordem de carregamento controlada por `filePushOrder` no `.clasp.json`.

---

## Regras sobre labels

**NUNCA criar labels automaticamente.** O usuário cria os labels no Gmail e referencia em `LABELS` no `config.js`.

- Todo e-mail processado recebe a label `LABELS.PROCESSADOS` (`-- Processados`) via `marcarProcessado()`, chamada no loop principal de `main.js`.
- Labels adicionais (ex: Daycoval, Newsletter) só são aplicadas se o label já existir no Gmail — `aplicarLabel()` retorna `false` silenciosamente se o label não existir.
- Ao adicionar um novo label ao projeto: primeiro o usuário cria no Gmail, depois adiciona em `LABELS` no `config.js`.
- Nunca usar `GmailApp.createLabel()` em nenhuma parte do código.

---

## Query padrão

Sempre operar sobre `in:inbox is:unread` (definido em `CONFIG.QUERY`). Nunca buscar em toda a caixa sem filtro.

---

## Arquitetura e ordem de carregamento

```
config.js → logger.js → gmail-reader.js → prompt-builder.js
  → thread-analyzer.js → email-classifier.js → main.js
```

## Arquitetura de regras (v1.5+)

**Regras dinâmicas** (criadas/editadas via aba "📋 Regras" do dashboard):
- Armazenadas em `PropertiesService` sob a chave `DYNAMIC_RULES` (array JSON).
- Cada regra contém: `id`, `name`, `enabled`, `conditions[]`, `logic` (AND/OR), `action` ({labels, encaminhar, arquivar}).
- Suporte a condições: `sender_domain`, `sender_email`, `sender_contains`, `subject` (com `*` curinga).
- CRUD completo: criar, editar, ativar/desativar, deletar — sem tocar no código.

**Regra fixa**: apenas `Geral (IA)` permanece hardcoded em `RULES` (email-classifier.js). Ela é o catch-all e usa IA para classificar.

**Avaliação de condições**: `avaliarCondicaoDinamica(message, conditions, logic)` em `email-classifier.js`.

## Onde adicionar código novo

| O que fazer                          | Onde                             |
|--------------------------------------|----------------------------------|
| Nova regra de e-mail                 | Dashboard → aba "📋 Regras"      |
| Novo tipo de condição                | `avaliarCondicaoDinamica()` em `email-classifier.js` + opção no form do dashboard |
| Novo label                           | Criar no Gmail; disponível automaticamente no dashboard |
| Novo provedor de IA                  | `src/email-classifier.js` (_chamarProvider) |
| Novo tipo de prompt                  | `src/prompt-builder.js`          |

## Convenções

- `Logger_.rule()` e `Logger_.ai()` acumulam no histórico → aparecem no e-mail de resumo e no dashboard.
- `Logger_.info()` e `Logger_.warn()` só vão ao console do GAS (Stackdriver), não ao resumo.
- Funções prefixadas com `_` são privadas ao arquivo (convenção, sem enforcement).
- `marcarProcessado()` é chamado pelo loop de `main.js`, não pelas regras individualmente.

## Deploy

```bash
clasp push   # envia src/ para o GAS
```

Após push: no GAS **Implantar → Gerenciar implantações → Editar → Nova versão** para atualizar a URL existente.

## Variáveis de ambiente

`.env` é ignorado pelo git e serve apenas como referência local. Em produção, as chaves ficam nas **Propriedades do script** do GAS.

## README

Manter `README.md` atualizado a cada iteração com novas funcionalidades ou mudanças de arquitetura.
