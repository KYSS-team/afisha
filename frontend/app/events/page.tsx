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
}

export default function EventsPage() {
  const [tab, setTab] = useState<'my' | 'active' | 'past'>('my');
  const [events, setEvents] = useState<EventCard[]>([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const queryUser = localStorage.getItem('userId') ?? '';
    setUserId(queryUser);
    axios
      .get<EventCard[]>(`/events`, { params: { tab, userId: queryUser || undefined } })
      .then((res) => setEvents(res.data));
  }, [tab]);

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

      {events.length === 0 && <div className="card">Нет событий</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <a key={event.id} href={`/events/${event.id}`} className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{event.title}</div>
              {statusBadge(event.status)}
            </div>
            <div className="text-sm text-slate-600">{event.shortDescription ?? event.fullDescription}</div>
            <div className="text-sm">{event.startAt} — {event.endAt}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
