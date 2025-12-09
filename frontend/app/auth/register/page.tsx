'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, emailRegex, fullNameRegex, passwordMeetsRules } from '../utils';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const router = useRouter();

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!fullNameRegex.test(fullName.trim())) nextErrors.fullName = 'ФИО должно быть на кириллице';
    if (!emailRegex.test(email)) nextErrors.email = 'Введите корректный email';
    if (!passwordMeetsRules(password)) nextErrors.password = 'Пароль должен содержать минимум 8 символов, буквы, цифры и спецсимволы';
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Пароли не совпадают';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/register', { fullName: fullName.trim(), email, password, confirmPassword });
      setMessage('На вашу почту отправлен код подтверждения. Перенаправляем на страницу ввода кода...');
      setRegistered(true);
      setTimeout(() => router.push(`/auth/verify?email=${encodeURIComponent(email)}`), 1000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Регистрация</h1>
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-1">
          <input
            className="input"
            placeholder="ФИО"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={registered}
          />
          {errors.fullName && <p className="text-sm text-red-600">{errors.fullName}</p>}
        </div>
        <div className="space-y-1">
          <input
            className="input"
            placeholder="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={registered}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <input
            className="input"
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={registered}
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
            disabled={registered}
          />
          {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
        </div>
        <button className="btn" type="submit" disabled={loading || registered}>
          {registered ? 'Проверьте почту' : loading ? 'Отправляем...' : 'Зарегистрироваться'}
        </button>
      </form>
      <a className="link text-sm" href="/auth/login">
        Уже есть аккаунт? Войти
      </a>
      {message && <div className="text-sm text-green-600" role="alert">{message}</div>}
      {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
    </div>
  );
}
