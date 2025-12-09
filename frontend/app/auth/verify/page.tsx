'use client';

import { FormEvent, useState } from 'react';
import { api, emailRegex } from '../utils';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!emailRegex.test(email)) nextErrors.email = 'Введите корректный email';
    if (code.trim().length !== 6) nextErrors.code = 'Введите 6-значный код из письма';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-email', { email, code });
      setMessage(res.data?.message ?? 'Email подтвержден. Можно войти.');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка подтверждения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Подтверждение почты</h1>
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-1">
          <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <input className="input" placeholder="Код из письма" value={code} onChange={(e) => setCode(e.target.value)} />
          {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Проверяем...' : 'Подтвердить'}
        </button>
      </form>
      <p className="text-sm text-slate-600">Введите код из письма, чтобы подтвердить аккаунт перед входом.</p>
      {message && <div className="text-sm" role="alert">{message}</div>}
    </div>
  );
}
