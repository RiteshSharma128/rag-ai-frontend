// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { useAuth } from '@/context/AuthContext';
// import { Eye, EyeOff, Brain, Loader2, Check, X } from 'lucide-react';

// const PasswordRule = ({ ok, text }: { ok: boolean; text: string }) => (
//   <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-slate-500'}`}>
//     {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
//     {text}
//   </div>
// );

// export default function RegisterPage() {
//   const { register } = useAuth();
//   const router = useRouter();

//   const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const pw = form.password;
//   const rules = {
//     length: pw.length >= 6,
//     match: pw === form.confirmPassword && pw.length > 0,
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!rules.length || !rules.match) return;
//     setLoading(true);
//     const ok = await register(form.name, form.email, form.password, form.confirmPassword);
//     if (ok) router.push('/dashboard');
//     setLoading(false);
//   };

//   return (
//     <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-600/10 rounded-full blur-3xl" />
//       </div>

//       <div className="w-full max-w-md relative z-10">
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600/20 border border-brand-500/30 rounded-2xl mb-4">
//             <Brain className="w-7 h-7 text-brand-400" />
//           </div>
//           <h1 className="text-2xl font-bold text-white">Create account</h1>
//           <p className="text-slate-400 mt-1 text-sm">Start your RAG AI journey</p>
//         </div>

//         <div className="glass rounded-2xl p-8 shadow-2xl">
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
//               <input
//                 type="text"
//                 value={form.name}
//                 onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
//                 placeholder="John Doe"
//                 required
//                 minLength={2}
//                 className="w-full bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
//               <input
//                 type="email"
//                 value={form.email}
//                 onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
//                 placeholder="you@example.com"
//                 required
//                 className="w-full bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   value={form.password}
//                   onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
//                   placeholder="••••••••"
//                   required
//                   className="w-full bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(p => !p)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
//                 >
//                   {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>
//               {form.password && (
//                 <div className="mt-2 space-y-1 pl-1">
//                   <PasswordRule ok={rules.length} text="At least 6 characters" />
//                 </div>
//               )}
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
//               <input
//                 type="password"
//                 value={form.confirmPassword}
//                 onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
//                 placeholder="••••••••"
//                 required
//                 className="w-full bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
//               />
//               {form.confirmPassword && (
//                 <div className="mt-2 pl-1">
//                   <PasswordRule ok={rules.match} text="Passwords match" />
//                 </div>
//               )}
//             </div>

//             <button
//               type="submit"
//               disabled={loading || !rules.length || !rules.match}
//               className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 text-sm mt-2"
//             >
//               {loading ? (
//                 <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
//               ) : 'Create Account'}
//             </button>
//           </form>

//           <p className="text-center text-sm text-slate-500 mt-6">
//             Already have an account?{' '}
//             <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
//               Sign in
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Brain, Loader2, Check, X } from 'lucide-react';

const PasswordRule = ({ ok, text }: { ok: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-slate-500'}`}>
    {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    {text}
  </div>
);

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pw = form.password;
  const rules = {
    length: pw.length >= 6,
    match: pw === form.confirmPassword && pw.length > 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rules.length || !rules.match) return;
    setError('');
    setLoading(true);
    try {
      const ok = await register(form.name, form.email, form.password, form.confirmPassword);
      const redirect = '/dashboard';
     if (ok) {
  await refreshUser(); // 🔥 add this
  router.replace(redirect);
}
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-600/10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600/20 border border-brand-500/30 rounded-2xl mb-4">
            <Brain className="w-7 h-7 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-slate-400 mt-1 text-sm">Start your RAG AI journey</p>
        </div>
        <div className="bg-surface-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="John Doe"
                required
                minLength={2}
                className="w-full bg-surface-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                required
                className="w-full bg-surface-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full bg-surface-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1 pl-1">
                  <PasswordRule ok={rules.length} text="At least 6 characters" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                required
                className="w-full bg-surface-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
              />
              {form.confirmPassword && (
                <div className="mt-2 pl-1">
                  <PasswordRule ok={rules.match} text="Passwords match" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !rules.length || !rules.match}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
