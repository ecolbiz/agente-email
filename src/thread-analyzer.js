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
        var messages   = thread.getMessages();
        var regraMatch = "nenhuma";
        var matchFrom  = messages[0].getFrom();
        var matchSubj  = messages[0].getSubject();

        for (var i = 0; i < RULES.length; i++) {
          var rule = RULES[i];
          if (rule.action === null) { regraMatch = rule.name; break; } // catch-all
          for (var m = 0; m < messages.length; m++) {
            if (rule.condition(thread, messages[m])) {
              regraMatch = rule.name;
              matchFrom  = messages[m].getFrom();
              matchSubj  = messages[m].getSubject();
              break;
            }
          }
          if (regraMatch !== "nenhuma") break;
        }

        return {
          from:    matchFrom,
          subject: matchSubj,
          labels:  thread.getLabels().map(function(l) { return l.getName(); }),
          regra:   regraMatch
        };
      } catch (e) { return { erro: e.toString() }; }
    })
  };
}
