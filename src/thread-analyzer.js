// ==================== ANÁLISE E PROCESSAMENTO DE THREADS ====================
// Cada função aqui é o handler de uma regra específica.
// Retorna o nome da label aplicada.

function processarDaycoval(thread, message, subject, body) {
  const sub = _subCategoriaDaycoval(subject);
  const labelName = `Daycoval/${sub}`;

  aplicarLabel(thread, labelName);
  thread.markRead();

  return labelName;
}

function processarDaycovalAntigos(thread, message, subject, body) {
  // Reclassifica threads antigos sem marcar como lido novamente
  const sub = _subCategoriaDaycoval(subject);
  const labelName = `Daycoval/${sub}`;
  aplicarLabel(thread, labelName);
  return labelName;
}

// ---------------------------------------------------------------------------
// Helpers privados (convenção: prefixo _ indica uso interno deste arquivo)
// ---------------------------------------------------------------------------

function _subCategoriaDaycoval(subject) {
  const s = subject.toLowerCase();
  if (s.includes("renovacao") || s.includes("renovação")) return "Renovacao";
  if (s.includes("fatura") || s.includes("boleto") || s.includes("pagamento")) return "Financeiro";
  if (s.includes("aviso") || s.includes("alerta") || s.includes("disco")) return "Avisos";
  return "Geral";
}
