'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, emailRegex } from '../utils';

interface AuthResponse {
  message: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const presetEmail = params.get('email') || '';
    if (presetEmail) setEmail(presetEmail);
  }, [params]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (code.trim().length !== 6) {
      setError('Код должен состоять из 6 цифр');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/verify-email', { email, code });
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userName', data.user.fullName);
      setMessage(data.message || 'Email успешно подтвержден! Перенаправляем на страницу событий...');
      router.push('/events');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Неверный код или истек срок действия');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Подтверждение почты</h1>
      <p className="text-sm text-slate-600">
        На почту <strong>{email}</strong> отправлен 6-значный код. Введите его для завершения регистрации.
      </p>
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-1">
          <input className="input" placeholder="Код из письма" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Проверяем...' : 'Подтвердить'}
        </button>
      </form>
      <a className="link text-sm" href="/auth/login">
        Вернуться ко входу
      </a>
      {message && <div className="text-sm text-green-600" role="alert">{message}</div>}
      {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
    </div>
  );
}
