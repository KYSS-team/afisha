'use client';

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface AdminEventFormProps {
  eventId?: string;
}

interface UpsertEvent {
  title: string;
  shortDescription: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imageUrl: string;
  paymentInfo: string;
  maxParticipants: number | '';
  status: string;
  participantIds: string[];
}

interface UserOption {
  id: string;
  fullName: string;
}

export function EventForm({ eventId }: AdminEventFormProps) {
  const [form, setForm] = useState<UpsertEvent>({
    title: '',
    shortDescription: '',
    fullDescription: '',
    startAt: '',
    endAt: '',
    imageUrl: '',
    paymentInfo: '',
    maxParticipants: '',
    status: 'ACTIVE',
    participantIds: [],
  });
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    axios
      .get<UserOption[]>('http://localhost:8080/admin/users', {
        headers: { 'X-Role': 'ADMIN' },
      })
      .then((res) => setUsers(res.data));
  }, []);

  useEffect(() => {
    if (!eventId) return;
    axios
      .get(`http://localhost:8080/admin/events/${eventId}`, { headers: { 'X-Role': 'ADMIN' } })
      .then((res) => {
        const { event, participants } = res.data;
        setForm({
          title: event.title,
          shortDescription: event.shortDescription ?? '',
          fullDescription: event.fullDescription,
          startAt: event.startAt?.replace(' ', 'T') ?? '',
          endAt: event.endAt?.replace(' ', 'T') ?? '',
          imageUrl: event.imageUrl,
          paymentInfo: event.paymentInfo ?? '',
          maxParticipants: event.maxParticipants ?? '',
          status: event.status,
          participantIds: participants.map((p: any) => p.userId),
        });
      });
  }, [eventId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      maxParticipants: form.maxParticipants === '' ? null : Number(form.maxParticipants),
      startAt: new Date(form.startAt),
      endAt: new Date(form.endAt),
      participantIds: form.participantIds,
      createdBy: undefined,
    };
    if (eventId) {
      await axios.put(`http://localhost:8080/admin/events/${eventId}`, payload, { headers: { 'X-Role': 'ADMIN' } });
    } else {
      await axios.post('http://localhost:8080/admin/events', payload, { headers: { 'X-Role': 'ADMIN' } });
    }
    window.location.href = '/admin/events';
  };

  const updateField = (key: keyof UpsertEvent, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleParticipant = (id: string) => {
    setForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(id)
        ? prev.participantIds.filter((p) => p !== id)
        : [...prev.participantIds, id],
    }));
  };

  return (
    <form className="card space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{eventId ? 'Редактирование события' : 'Новое событие'}</h2>
        <Link className="btn" href="/admin/events">
          Назад
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm">Название</span>
          <input className="input" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm">Статус</span>
          <select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAST">PAST</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm">Краткое описание</span>
        <input className="input" value={form.shortDescription} onChange={(e) => updateField('shortDescription', e.target.value)} />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm">Полное описание</span>
        <textarea className="input" value={form.fullDescription} onChange={(e) => updateField('fullDescription', e.target.value)} required />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm">Начало</span>
          <input type="datetime-local" className="input" value={form.startAt} onChange={(e) => updateField('startAt', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm">Окончание</span>
          <input type="datetime-local" className="input" value={form.endAt} onChange={(e) => updateField('endAt', e.target.value)} required />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm">URL изображения</span>
        <input className="input" value={form.imageUrl} onChange={(e) => updateField('imageUrl', e.target.value)} required />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm">Оплата</span>
          <input className="input" value={form.paymentInfo} onChange={(e) => updateField('paymentInfo', e.target.value)} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm">Лимит участников</span>
          <input
            className="input"
            type="number"
            value={form.maxParticipants}
            onChange={(e) => updateField('maxParticipants', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm">Участники</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {users.map((user) => (
            <label key={user.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.participantIds.includes(user.id)}
                onChange={() => toggleParticipant(user.id)}
              />
              <span>{user.fullName}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn" type="submit">
          Сохранить
        </button>
      </div>
    </form>
  );
}

