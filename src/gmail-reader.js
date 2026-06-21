// ==================== LEITURA DO GMAIL ====================

function buscarThreads(limit) {
  Logger_.info("Buscando: " + CONFIG.QUERY);
  return GmailApp.search(CONFIG.QUERY, 0, limit || CONFIG.MAX_THREADS);
}

function extrairDadosMensagem(message) {
  return {
    from:     message.getFrom(),
    subject:  message.getSubject(),
    body:     message.getPlainBody().substring(0, CONFIG.BODY_LIMIT),
    isUnread: message.isUnread(),
    date:     message.getDate()
  };
}

// Aplica label SOMENTE se ela já existir no Gmail. Nunca cria labels novas.
function aplicarLabel(thread, labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    Logger_.warn("Label nao existe (nao criada): " + labelName);
    return false;
  }
  thread.addLabel(label);
  return true;
}

// Todo e-mail processado (por regra ou IA) recebe esta label.
function marcarProcessado(thread) {
  aplicarLabel(thread, LABELS.PROCESSADOS);
}
