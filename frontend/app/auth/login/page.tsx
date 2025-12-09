'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, emailRegex, passwordMeetsRules } from '../utils';

interface LoginResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!emailRegex.test(email)) nextErrors.email = 'Введите корректный email';
    if (!passwordMeetsRules(password)) nextErrors.password = 'Пароль должен быть не короче 8 символов и содержать буквы, цифры и спецсимвол';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;
    setLoading(true);
    try {
      const loginResponse = await api.post('/auth/login', { email, password });
      const user = loginResponse.data?.user as LoginResponse;
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.fullName);
      setMessage(`Добро пожаловать, ${user.fullName}. Перенаправляем к событиям...`);
      setTimeout(() => router.push('/events'), 400);
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка входа');
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
          {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <input
            className="input"
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
      <a className="link text-sm" href="/auth/reset">
        Забыли пароль?
      </a>
      {message && <div className="text-sm" role="alert">{message}</div>}
    </div>
  );
}
