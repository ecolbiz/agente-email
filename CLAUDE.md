# CLAUDE.md — Contexto para o assistente

## O que é este projeto

Agente de organização de Gmail rodando em **Google Apps Script** (GAS). Não usa Node.js em produção — o `package.json` só existe para dotenv no desenvolvimento local. O código é enviado ao GAS via `clasp push`.

## Runtime importante: Google Apps Script

- **Não há `require`, `import`, ou módulos** — todos os arquivos compartilham o mesmo escopo global.
- APIs disponíveis: `GmailApp`, `UrlFetchApp`, `PropertiesService`, `Session`, `HtmlService`, `Utilities`.
- HTTP é feito via `UrlFetchApp.fetch()`, não `fetch()` nativo.
- Chaves de API ficam em `PropertiesService.getScriptProperties()`, nunca hardcoded.
- `Logger` é um objeto nativo do GAS — o projeto usa `Logger_` (com underscore) para evitar conflito.

## Arquitetura e ordem de carregamento

O `filePushOrder` no `.clasp.json` define a sequência de carregamento no GAS (dependências primeiro):

```
config.js → logger.js → gmail-reader.js → prompt-builder.js
  → thread-analyzer.js → email-classifier.js → main.js
```

## Onde adicionar código novo

| O que fazer                         | Onde                          |
|-------------------------------------|-------------------------------|
| Nova regra de remetente/assunto     | `src/email-classifier.js` (array `RULES`) |
| Lógica de processamento da regra    | `src/thread-analyzer.js`      |
| Novo provedor de IA                 | `src/email-classifier.js` (`_chamarProvider`) |
| Novo tipo de prompt                 | `src/prompt-builder.js`       |
| Constantes globais                  | `src/config.js`               |

## Convenções

- Funções prefixadas com `_` são privadas ao arquivo (convenção, não enforcement).
- `Logger_.success()` e `Logger_.error()` acumulam no histórico e aparecem no resumo por e-mail.
- `Logger_.info()` e `Logger_.warn()` só vão ao console (Stackdriver Logs), não ao e-mail.
- Toda função que aplica label usa `aplicarLabel()` de `gmail-reader.js`.

## Deploy

```bash
clasp push          # envia src/ para o GAS
clasp open          # abre o projeto no editor do GAS
```

## Trigger principal

Função: `organizarEmails(false)` — roda sobre e-mails não lidos.
Configurar trigger de tempo no GAS (ex.: a cada hora).

## Variáveis de ambiente (apenas local)

O `.env` é ignorado pelo git e serve apenas para referência das chaves.
Em produção, as chaves são configuradas nas **Propriedades do script** do GAS.

## README

Manter `README.md` atualizado a cada iteração com novas funcionalidades ou mudanças de arquitetura.
