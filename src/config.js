// ==================== CONFIGURAÇÃO GLOBAL ====================

const VERSION = "v0.9";

const CONFIG = {
  MAX_THREADS: 15,
  BODY_LIMIT:  4500,
  SLEEP_MS:    1200,
  QUERY:       "in:inbox is:unread",
  PROVIDERS_ORDER: ["GEMINI", "GROQ", "CLAUDE", "OPENAI"]
};

// Labels existentes no Gmail — NÃO são criadas automaticamente.
// Crie o label no Gmail primeiro, depois referencie aqui.
const LABELS = {
  PROCESSADOS: "-- Processados"  // único label fixo — os demais são configurados via dashboard
};


// Em produção: Configurações do projeto → Propriedades do script
function getApiKeys() {
  var props = PropertiesService.getScriptProperties().getProperties();
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
