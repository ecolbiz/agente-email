# 📬 Agente de Emails — Google Apps Script

Automatiza a organização da caixa de entrada do Gmail usando regras configuráveis e IA com fallback entre múltiplos provedores (Gemini, Groq, Claude, OpenAI).

## Funcionalidades

- Aplica regras específicas por remetente/assunto (ex.: Daycoval Seguros)
- Classifica e-mails não categorizados via IA (com fallback automático entre provedores)
- Aplica labels hierárquicas no Gmail (`Daycoval/Financeiro`, `AI/Marketing`, etc.)
- Envia resumo por e-mail ao final de cada execução
- Dashboard web para disparo manual

## Estrutura do projeto

```
src/
  config.js          # Constantes e leitura de chaves via PropertiesService
  logger.js          # Logger_ — wrapper sobre console.log com histórico de logs
  gmail-reader.js    # Busca de threads e extração de dados de mensagens
  prompt-builder.js  # Montagem de prompts para IA e HTML do resumo
  thread-analyzer.js # Handlers de regras específicas (ex.: processarDaycoval)
  email-classifier.js # RULES + fallback de IA + fazerRequisicao
  main.js            # organizarEmails(), enviarResumoEmail(), doGet()
appsscript.json      # Manifesto do Apps Script
.clasp.json          # Config do clasp (deploy via CLI)
```

## Configuração

### 1. Chaves de API no Google Apps Script

As chaves **não ficam no código**. Configure-as em:
**Projeto GAS → Configurações do projeto → Propriedades do script**

| Propriedade        | Valor                     |
|--------------------|---------------------------|
| `ANTHROPIC_API_KEY` | Chave da Anthropic (Claude) |
| `GEMINI_API_KEY`   | Chave do Google AI Studio  |
| `GROQ_API_KEY`     | Chave do Groq              |
| `OPENAI_API_KEY`   | Chave da OpenAI            |

> Você só precisa configurar os provedores que quiser usar. A IA tenta na ordem: Gemini → Groq → Claude → OpenAI.

### 2. Deploy via clasp

```bash
npm install -g @google/clasp
clasp login
clasp push
```

### 3. Trigger automático

No Apps Script, configure um trigger de tempo:
- Função: `organizarEmails`
- Frequência: A cada hora (ou conforme preferir)

## Adicionando novas regras

Edite `src/email-classifier.js`, array `RULES`:

```javascript
{
  name: "Minha Nova Regra",
  condition: function(thread, message) {
    return message.getFrom().includes("@exemplo.com");
  },
  action: processarMinhaNovaRegra   // defina em thread-analyzer.js
}
```

## Provedores de IA suportados

| Provedor | Modelo padrão         | Endpoint                                          |
|----------|-----------------------|---------------------------------------------------|
| Gemini   | gemini-1.5-flash      | generativelanguage.googleapis.com                 |
| Groq     | llama3-8b-8192        | api.groq.com/openai/v1/chat/completions           |
| Claude   | claude-haiku-4-5      | api.anthropic.com/v1/messages                     |
| OpenAI   | gpt-4o-mini           | api.openai.com/v1/chat/completions                |
