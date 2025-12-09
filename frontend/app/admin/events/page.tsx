'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../../auth/utils';

interface AdminEventRow {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  participants: number;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [status, setStatus] = useState('');

  const loadEvents = () => {
    api
      .get<AdminEventRow[]>('/admin/events', {
        headers: { 'X-Role': 'ADMIN' },
        params: { status: status || undefined },
      })
      .then((res) => setEvents(res.data));
  };

  useEffect(() => {
    loadEvents();
  }, [status]);

  const exportFile = (format: 'csv' | 'xlsx') => {
    window.open(`${API_BASE_URL}/admin/events/export/${format}`, '_blank');
  };

  const approve = async (id: string) => {
    const details = await api.get(`/admin/events/${id}`, { headers: { 'X-Role': 'ADMIN' } });
    const { event, participants } = details.data;
    await api.put(
      `/admin/events/${id}`,
      {
        title: event.title,
        shortDescription: event.shortDescription,
        fullDescription: event.fullDescription,
        startAt: event.startAt,
        endAt: event.endAt,
        paymentInfo: event.paymentInfo,
        maxParticipants: event.maxParticipants,
        status: 'ACTIVE',
        participantIds: participants.map((p: any) => p.userId),
      },
      { headers: { 'X-Role': 'ADMIN' } },
    );
    loadEvents();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm">Статус</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Все</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAST">PAST</option>
            <option value="REJECTED">REJECTED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => exportFile('csv')}>
            Экспорт CSV
          </button>
          <button className="btn" onClick={() => exportFile('xlsx')}>
            Экспорт XLSX
          </button>
          <Link className="btn" href="/admin/events/new">
            Новое событие
          </Link>
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Название</th>
              <th align="left">Статус</th>
              <th align="left">Начало</th>
              <th align="left">Окончание</th>
              <th align="left">Участники</th>
              <th align="left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>{event.status}</td>
                <td>{event.startAt}</td>
                <td>{event.endAt}</td>
                <td>{event.participants}</td>
                <td className="space-x-2">
                  <Link className="btn" href={`/admin/events/${event.id}/edit`}>
                    Редактировать
                  </Link>
                  {event.status === 'PENDING' && (
                    <button className="btn secondary" onClick={() => approve(event.id)}>
                      Одобрить
                    </button>
                  )}
                  <button className="btn secondary" onClick={() => exportFile(event.id, 'csv')}>
                    CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

