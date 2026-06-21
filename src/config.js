// ==================== CONFIGURAÇÃO GLOBAL ====================

const CONFIG = {
  MAX_THREADS: 15,
  BODY_LIMIT: 4500,
  SLEEP_MS: 1200,
  PROVIDERS_ORDER: ["GEMINI", "GROQ", "CLAUDE", "OPENAI"]
};

// Labels usadas no projeto — altere aqui para refletir seus labels reais do Gmail
const LABELS = {
  DAYCOVAL_SEGUROS:  "[-daycoval-]-daycoval-seguros",
  NEWSLETTER:        "[-newsletter-]",
  DISCO_VIRTUAL:     "[-infra-]-disco-virtual"
};

const CONTATOS = {
  VITOR: "vitor@colbizsv.com"
};

// Em produção, configure via: Arquivo > Propriedades do projeto > Propriedades do script
function getApiKeys() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    GEMINI: props["GEMINI_API_KEY"],
    CLAUDE: props["ANTHROPIC_API_KEY"],
    OPENAI: props["OPENAI_API_KEY"],
    GROQ:   props["GROQ_API_KEY"]
  };
}

function getEmailResumo() {
  return Session.getActiveUser().getEmail();
}
