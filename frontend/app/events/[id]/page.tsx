'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';

interface EventCard {
  id: string;
  shortDescription?: string;
  title: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imageUrl: string;
  paymentInfo?: string;
  status: 'ACTIVE' | 'PAST' | 'REJECTED';
  maxParticipants?: number;
  participantsCount?: number;
  createdBy?: string;
}

export default function EventDetail({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<EventCard | null>(null);
  const [status, setStatus] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  useEffect(() => {
    setUserId(localStorage.getItem('userId') || '');
  }, []);

  useEffect(() => {
    axios.get<EventCard>(`/events/${params.id}`).then((res) => setEvent(res.data));
  }, [params.id]);

  useEffect(() => {
    if (!userId) return;
    axios.get(`/events/${params.id}/status`, { params: { userId } }).then((res) => setStatus(res.data || 'NONE'));
  }, [params.id, userId]);

  const broadcastUpdate = () => {
    const timestamp = `${Date.now()}`;
    localStorage.setItem('events:lastAction', timestamp);
    window.dispatchEvent(new Event('events:updated'));
  };

  const confirm = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await axios.post(`/events/${params.id}/confirm`, null, { params: { userId } });
      setMessage({ type: 'success', text: 'Участие подтверждено' });
      setStatus('CONFIRMED');
      setEvent((prev) => (prev ? { ...prev, participantsCount: (prev.participantsCount ?? 0) + 1 } : prev));
      broadcastUpdate();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.message ?? 'Ошибка' });
    }
    setLoading(false);
  };

  const cancel = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await axios.post(`/events/${params.id}/cancel`, null, { params: { userId } });
      setMessage({ type: 'success', text: 'Участие отменено' });
      setStatus('CANCELLED');
      setEvent((prev) =>
        prev ? { ...prev, participantsCount: Math.max(0, (prev.participantsCount ?? 1) - 1) } : prev
      );
      broadcastUpdate();
      setCancelModalOpen(false);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.message ?? 'Ошибка' });
    }
    setLoading(false);
  };

  if (!event) return <div>Загрузка...</div>;

  const canConfirm = event.status === 'ACTIVE' && status !== 'CONFIRMED';
  const canCancel = status === 'CONFIRMED';
  const isFull = Boolean(event.maxParticipants && (event.participantsCount ?? 0) >= event.maxParticipants);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{event.startAt} — {event.endAt}</p>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          {event.shortDescription && <p className="text-slate-600">{event.shortDescription}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="badge">{event.status}</span>
          <span className="badge blue" title="Ваш статус участия">
            {status === 'CONFIRMED' ? 'Участвую' : status === 'CANCELLED' ? 'Отменено' : 'Не участвуете'}
          </span>
        </div>
      </div>

      <img src={event.imageUrl} alt="Изображение события" className="w-full rounded-xl object-cover" />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-slate-700">{event.fullDescription}</p>
          {event.paymentInfo && (
            <div className="bg-slate-100 p-3 rounded" title="Информация об оплате">
              {event.paymentInfo}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Организатор</span>
              <span className="font-semibold">{event.createdBy || 'Администратор'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Участники</span>
              <span title="Текущее количество участников">
                {event.participantsCount ?? 0}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
              </span>
            </div>
            {event.maxParticipants && (
              <div className="text-xs text-slate-500">Свободных мест: {Math.max(0, event.maxParticipants - (event.participantsCount ?? 0))}</div>
            )}
          </div>
          <div className="flex gap-2">
            {canConfirm && (
              <button className="btn" disabled={loading || isFull} onClick={confirm} title={isFull ? 'Достигнут лимит участников' : undefined}>
                {isFull ? 'Нет мест' : 'Подтвердить участие'}
              </button>
            )}
            {canCancel && (
              <button className="btn secondary" disabled={loading} onClick={() => setCancelModalOpen(true)}>
                Отменить участие
              </button>
            )}
          </div>
          <div className="text-sm">Ваш статус: {status || 'Вы не участвуете'}</div>
        </div>
      </div>

      {message && (
        <div className={`rounded p-3 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {cancelModalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-40">
          <div className="card space-y-3 w-full max-w-md">
            <h2 className="text-xl font-semibold">Отменить участие?</h2>
            <p>Вы уверены, что хотите отменить участие в событии «{event.title}»?</p>
            <div className="flex justify-end gap-2">
              <button className="btn secondary" onClick={() => setCancelModalOpen(false)} disabled={loading}>
                Вернуться
              </button>
              <button className="btn" onClick={cancel} disabled={loading}>
                Подтвердить отмену
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
