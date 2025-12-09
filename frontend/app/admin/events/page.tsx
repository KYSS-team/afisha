'use client';

import Link from 'next/link';
import axios from 'axios';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    axios
      .get<AdminEventRow[]>('http://localhost:8080/admin/events', {
        headers: { 'X-Role': 'ADMIN' },
        params: { status: status || undefined },
      })
      .then((res) => setEvents(res.data));
  }, [status]);

  const exportFile = (format: 'csv' | 'xlsx') => {
    window.open(`http://localhost:8080/admin/events/export/${format}`, '_blank');
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
                <td>
                  <Link className="btn" href={`/admin/events/${event.id}/edit`}>
                    Редактировать
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

