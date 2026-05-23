/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Configuração do Supabase incompleta para exclusão de conta.');
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
    const { error: deleteDataError } = await adminClient
      .from('user_app_data')
      .delete()
      .eq('user_id', userData.user.id);

    if (deleteDataError) {
      throw deleteDataError;
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userData.user.id);
    if (deleteUserError) {
      throw deleteUserError;
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Error during account deletion:', error);
    res.status(500).json({
      error: error?.message || 'Não foi possível excluir a conta no momento.',
    });
  }
}