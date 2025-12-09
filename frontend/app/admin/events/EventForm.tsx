'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../../auth/utils';

export interface AdminEventFormProps {
  eventId?: string;
}

interface UpsertEvent {
  title: string;
  shortDescription: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imagePreview: string;
  imageBase64?: string;
  imageType?: string;
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
    imagePreview: '',
    paymentInfo: '',
    maxParticipants: '',
    status: 'ACTIVE',
    participantIds: [],
  });
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    api
      .get<UserOption[]>('/admin/users', {
        headers: { 'X-Role': 'ADMIN' },
      })
      .then((res) => setUsers(res.data));
  }, []);

  useEffect(() => {
    if (!eventId) return;
    api
      .get(`/admin/events/${eventId}`, { headers: { 'X-Role': 'ADMIN' } })
      .then((res) => {
        const { event, participants } = res.data;
        setForm({
          title: event.title,
          shortDescription: event.shortDescription ?? '',
          fullDescription: event.fullDescription,
          startAt: event.startAt?.replace(' ', 'T') ?? '',
          endAt: event.endAt?.replace(' ', 'T') ?? '',
          imagePreview: `${API_BASE_URL}/events/${eventId}/image`,
          paymentInfo: event.paymentInfo ?? '',
          maxParticipants: event.maxParticipants ?? '',
          status: event.status,
          participantIds: participants.map((p: any) => p.userId),
        });
      });
  }, [eventId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId && !form.imageBase64) {
      alert('Добавьте изображение события');
      return;
    }
    const payload = {
      title: form.title,
      shortDescription: form.shortDescription,
      fullDescription: form.fullDescription,
      maxParticipants: form.maxParticipants === '' ? null : Number(form.maxParticipants),
      startAt: form.startAt,
      endAt: form.endAt,
      participantIds: form.participantIds,
      imageBase64: form.imageBase64 || undefined,
      imageType: form.imageType || undefined,
      createdBy: undefined,
      status: form.status,
      paymentInfo: form.paymentInfo,
    };
    if (eventId) {
      await api.put(`/admin/events/${eventId}`, payload, { headers: { 'X-Role': 'ADMIN' } });
    } else {
      await api.post('/admin/events', payload, { headers: { 'X-Role': 'ADMIN' } });
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

  const handleFile = (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Файл должен быть меньше 2 МБ');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setForm((prev) => ({ ...prev, imageBase64: base64, imageType: file.type, imagePreview: result }));
    };
    reader.readAsDataURL(file);
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
            <option value="PENDING">PENDING</option>
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

      <div className="flex flex-col gap-2">
        <span className="text-sm">Баннер события</span>
        <label className="upload">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <span>{form.imagePreview ? 'Заменить изображение' : 'Загрузить изображение (до 2 МБ)'}</span>
        </label>
        {form.imagePreview && (
          <div className="rounded-lg border p-2 bg-slate-50">
            <img src={form.imagePreview} alt="Превью баннера" className="w-full max-h-56 object-cover rounded" />
          </div>
        )}
      </div>

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

