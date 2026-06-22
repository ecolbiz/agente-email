# CLAUDE.md — Contexto para o assistente

## O que é este projeto

Agente de organização de Gmail rodando em **Google Apps Script** (GAS), deployado via `clasp push`.

## Versão atual

`v1.0` — atualizar `VERSION` em `src/config.js` a cada rodada com mudanças. O número aparece visível no HTML do dashboard para o usuário confirmar que está na versão correta.

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

## Onde adicionar código novo

| O que fazer                          | Onde                             |
|--------------------------------------|----------------------------------|
| Nova regra (condição + ação)         | `src/email-classifier.js` (RULES) |
| Handler da nova regra                | `src/thread-analyzer.js`         |
| Novo label                           | `src/config.js` (LABELS) — após criar no Gmail |
| Novo contato para encaminhamento     | `src/config.js` (CONTATOS)       |
| Novo provedor de IA                  | `src/email-classifier.js` (_chamarProvider) |
| Novo tipo de prompt                  | `src/prompt-builder.js`          |

## Convenções

- Handlers em `thread-analyzer.js` NÃO chamam `marcarProcessado()` — o loop em `main.js` faz isso.
- `Logger_.rule()` e `Logger_.ai()` acumulam no histórico → aparecem no e-mail de resumo e no dashboard.
- `Logger_.info()` e `Logger_.warn()` só vão ao console do GAS (Stackdriver), não ao resumo.
- Funções prefixadas com `_` são privadas ao arquivo (convenção, sem enforcement).

## Deploy

```bash
clasp push   # envia src/ para o GAS
```

Após push: no GAS **Implantar → Gerenciar implantações → Editar → Nova versão** para atualizar a URL existente.

## Variáveis de ambiente

`.env` é ignorado pelo git e serve apenas como referência local. Em produção, as chaves ficam nas **Propriedades do script** do GAS.

## README

Manter `README.md` atualizado a cada iteração com novas funcionalidades ou mudanças de arquitetura.
