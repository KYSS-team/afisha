'use client';

import axios from 'axios';
import { useState } from 'react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [stage, setStage] = useState<'form' | 'verify'>('form');

  const submit = async () => {
    try {
      await axios.post('http://localhost:8080/auth/register', { fullName, email, password, confirmPassword });
      setMessage('Проверьте почту и введите код подтверждения.');
      setStage('verify');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка регистрации');
    }
  };

  const verify = async () => {
    try {
      await axios.post('http://localhost:8080/auth/verify-email', { email, code });
      setMessage('Регистрация подтверждена. Теперь можно войти.');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка подтверждения');
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Регистрация</h1>
      {stage === 'form' ? (
        <>
          <input className="input" placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input" placeholder="Подтверждение" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button className="btn" onClick={submit}>Зарегистрироваться</button>
        </>
      ) : (
        <>
          <input className="input" placeholder="Код из письма" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn" onClick={verify}>Подтвердить</button>
        </>
      )}
      {message && <div>{message}</div>}
    </div>
  );
}
