// ==================== LEITURA DO GMAIL ====================

function buscarThreads(limit, categoryFilter) {
  var lim = limit || CONFIG.MAX_THREADS;

  if (!categoryFilter) {
    Logger_.info("Buscando: " + CONFIG.QUERY);
    return GmailApp.search(CONFIG.QUERY, 0, lim);
  }

  // Busca 1: e-mails na categoria selecionada
  // Busca 2: e-mails com labels de usuário (independente de categoria)
  // Merge por ID para evitar duplicatas e incluir threads com labels
  var q1 = CONFIG.QUERY + " category:" + categoryFilter;
  var q2 = CONFIG.QUERY + " has:userlabels";
  Logger_.info("Buscando: " + q1 + " | " + q2);

  var seen    = {};
  var threads = [];

  GmailApp.search(q1, 0, lim).forEach(function(t) {
    var id = t.getId();
    if (!seen[id]) { seen[id] = true; threads.push(t); }
  });
  GmailApp.search(q2, 0, lim).forEach(function(t) {
    var id = t.getId();
    if (!seen[id]) { seen[id] = true; threads.push(t); }
  });

  return threads.slice(0, lim);
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
    Logger_.error("Label ausente no Gmail (crie primeiro): " + labelName);
    return false;
  }
  thread.addLabel(label);
  return true;
}

function marcarProcessado(thread) {
  aplicarLabel(thread, LABELS.PROCESSADOS);
  thread.markRead();
}

function arquivarThread(thread) {
  thread.moveToArchive();
}
