// ==================== HANDLERS DAS REGRAS ====================
// Fazem apenas a ação específica da regra.
// Labels e arquivamento são aplicados pelo loop principal via config do PropertiesService.

function processarDaycoval(thread, message, subject, body) {
  thread.markRead();
  return "lido";
}

function processarNewsletter(thread, message, subject, body) {
  thread.markRead();
  return "lido";
}

function processarAvisoDiscoVirtual(thread, message, subject, body) {
  thread.markRead();
  return "ok";
}

// ---------------------------------------------------------------------------
// Diagnóstico — lê inbox sem modificar nada
// ---------------------------------------------------------------------------

function diagnosticar() {
  var threads = GmailApp.search(CONFIG.QUERY, 0, CONFIG.MAX_THREADS);
  return {
    timestamp: new Date().toLocaleString("pt-BR"),
    threads: threads.map(function(thread) {
      try {
        var message    = thread.getMessages()[0];
        var regraMatch = "nenhuma";
        for (var i = 0; i < RULES.length; i++) {
          if (RULES[i].condition(thread, message)) { regraMatch = RULES[i].name; break; }
        }
        return {
          from:    message.getFrom(),
          subject: message.getSubject(),
          labels:  thread.getLabels().map(function(l) { return l.getName(); }),
          regra:   regraMatch
        };
      } catch (e) { return { erro: e.toString() }; }
    })
  };
}
