// ==================== LEITURA DO GMAIL ====================

function buscarThreads(query, limit) {
  Logger_.info(`Buscando threads: "${query}" (máx ${limit || CONFIG.MAX_THREADS})`);
  return GmailApp.search(query, 0, limit || CONFIG.MAX_THREADS);
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

function aplicarLabel(thread, labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);
  thread.addLabel(label);
  return label;
}
