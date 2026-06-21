// ==================== REGRAS E CLASSIFICAÇÃO VIA IA ====================

// Adicione novas regras aqui. A primeira que bater é aplicada (ordem importa).
const RULES = [
  {
    name: "Daycoval Seguros",
    condition: function(thread, message) {
      const from = message.getFrom().toLowerCase();
      return from.includes("@daycovalseguros.com.br");
    },
    action: processarDaycoval
  },
  {
    name: "Newsletters",
    condition: function(thread, message) {
      const from    = message.getFrom().toLowerCase();
      const subject = message.getSubject().toLowerCase();
      return from.includes("newsletter") ||
             from.includes("noreply") ||
             from.includes("no-reply") ||
             subject.includes("newsletter") ||
             subject.includes("descadastrar") ||
             subject.includes("unsubscribe");
    },
    action: processarNewsletter
  }
  // Adicione novas regras aqui
];

// ---------------------------------------------------------------------------
// Classificação via IA com fallback entre provedores
// ---------------------------------------------------------------------------

function chamarIAComFallback(subject, body) {
  const API_KEYS = getApiKeys();
  const prompt   = buildCategorizationPrompt(subject, body);

  for (const provider of CONFIG.PROVIDERS_ORDER) {
    const key = API_KEYS[provider];
    if (!key) continue;

    try {
      const result = _chamarProvider(provider, key, prompt);
      if (result && result.categoria) {
        Logger_.ai(provider, `categoria=${result.categoria} | prioridade=${result.prioridade || "?"}`);
        return result;
      }
    } catch (e) {
      Logger_.warn(`Provider ${provider} falhou: ${e.message}`);
    }
  }

  Logger_.error("Todos os provedores de IA falharam para: " + subject);
  return null;
}

function aplicarLabelSimples(thread, categoria) {
  const labelName = `AI/${categoria}`;
  aplicarLabel(thread, labelName);
  thread.markRead();
}

// ---------------------------------------------------------------------------
// Chamadas por provedor
// ---------------------------------------------------------------------------

function _chamarProvider(provider, key, prompt) {
  switch (provider) {
    case "GEMINI":
      return _chamarGemini(key, prompt);
    case "GROQ":
      return _chamarOpenAICompativel(
        "https://api.groq.com/openai/v1/chat/completions", key, prompt, "llama3-8b-8192"
      );
    case "CLAUDE":
      return _chamarClaude(key, prompt);
    case "OPENAI":
      return _chamarOpenAICompativel(
        "https://api.openai.com/v1/chat/completions", key, prompt, "gpt-4o-mini"
      );
    default:
      return null;
  }
}

function _chamarGemini(key, prompt) {
  const url     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  const resp = fazerRequisicao(url, payload, "GEMINI");
  if (!resp) return null;
  return JSON.parse(resp.candidates[0].content.parts[0].text);
}

function _chamarClaude(key, prompt) {
  const url     = "https://api.anthropic.com/v1/messages";
  const payload = {
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages:   [{ role: "user", content: prompt }]
  };
  const headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
  const resp    = fazerRequisicao(url, payload, "CLAUDE", headers);
  if (!resp) return null;
  return JSON.parse(resp.content[0].text);
}

function _chamarOpenAICompativel(url, key, prompt, model) {
  const payload = {
    model:           model,
    messages:        [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  };
  const headers = { "Authorization": `Bearer ${key}` };
  const resp    = fazerRequisicao(url, payload, "OPENAI/GROQ", headers);
  if (!resp) return null;
  return JSON.parse(resp.choices[0].message.content);
}

// ---------------------------------------------------------------------------
// HTTP helper (GAS usa UrlFetchApp)
// ---------------------------------------------------------------------------

function fazerRequisicao(url, payload, provider, extraHeaders) {
  const options = {
    method:          "post",
    contentType:     "application/json",
    payload:         JSON.stringify(payload),
    headers:         extraHeaders || {},
    muteHttpExceptions: true
  };

  const res  = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();

  if (code !== 200) {
    Logger_.warn(`${provider} HTTP ${code}: ${res.getContentText().substring(0, 300)}`);
    return null;
  }

  return JSON.parse(res.getContentText());
}
