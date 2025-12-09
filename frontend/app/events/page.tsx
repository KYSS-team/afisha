'use client';

import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../auth/utils';

interface EventCard {
  id: string;
  title: string;
  shortDescription?: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imageUrl: string;
  paymentInfo?: string;
  status: 'ACTIVE' | 'PAST' | 'REJECTED' | 'PENDING';
  maxParticipants?: number;
  createdBy: string;
  participantsCount?: number;
  participationStatus?: 'CONFIRMED' | 'CANCELLED' | 'NONE';
}

export default function EventsPage() {
  const [tab, setTab] = useState<'my' | 'active' | 'past'>('my');
  const [events, setEvents] = useState<EventCard[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const emptyStateByTab: Record<typeof tab, string> = {
    my: 'Вы пока не подтвердили участие ни в одном событии.',
    active: 'Сейчас нет доступных активных событий.',
    past: 'Прошедших событий ещё не было.'
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId') ?? '';
    setUserId(savedUserId);
    setLastAction(localStorage.getItem('events:lastAction') ?? '');
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<EventCard[] | { events?: EventCard[] }>(`/events`, {
        params: { tab, userId: userId || undefined }
      })
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.events)
            ? res.data.events
            : [];
        const visibleEvents = data.filter((event) => event.status !== 'REJECTED');
        setEvents(visibleEvents);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [tab, userId, lastAction]);

  useEffect(() => {
    const handleUpdate = () => setLastAction(`${Date.now()}`);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'events:lastAction') {
        handleUpdate();
      }
    };
    const handleFocus = () => handleUpdate();

    window.addEventListener('events:updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('events:updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const statusBadge = (status: string) => {
    const mapping: Record<string, string> = {
      ACTIVE: 'badge green',
      PAST: 'badge gray',
      REJECTED: 'badge red',
      PENDING: 'badge amber'
    };
    return <span className={mapping[status] || 'badge gray'}> {status} </span>;
  };

  const cardImage = (eventId: string) => `${API_BASE_URL}/events/${eventId}/image`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="tabs">
          {([
            { key: 'my', label: 'Мои события' },
            { key: 'active', label: 'Активные' },
            { key: 'past', label: 'Прошедшие' }
          ] as const).map((item) => (
            <button
              key={item.key}
              className={`tab ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {userId && (
          <a className="btn" href="/events/new">
            Создать событие
          </a>
        )}
      </div>

      {events.length === 0 && !loading && <div className="card">{emptyStateByTab[tab]}</div>}
      {loading && <div className="card">Загрузка событий...</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <a key={event.id} href={`/events/${event.id}`} className="card space-y-2 hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-semibold">{event.title}</div>
              <div className="flex items-center gap-2">
                {statusBadge(event.status)}
                {event.participationStatus && event.participationStatus !== 'NONE' && (
                  <span className="badge blue" title="Ваш статус участия">
                    {event.participationStatus === 'CONFIRMED' ? 'Участвую' : 'Отменено'}
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border bg-slate-50">
              <img
                src={cardImage(event.id)}
                alt={`Изображение события ${event.title}`}
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="text-sm text-slate-600 line-clamp-2">{event.shortDescription ?? event.fullDescription}</div>
            <div
              className="flex items-center justify-between text-sm"
              title={`Начало: ${event.startAt}\nОкончание: ${event.endAt}${event.paymentInfo ? `\nОплата: ${event.paymentInfo}` : ''}`}
            >
              <span>{event.startAt} — {event.endAt}</span>
              <span className="text-slate-700">
                Участники: {event.participantsCount ?? 0}
                {event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
