// ==================== DIAGNÓSTICO ====================
// Lê inbox sem modificar nada.

function diagnosticar() {
  var threads  = GmailApp.search(CONFIG.QUERY, 0, CONFIG.MAX_THREADS);
  var dynRules = [];
  try { dynRules = getDynamicRules().filter(function(r) { return r.enabled !== false; }); } catch(e) {}

  return {
    timestamp: new Date().toLocaleString("pt-BR"),
    threads: threads.map(function(thread) {
      try {
        var messages   = thread.getMessages();
        var regraMatch = "nenhuma";
        var matchFrom  = messages[0].getFrom();
        var matchSubj  = messages[0].getSubject();
        var found      = false;

        for (var i = 0; i < dynRules.length && !found; i++) {
          var rule = dynRules[i];
          for (var m = 0; m < messages.length && !found; m++) {
            if (avaliarCondicaoDinamica(messages[m], rule.conditions, rule.logic)) {
              regraMatch = rule.name;
              matchFrom  = messages[m].getFrom();
              matchSubj  = messages[m].getSubject();
              found = true;
            }
          }
        }

        if (!found) {
          regraMatch = RULES[0] ? RULES[0].name : "Geral (IA)";
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
