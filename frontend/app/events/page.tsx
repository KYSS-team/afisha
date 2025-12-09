'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';

interface EventCard {
  id: string;
  title: string;
  shortDescription?: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imageUrl: string;
  paymentInfo?: string;
  status: 'ACTIVE' | 'PAST' | 'REJECTED';
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
    axios
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
      REJECTED: 'badge red'
    };
    return <span className={mapping[status]}> {status} </span>;
  };

    return (
      <div className="space-y-4">
        <div className="tabs">
          {(
            [
            { key: 'my', label: 'Мои события' },
            { key: 'active', label: 'Активные' },
            { key: 'past', label: 'Прошедшие' }
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            className={`tab ${tab === item.key ? 'active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {events.length === 0 && !loading && <div className="card">{emptyStateByTab[tab]}</div>}
      {loading && <div className="card">Загрузка событий...</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <a key={event.id} href={`/events/${event.id}`} className="card space-y-2">
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
            <img
              src={event.imageUrl}
              alt={`Изображение события ${event.title}`}
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: 180 }}
            />
            <div className="text-sm text-slate-600">{event.shortDescription ?? event.fullDescription}</div>
            <div className="flex items-center justify-between text-sm" title={`Начало: ${event.startAt}\nОкончание: ${event.endAt}${event.paymentInfo ? `\nОплата: ${event.paymentInfo}` : ''}`}>
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
