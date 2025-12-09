'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';

interface EventCard {
  id: string;
  title: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imageUrl: string;
  paymentInfo?: string;
  status: 'ACTIVE' | 'PAST' | 'REJECTED';
  maxParticipants?: number;
}

export default function EventDetail({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<EventCard | null>(null);
  const [status, setStatus] = useState<string>('');
  const [message, setMessage] = useState('');
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  useEffect(() => {
    axios.get<EventCard>(`/events/${params.id}`).then((res) => setEvent(res.data));
    if (userId) {
      axios.get(`/events/${params.id}/status`, { params: { userId } }).then((res) => setStatus(res.data || 'NONE'));
    }
  }, [params.id, userId]);

  const confirm = async () => {
    try {
      await axios.post(`/events/${params.id}/confirm`, null, { params: { userId } });
      setMessage('Участие подтверждено');
      setStatus('CONFIRMED');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка');
    }
  };

  const cancel = async () => {
    try {
      await axios.post(`/events/${params.id}/cancel`, null, { params: { userId } });
      setMessage('Участие отменено');
      setStatus('CANCELLED');
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Ошибка');
    }
  };

  if (!event) return <div>Загрузка...</div>;

  const canConfirm = event.status === 'ACTIVE' && status !== 'CONFIRMED';
  const canCancel = status === 'CONFIRMED';

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <span className="badge">{event.status}</span>
      </div>
      <img src={event.imageUrl} alt="Изображение события" style={{ width: '100%', borderRadius: 12 }} />
      <div className="text-sm text-slate-600">{event.startAt} — {event.endAt}</div>
      <p>{event.fullDescription}</p>
      {event.paymentInfo && (
        <div className="bg-slate-100 p-3 rounded">{event.paymentInfo}</div>
      )}
      <div className="flex gap-2">
        {canConfirm && <button className="btn" onClick={confirm}>Подтвердить участие</button>}
        {canCancel && <button className="btn secondary" onClick={cancel}>Отменить участие</button>}
      </div>
      <div className="text-sm">Ваш статус: {status || 'Вы не участвуете'}</div>
      {message && <div>{message}</div>}
    </div>
  );
}
