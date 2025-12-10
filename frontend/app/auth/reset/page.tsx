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
  const [error, setError] = useState('');
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
    setError('');
    if (!validateRequest()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('Если пользователь с таким email существует, мы отправили на него ссылку для сброса пароля.');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Не удалось отправить ссылку. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!validateReset()) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password, confirm: confirmPassword });
      setMessage('Пароль успешно изменен! Теперь вы можете войти с новым паролем.');
      setStage('success');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Ссылка недействительна или истек ее срок.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Восстановление доступа</h1>

      {stage === 'request' && (
        <form className="space-y-3" onSubmit={requestLink}>
          <p className="text-sm text-slate-600">Введите email, и мы пришлем ссылку для сброса пароля.</p>
          <div className="space-y-1">
            <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p className="text-sm text-red-600 dark:text-red-300">{errors.email}</p>}
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Отправляем...' : 'Отправить ссылку'}
          </button>
        </form>
      )}

      {stage === 'reset' && (
        <form className="space-y-3" onSubmit={changePassword}>
          <p className="text-sm text-slate-600">Придумайте новый пароль.</p>
          <div className="space-y-1">
            <input
              className="input"
              placeholder="Новый пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="text-sm text-red-600 dark:text-red-300">{errors.password}</p>}
          </div>
          <div className="space-y-1">
            <input
              className="input"
              placeholder="Подтверждение"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirmPassword && <p className="text-sm text-red-600 dark:text-red-300">{errors.confirmPassword}</p>}
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Меняем...' : 'Сменить пароль'}
          </button>
        </form>
      )}

      {stage === 'success' && (
        <a className="link" href="/auth/login">
          Вернуться ко входу
        </a>
      )}

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
