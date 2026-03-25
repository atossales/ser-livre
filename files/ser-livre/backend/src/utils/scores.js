// ============================================================
// CÁLCULO DE SCORES — Método Ser Livre
//
// Este arquivo contém toda a lógica de cálculo dos 3 scores.
// É o "coração" do sistema — as regras que a Dra. Mariana criou.
//
// SCORE 1: Saúde Metabólica (8-24 pts) → 4 pilares
// SCORE 2: Criticidade e Bem-Estar (6-18 pts) → 6 pilares
// SCORE 3: Blindagem Mental e Hábitos (3-9 pts) → 3 pilares
// ============================================================

/**
 * Calcula o Score de Saúde Metabólica
 * Quanto MAIOR, MELHOR o paciente está
 */
function calcularMetabolico(dados) {
  const composicao = dados.gorduraVisceral + dados.massaMuscular;           // 0-6
  const inflamacao = dados.pcrUltrassensivel + dados.ferritina;             // 0-6
  const glicemico = dados.hemoglobinaGlicada + dados.acidoUrico;            // 0-6
  const cardiovascular = dados.triglicerideosHdl + dados.circAbdominal;     // 0-6
  const total = composicao + inflamacao + glicemico + cardiovascular;        // 8-24

  let status;
  if (total >= 21) status = 'ELITE';          // 🟣 Corpo blindado
  else if (total >= 17) status = 'SAUDAVEL';  // 🟢 Liberdade metabólica
  else if (total >= 13) status = 'TRANSICAO'; // 🟡 Alerta
  else status = 'CRITICO';                    // 🔴 Metabolismo travado

  return {
    total,
    status,
    pilares: { composicao, inflamacao, glicemico, cardiovascular }
  };
}

/**
 * Calcula o Score de Criticidade e Bem-Estar
 * Quanto MENOR, PIOR o paciente está
 */
function calcularBemEstar(dados) {
  const total = dados.gastrointestinal + dados.libido + dados.doresArticulares
    + dados.autoestimaMental + dados.energiaPerformance + dados.sonoCefaleia;

  let status;
  if (total > 13) status = 'EXCELENTE';  // 🟢 Manter
  else if (total >= 10) status = 'ALERTA'; // 🟡 Nutricionista intervém
  else status = 'CRITICO';                 // 🔴 Intervenção médica

  return { total, status };
}

/**
 * Calcula o Score de Blindagem Mental e Hábitos
 */
function calcularMental(dados) {
  const total = dados.consistenciaAlimentar + dados.gestaoEmocional
    + dados.movimentoPresenca;

  let status;
  if (total >= 8) status = 'ELITE';       // 🟣 Alta comportamental
  else if (total >= 5) status = 'CONSTRUCAO'; // 🟡 Reforço nutri + psico
  else status = 'RECAIDA';                 // 🔴 Intervenção individual

  return { total, status };
}

/**
 * Gera alertas baseados nos scores
 * Retorna um array de alertas que devem ser criados
 */
function gerarAlertas(metabolico, bemEstar, mental) {
  const alertas = [];

  // Alertas metabólicos
  if (metabolico.status === 'CRITICO') {
    alertas.push({
      type: 'METABOLICO',
      severity: 'RED',
      message: `Score metabólico crítico: ${metabolico.total}/24`,
      action: 'Protocolo de ataque + detox. Ajuste de dose terapêutica.'
    });
  } else if (metabolico.status === 'TRANSICAO') {
    alertas.push({
      type: 'METABOLICO',
      severity: 'YELLOW',
      message: `Metabolismo em transição: ${metabolico.total}/24`,
      action: 'Ajustes terapêuticos necessários.'
    });
  }

  // Alertas de bem-estar
  if (bemEstar.status === 'CRITICO') {
    alertas.push({
      type: 'BEM_ESTAR',
      severity: 'RED',
      message: `Bem-estar crítico: ${bemEstar.total}/18`,
      action: 'Intervenção médica. Avisar Dra. Mariana imediatamente.'
    });
  } else if (bemEstar.status === 'ALERTA') {
    alertas.push({
      type: 'BEM_ESTAR',
      severity: 'YELLOW',
      message: `Bem-estar em alerta: ${bemEstar.total}/18`,
      action: 'Nutricionista deve intervir.'
    });
  }

  // Alertas mentais
  if (mental.status === 'RECAIDA') {
    alertas.push({
      type: 'MENTAL',
      severity: 'RED',
      message: `Risco de recaída: ${mental.total}/9`,
      action: 'Sessão individual urgente. Ajustes com psicóloga.'
    });
  } else if (mental.status === 'CONSTRUCAO') {
    alertas.push({
      type: 'MENTAL',
      severity: 'YELLOW',
      message: `Mental em construção: ${mental.total}/9`,
      action: 'Reforço nutricional e psicológico.'
    });
  }

  return alertas;
}

/**
 * Retorna a estrutura do plano (o que cada tier inclui)
 */
function getPlanoFeatures(plan) {
  const tier1 = ['PLATINUM_PLUS', 'GOLD_PLUS'];
  const tier2 = ['PLATINUM', 'GOLD'];

  if (tier1.includes(plan)) {
    return {
      tier: 1,
      terapiaInjetavel: 'semanal',
      psicologia: 'semanal',
      treinos: 3,
      nutriCompleta: true,
      label: 'Platinum Plus / Gold Plus'
    };
  }
  if (tier2.includes(plan)) {
    return {
      tier: 2,
      terapiaInjetavel: 'quinzenal',
      psicologia: 'quinzenal',
      treinos: 2,
      nutriCompleta: false,
      label: 'Platinum / Gold'
    };
  }
  return {
    tier: 3,
    terapiaInjetavel: null,
    psicologia: null,
    treinos: 2,
    nutriCompleta: false,
    label: 'Essential Plus / Essential'
  };
}

module.exports = {
  calcularMetabolico,
  calcularBemEstar,
  calcularMental,
  gerarAlertas,
  getPlanoFeatures
};
