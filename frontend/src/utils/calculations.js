/**
 * Funções de cálculo clínico do Programa Ser Livre.
 * Extraídas do App.jsx para reutilização e testabilidade.
 */

/**
 * Calcula pontuação total de saúde metabólica.
 * Máximo: 24 pontos (8 indicadores × 3).
 * @param {object} s - scores metabólicos {gv, mm, pcr, fer, hb, au, th, ca}
 * @returns {number}
 */
export const calcularMetabolico = (s) =>
  s ? s.gv + s.mm + s.pcr + s.fer + s.hb + s.au + s.th + s.ca : 0;

/**
 * Calcula pontuação total de bem-estar.
 * Máximo: 18 pontos (6 indicadores × 3).
 * @param {object} s - scores de bem-estar {gi, lib, dor, au, en, so}
 * @returns {number}
 */
export const calcularBemEstar = (s) =>
  s ? s.gi + s.lib + s.dor + s.au + s.en + s.so : 0;

/**
 * Calcula pontuação total de blindagem mental / neurocomportamental.
 * Máximo: 9 pontos (3 indicadores × 3).
 * @param {object} s - scores neurais {co, ge, mv}
 * @returns {number}
 */
export const calcularMental = (s) =>
  s ? s.co + s.ge + s.mv : 0;

/**
 * Calcula o percentual de engajamento do paciente na semana atual.
 * Conta itens preenchidos (peso, tirzepatida ou pesagem) nos weekChecks.
 * @param {Array} weekChecks - array de weekChecks do ciclo ativo
 * @returns {number} Percentual de 0 a 100
 */
export const calcularEngajamento = (weekChecks) => {
  if (!weekChecks || !weekChecks.length) return 0;
  const done = weekChecks.filter(
    (wc) => wc.pesoRegistrado || wc.tirzepatida || wc.pesagem
  ).length;
  return Math.round((done / Math.max(weekChecks.length, 1)) * 100);
};

/**
 * Formata um peso em quilogramas para exibição.
 * @param {number} kg - peso em kg
 * @returns {string} ex: "85,4 kg"
 */
export const formatarPeso = (kg) => {
  if (kg == null || isNaN(kg)) return "— kg";
  return `${String(kg).replace(".", ",")} kg`;
};

/**
 * Formata a perda de peso entre peso inicial e peso atual.
 * @param {number} iw - peso inicial (initial weight)
 * @param {number} cw - peso atual (current weight)
 * @returns {string} ex: "-4,2 kg (-4,9%)"
 */
export const formatarPerda = (iw, cw) => {
  if (!iw || !cw || isNaN(iw) || isNaN(cw)) return "—";
  const diff = cw - iw;
  const pct = iw > 0 ? ((diff / iw) * 100).toFixed(1) : "0";
  const diffFmt = diff.toFixed(1).replace(".", ",");
  const signal = diff > 0 ? "+" : "";
  return `${signal}${diffFmt} kg (${signal}${pct}%)`;
};

/**
 * Decompõe o score metabólico em 4 sub-domínios para radar.
 * @param {object} s - scores metabólicos
 * @returns {{comp:number, infl:number, glic:number, card:number}}
 */
export const decomporMetabolico = (s) => ({
  comp: s.gv + s.mm,
  infl: s.pcr + s.fer,
  glic: s.hb + s.au,
  card: s.th + s.ca,
});
