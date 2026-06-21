// ==================== HANDLERS DAS REGRAS ====================
// Uma função por regra. Recebe (thread, message, subject, body).
// Retorna o nome da label aplicada.

function processarDaycoval(thread, message, subject, body) {
  aplicarLabel(thread, LABELS.DAYCOVAL_SEGUROS);
  thread.markRead();
  return LABELS.DAYCOVAL_SEGUROS;
}

function processarNewsletter(thread, message, subject, body) {
  aplicarLabel(thread, LABELS.NEWSLETTER);
  thread.markRead();
  return LABELS.NEWSLETTER;
}

// ---------------------------------------------------------------------------
// Diagnóstico — lê threads sem modificar nada
// ---------------------------------------------------------------------------

function diagnosticar() {
  const threads = GmailApp.search("is:unread", 0, CONFIG.MAX_THREADS);
  return {
    timestamp: new Date().toLocaleString("pt-BR"),
    threads: threads.map(function(thread) {
      try {
        var message = thread.getMessages()[0];
        var regraMatch = "nenhuma";
        for (var i = 0; i < RULES.length; i++) {
          if (RULES[i].condition(thread, message)) {
            regraMatch = RULES[i].name;
            break;
          }
        }
        return {
          from:    message.getFrom(),
          subject: message.getSubject(),
          labels:  thread.getLabels().map(function(l) { return l.getName(); }),
          regra:   regraMatch
        };
      } catch (e) {
        return { erro: e.toString() };
      }
    })
  };
}
