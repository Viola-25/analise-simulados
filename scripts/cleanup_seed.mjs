import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Por favor defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { "x-ssr": "1" } } });

async function cleanup() {
  console.log("Buscando registros com perfil.__seed = true...");
  const { data, error } = await supabase.from('user_app_data').select('user_id, perfil');
  if (error) {
    console.error('Erro ao buscar registros:', error);
    process.exit(1);
  }

  const seedIds = (data || [])
    .filter((r) => r && r.perfil && r.perfil.__seed === true)
    .map((r) => r.user_id);

  if (seedIds.length === 0) {
    console.log('Nenhum registro seed encontrado. Nada a remover.');
    return;
  }

  console.log(`Removendo ${seedIds.length} registros seed...`);
  const batchSize = 50;
  for (let i = 0; i < seedIds.length; i += batchSize) {
    const batch = seedIds.slice(i, i + batchSize);
    const res = await supabase.from('user_app_data').delete().in('user_id', batch);
    if (res.error) {
      console.error('Erro ao deletar batch:', res.error);
      process.exit(1);
    }
    console.log(`Batch ${i / batchSize + 1}: deletados ${batch.length}`);
  }

  console.log('Remoção concluída.');

  // Also remove Auth users created with user_metadata.seed = true
  console.log('Procurando usuários Auth com user_metadata.seed = true...');
  const listRes = await supabase.auth.admin.listUsers();
  if (listRes.error) {
    console.error('Erro ao listar usuários Auth:', listRes.error);
    return;
  }

  const seedUsers = (listRes.data?.users || []).filter(u => u.user_metadata && u.user_metadata.seed === true).map(u => u.id);
  if (seedUsers.length === 0) {
    console.log('Nenhum usuário Auth seed encontrado.');
    return;
  }

  console.log(`Removendo ${seedUsers.length} usuários Auth seed...`);
  for (const uid of seedUsers) {
    const del = await supabase.auth.admin.deleteUser(uid);
    if (del.error) {
      console.error('Erro deletando usuário Auth', uid, del.error);
    } else {
      console.log('Deletado usuário Auth', uid);
    }
  }
  if (error) {
    console.error('Erro ao deletar registros seed:', error);
    process.exit(1);
  }
  console.log('Remoção concluída. Registros afetados:', Array.isArray(data) ? data.length : 0);
}

cleanup().catch((err) => { console.error(err); process.exit(1); });
