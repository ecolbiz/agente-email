// ==================== CONSTRUTOR DE PROMPTS ====================

function buildCategorizationPrompt(subject, body) {
  return `Você é um assistente de organização de e-mails.

Analise o e-mail abaixo e retorne SOMENTE um JSON válido com os campos:
- "categoria": string com o nome da label sugerida (ex: "Financeiro", "Suporte", "Marketing", "Pessoal", "Urgente", "Informativo")
- "prioridade": "alta" | "media" | "baixa"
- "resumo": string de até 80 caracteres descrevendo o e-mail

Assunto: ${subject}

Corpo:
${body}

Responda apenas com JSON, sem explicações.`;
}

function buildSummaryHtml(logs, dataExecucao) {
  const itens = logs.map(l => `<li style="margin:4px 0">${l}</li>`).join('');
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2c3e50">📊 Resumo de Processamento</h2>
      <p style="color:#7f8c8d;font-size:13px">${dataExecucao}</p>
      <ul style="padding-left:20px">${itens}</ul>
      <hr style="border:none;border-top:1px solid #eee">
      <p style="color:#bdc3c7;font-size:11px">Executado via Google Apps Script</p>
    </div>
  `;
}
