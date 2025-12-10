'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, emailRegex, passwordMeetsRules } from '../utils';

interface AuthResponse {
  message: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reason = searchParams.get('error');
    if (reason === 'auth_required') {
      setError('Авторизуйтесь, чтобы продолжить.');
    }
  }, [searchParams]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!emailRegex.test(email)) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userName', data.user.fullName);
      setMessage(data.message || `Добро пожаловать, ${data.user.fullName}! Перенаправляем...`);
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/events');
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Неверные учетные данные');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Вход</h1>
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-1">
          <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <input
            className="input "
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
      <div className="text-sm space-x-2">
        <a className="link" href="/auth/reset">
          Забыли пароль?
        </a>
        <span>|</span>
        <a className="link" href="/auth/register">
          Создать аккаунт
        </a>
      </div>
      {message && (
        <div
          className="text-sm rounded-md px-3 py-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          role="alert"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="text-sm rounded-md px-3 py-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-50"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
