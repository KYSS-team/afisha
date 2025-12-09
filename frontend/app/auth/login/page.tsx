'use client';

import axios from 'axios';
import { useState } from 'react';

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

  const submit = async () => {
    try {
      const res = await axios.post<LoginResponse>('http://localhost:8080/auth/login', { email, password });
      localStorage.setItem('userId', res.data.id);
      localStorage.setItem('userRole', res.data.role);
      localStorage.setItem('userName', res.data.fullName);
      setMessage(`Добро пожаловать, ${res.data.fullName}. Перейдите на страницу событий.`);
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка входа');
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Вход</h1>
      <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" onClick={submit}>Войти</button>
      <a className="link text-sm" href="/auth/reset">Забыли пароль?</a>
      {message && <div>{message}</div>}
    </div>
  );
}
