// ==================== CONFIGURAÇÃO GLOBAL ====================

const CONFIG = {
  MAX_THREADS: 15,
  BODY_LIMIT: 4500,
  SLEEP_MS: 1200,
  PROVIDERS_ORDER: ["GEMINI", "GROQ", "CLAUDE", "OPENAI"]
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
