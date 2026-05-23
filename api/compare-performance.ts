/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { buildAnonymousComparisonResponse, ComparisonRecord } from '../src/utils/anonymousComparison';
import { AnonymousComparisonFilters } from '../src/types';

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Configuração do Supabase incompleta para comparação anônima.');
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!accessToken) {
      res.status(401).json({ error: 'Sessão não autenticada.' });
      return;
    }

    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      res.status(401).json({ error: 'Não foi possível validar a sessão do usuário.' });
      return;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await adminClient
      .from('user_app_data')
      .select('user_id, perfil, simulados');

    if (error) {
      throw error;
    }

    const records: ComparisonRecord[] = (data || []).map((item: any) => ({
      user_id: item.user_id,
      perfil: item.perfil,
      simulados: item.simulados || [],
    }));

    const filters = (req.body?.filters || {}) as AnonymousComparisonFilters;
    const payload = buildAnonymousComparisonResponse(records, userData.user.id, filters);

    res.status(200).json(payload);
  } catch (error: any) {
    console.error('Error during anonymous comparison:', error);
    res.status(500).json({
      error: error?.message || 'Não foi possível gerar a comparação anônima no momento.',
    });
  }
}
