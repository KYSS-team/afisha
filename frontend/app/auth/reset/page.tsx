'use client';

import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ResetPage() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState(token ? 'reset' : 'request');
  const [message, setMessage] = useState('');

  const requestLink = async () => {
    try {
      await axios.post('/auth/forgot-password', { email });
      setMessage('Ссылка на сброс отправлена.');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка запроса');
    }
  };

  const changePassword = async () => {
    try {
      await axios.post('/auth/reset-password', { token, password, confirmPassword });
      setMessage('Пароль обновлен. Вернитесь на страницу входа.');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка');
    }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Восстановление доступа</h1>
      {stage === 'request' ? (
        <>
          <input className="input" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn" onClick={requestLink}>Отправить ссылку</button>
        </>
      ) : (
        <>
          <input className="input" placeholder="Новый пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input" placeholder="Подтверждение" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button className="btn" onClick={changePassword}>Сменить пароль</button>
        </>
      )}
      {message && <div>{message}</div>}
    </div>
  );
}
