// ==================== REGRAS E CLASSIFICAÇÃO VIA IA ====================

// Única regra fixa: IA geral (catch-all). Demais regras são dinâmicas (CRUD no dashboard).
const RULES = [
  {
    name:      "Geral (IA)",
    condition: function() { return true; }, // catch-all — só ativa se o usuário marcar
    action:    null  // null = sinal para o loop principal usar classificação por IA
  }
];

// ---------------------------------------------------------------------------
// Avaliação de condições dinâmicas
// ---------------------------------------------------------------------------

function avaliarCondicaoDinamica(message, conditions, logic) {
  var from    = message.getFrom().toLowerCase();
  var subject = message.getSubject().toLowerCase();

  var resultados = (conditions || []).map(function(cond) {
    var val = (cond.value || "").toLowerCase().trim();
    if (!val) return false;
    switch (cond.type) {
      case "sender_domain":
        return from.indexOf("@" + val) !== -1;
      case "sender_email":
        return from.indexOf(val) !== -1;
      case "sender_contains":
        return from.indexOf(val) !== -1;
      case "subject":
        var escaped = val.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        return new RegExp("^" + escaped + "$").test(subject);
      default:
        return false;
    }
  });

  if (!resultados.length) return false;
  return (logic === "AND")
    ? resultados.every(function(r) { return r; })
    : resultados.some(function(r) { return r; });
}

// ---------------------------------------------------------------------------
// Classificação via IA com fallback entre provedores
// ---------------------------------------------------------------------------

function chamarIAComFallback(subject, body, availableLabels) {
  var API_KEYS = {};
  try { API_KEYS = getApiKeys(); } catch(e) { /* PropertiesService indisponível */ }

  var temChave = CONFIG.PROVIDERS_ORDER.some(function(p) { return !!API_KEYS[p]; });
  if (!temChave) {
    Logger_.warn("IA ignorada (sem chaves): " + subject);
    return null;
  }

  const prompt = buildCategorizationPrompt(subject, body, availableLabels);

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

// ---------------------------------------------------------------------------
// Chamadas por provedor
// ---------------------------------------------------------------------------

function _chamarProvider(provider, key, prompt) {
  switch (provider) {
    case "GEMINI":
      return _chamarGemini(key, prompt);
    case "GROQ":
      return _chamarOpenAICompativel(
        "https://api.groq.com/openai/v1/chat/completions", key, prompt, "llama-3.1-8b-instant"
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
  const url     = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key;
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
  var options = {
    method:             "post",
    contentType:        "application/json",
    payload:            JSON.stringify(payload),
    headers:            extraHeaders || {},
    muteHttpExceptions: true
  };

  for (var attempt = 0; attempt < 2; attempt++) {
    var res  = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    var body = res.getContentText();

    console.log("[" + provider + "] HTTP " + code + " → " + body.substring(0, 500));

    if (code === 200) {
      try { return JSON.parse(body); }
      catch (e) { Logger_.error("[" + provider + "] JSON inválido: " + body.substring(0, 200)); return null; }
    }

    if (code === 429 && attempt === 0) {
      var waitMs = _parseRetryAfterMs(body) || 10000;
      Logger_.warn("[" + provider + "] rate limit — aguardando " + (waitMs / 1000).toFixed(1) + "s");
      Utilities.sleep(waitMs);
      continue;
    }

    Logger_.error("[" + provider + "] HTTP " + code + " → " + body.substring(0, 350));
    return null;
  }

  return null;
}

// Lê o tempo sugerido em respostas 429 do Groq: "Please try again in 8.26s"
function _parseRetryAfterMs(body) {
  var match = body.match(/try again in (\d+\.?\d*)\s*s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
  return 0;
}
