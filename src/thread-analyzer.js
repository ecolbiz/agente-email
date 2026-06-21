// ==================== HANDLERS DAS REGRAS ====================
// Cada função recebe (thread, message, subject, body).
// Retorna string descrevendo o que foi feito.
// NÃO chamar marcarProcessado() aqui — o loop principal já faz isso.

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

function processarAvisoDiscoVirtual(thread, message, subject, body) {
  message.forward(CONTATOS.VITOR);
  aplicarLabel(thread, LABELS.VITOR);
  thread.markRead();
  return "encaminhado para " + CONTATOS.VITOR + " | " + LABELS.VITOR;
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
