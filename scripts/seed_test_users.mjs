import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Por favor defina SUPABASE_SERVICE_ROLE_KEY no ambiente. A URL pode vir de SUPABASE_URL ou VITE_SUPABASE_URL.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { "x-ssr": "1" } } });

const FACULDADES_PATH = path.join(process.cwd(), 'src', 'data', 'faculdades.json');
const CURSINHOS_PATH = path.join(process.cwd(), 'src', 'data', 'cursinhos.json');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function loadFaculdades() {
  const raw = await fs.readFile(FACULDADES_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function loadCursinhos() {
  const raw = await fs.readFile(CURSINHOS_PATH, 'utf-8');
  const list = JSON.parse(raw);
  return Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item !== 'Outro') : [];
}

const AREAS = ['Clínica Médica','Cirurgia Geral','Pediatria','Ginecologia e Obstetrícia','Medicina Preventiva'];

function makeSimulado(idx, profileCursinho, allCursinhos) {
  const totalQuestions = 100;
  const acertosTotais = randInt(40, 95);
  const percentualAcertos = +(acertosTotais / totalQuestions * 100).toFixed(1);

  const desempenhoAreas = {};
  AREAS.forEach((area) => {
    const total = 20;
    const acertos = randInt(8, 20);
    desempenhoAreas[area] = { acertos, total };
  });

  const ehSimuladoCursinho = Math.random() < 0.75;
  const useOwnCursinho = Boolean(profileCursinho) && ehSimuladoCursinho && Math.random() < 0.7;
  const fallbackCursinho = allCursinhos.length > 0 ? sample(allCursinhos) : undefined;

  let origemSimuladoCursinho = null;
  let cursinhoOrigemNome = undefined;

  if (ehSimuladoCursinho) {
    if (useOwnCursinho) {
      origemSimuladoCursinho = 'proprio';
      cursinhoOrigemNome = profileCursinho;
    } else {
      origemSimuladoCursinho = 'outro';
      cursinhoOrigemNome = fallbackCursinho || profileCursinho || 'Outro cursinho';
    }
  }

  return {
    id: uuid(),
    nome: `Simulado de Teste ${idx}`,
    data: new Date(Date.now() - randInt(0, 365) * 24 * 3600 * 1000).toISOString().slice(0,10),
    tempoResolucaoMinutos: randInt(90, 300),
    desempenhoAreas,
    mediaParticipantes: +(randInt(40, 80) + Math.random()).toFixed(1),
    desvioPadrao: +(randInt(5, 15) + Math.random()).toFixed(1),
    posicaoRanking: randInt(1, 500),
    totalParticipantes: randInt(100, 5000),
    cadernoErros: 'Dados de teste gerados automaticamente.',
    acertosTotais,
    questoesTotais: totalQuestions,
    percentualAcertos,
    zScore: +(Math.random() * 2 - 1).toFixed(3),
    percentilEstimado: +(randInt(1,99) + Math.random()).toFixed(1),
    ehSimuladoCursinho,
    origemSimuladoCursinho,
    cursinhoOrigemNome,
  };
}

async function seed(count = 20, simsPerUser = 3) {
  const faculdades = await loadFaculdades();
  const cursinhos = await loadCursinhos();

  const inserts = [];

  for (let i = 0; i < count; i++) {
    // Create an auth user first so FK constraint is satisfied
    const email = `seed-${uuid()}@test.local`;
    const password = `TempPass${randInt(1000,9999)}!`;

    let userId = null;
    try {
      const res = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { seed: true },
      });
      if (res.error) {
        throw res.error;
      }
      userId = res.data.user.id;
    } catch (err) {
      console.error('Erro ao criar usuário Auth para seed:', err);
      process.exit(1);
    }

    const fazCursinhoResidencia = Math.random() < 0.8;
    const cursinhoResidencia = fazCursinhoResidencia
      ? (cursinhos.length > 0 ? sample(cursinhos) : 'Cursinho Seed')
      : 'Não faço cursinho';

    const perfil = {
      nome: `Usuário Teste ${i+1}`,
      estado: sample(['SP','RJ','MG','BA','PR','RS','PE','CE','DF']),
      faculdade: sample(faculdades),
      semestre: `${randInt(1,12)}`,
      fazCursinhoResidencia,
      cursinhoResidencia,
      especialidadeAlvo: sample(['Clínica Médica','Cirurgia Geral','Pediatria','Ginecologia e Obstetrícia','Medicina Preventiva']),
      instituicaoAlvo: sample(['ENARE','USP-SP','SUS-SP','HCFMUSP','Outros']),
      metaAcertosPercentual: randInt(60, 90),
      __seed: true,
    };

    const simulados = Array.from({ length: simsPerUser }).map((_, idx) => makeSimulado(idx+1, fazCursinhoResidencia ? cursinhoResidencia : null, cursinhos));

    // Insert the user_app_data row for this user
    const { data: upserted, error } = await supabase.from('user_app_data').upsert({
      user_id: userId,
      perfil,
      simulados,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      console.error('Erro no upsert:', error);
      process.exit(1);
    }

    inserts.push({ user_id: userId, email });
    console.log(`Criado seed ${i+1}/${count}: user_id=${userId} email=${email}`);
  }

  console.log('Concluído. IDs de usuários criados:');
  console.log(inserts.map((r) => r.user_id).join('\n'));
}

const argCount = Number(process.argv[2] || 20);
const argSims = Number(process.argv[3] || 3);

seed(argCount, argSims).catch((err) => { console.error(err); process.exit(1); });
