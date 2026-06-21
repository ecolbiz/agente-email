// ==================== LOGGER ====================
// Usa Logger_ para não colidir com o Logger nativo do GAS

const Logger_ = {
  _logs: [],

  info: function(msg) {
    console.log(`ℹ️  ${msg}`);
  },

  success: function(msg) {
    console.log(`✅ ${msg}`);
    this._logs.push(`✅ ${msg}`);
  },

  warn: function(msg) {
    console.log(`⚠️  ${msg}`);
  },

  error: function(msg) {
    console.log(`❌ ${msg}`);
    this._logs.push(`❌ ${msg}`);
  },

  ai: function(provider, msg) {
    console.log(`🤖 [${provider}] ${msg}`);
    this._logs.push(`🤖 IA (${provider}) → ${msg}`);
  },

  rule: function(ruleName, subject, resultado) {
    const entry = `📂 ${ruleName} | ${subject} → ${resultado}`;
    console.log(entry);
    this._logs.push(entry);
  },

  getLogs: function() {
    return [...this._logs];
  },

  clear: function() {
    this._logs = [];
  }
};
