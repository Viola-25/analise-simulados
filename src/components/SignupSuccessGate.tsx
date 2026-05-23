/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface SignupSuccessGateProps {
  email?: string | null;
  notice: string | null;
  resendBusy: boolean;
  resendNotice: string | null;
  resendError: string | null;
  onBackToLogin: () => void;
  onResendConfirmation: () => void;
}

export default function SignupSuccessGate({ email, notice, resendBusy, resendNotice, resendError, onBackToLogin, onResendConfirmation }: SignupSuccessGateProps) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center px-4 py-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-3xl grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6"
      >
        <div className="glass-panel-heavy rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Cadastro enviado</h1>
              <p className="text-xs text-slate-400 uppercase tracking-[0.25em] font-semibold">Confirmação por e-mail</p>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-tight max-w-xl">
            Sua conta foi criada. Agora confirme o e-mail para ativar o primeiro acesso.
          </h2>

          <div className="mt-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 mt-0.5 shrink-0" size={18} />
              <p>Se o Supabase pediu confirmação, você já pode fechar esta tela e verificar sua caixa de entrada.</p>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="text-blue-400 mt-0.5 shrink-0" size={18} />
              <p>Procure o e-mail enviado pelo Supabase e confira também o spam/lixo eletrônico.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
              <p>Depois da confirmação, volte para o login e entre com o mesmo e-mail e senha.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para login
          </button>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-8 shadow-2xl">
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wider mb-2">O que acontece agora</h3>
          <p className="text-xs text-slate-400 mb-6">
            O cadastro inicial ficou salvo para o primeiro login. Quando você entrar, a plataforma vai preencher seu perfil inicial automaticamente.
          </p>

          <div className="space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-1">Conta criada</span>
              <p>Dados de perfil inicial prontos para a primeira sessão.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-1">Próximo passo</span>
              <p>Confirme o e-mail e volte para entrar.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-amber-300 mb-1">E-mail usado</span>
              <p className="break-all">{email || 'Seu e-mail de cadastro'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-300 mb-1">Se o e-mail não chegou</span>
              <p className="text-xs text-slate-400 leading-relaxed">Clique para reenviar a confirmação. Depois confira inbox, promoções e spam.</p>
              <button
                type="button"
                onClick={onResendConfirmation}
                disabled={resendBusy || !email}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {resendBusy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Reenviar e-mail de confirmação
              </button>
              {resendNotice && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 leading-relaxed">
                  {resendNotice}
                </div>
              )}
              {resendError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2 text-xs text-rose-300 leading-relaxed">
                  {resendError}
                </div>
              )}
            </div>

            {notice && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-emerald-200 leading-relaxed">
                {notice}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}