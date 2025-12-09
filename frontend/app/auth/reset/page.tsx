'use client';

import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { api, emailRegex, passwordMeetsRules } from '../utils';

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="card max-w-lg">Загрузка формы...</div>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState(token ? 'reset' : 'request');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateRequest = () => {
    const nextErrors: Record<string, string> = {};
    if (!emailRegex.test(email)) nextErrors.email = 'Введите корректный email';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateReset = () => {
    const nextErrors: Record<string, string> = {};
    if (!passwordMeetsRules(password)) nextErrors.password = 'Пароль должен быть не короче 8 символов и содержать буквы, цифры и спецсимвол';
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Пароли не совпадают';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const requestLink = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!validateRequest()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data?.message ?? 'Ссылка на сброс отправлена.');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!validateReset()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password, confirmPassword });
      setMessage(res.data?.message ?? 'Пароль обновлен. Вернитесь на страницу входа.');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Восстановление доступа</h1>
      {stage === 'request' ? (
        <form className="space-y-3" onSubmit={requestLink}>
          <div className="space-y-1">
            <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Отправляем...' : 'Отправить ссылку'}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={changePassword}>
          <div className="space-y-1">
            <input
              className="input"
              placeholder="Новый пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
          </div>
          <div className="space-y-1">
            <input
              className="input"
              placeholder="Подтверждение"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Меняем...' : 'Сменить пароль'}
          </button>
        </form>
      )}
      {message && <div className="text-sm" role="alert">{message}</div>}
    </div>
  );
}
