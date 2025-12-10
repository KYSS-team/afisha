'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../../auth/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
      status: form.status,
      paymentInfo: form.paymentInfo,
    };
    try {
      if (eventId) {
        await api.put(`/admin/events/${eventId}`, payload, { headers: { 'X-Role': 'ADMIN' } });
      } else {
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('Не удалось определить создателя события');
        await api.post('/admin/events', { ...payload, createdBy: userId }, { headers: { 'X-Role': 'ADMIN' } });
      }
      window.location.href = '/admin/events';
    } catch (error) {
      console.error('Failed to save event', error);
      alert('Не удалось сохранить событие');
    }
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
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{eventId ? 'Редактирование события' : 'Новое событие'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Название" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
            <Select value={form.status} onValueChange={(value) => updateField('status', value)}>
              <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="PAST">PAST</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Краткое описание" value={form.shortDescription} onChange={(e) => updateField('shortDescription', e.target.value)} />
          <Textarea placeholder="Полное описание" value={form.fullDescription} onChange={(e) => updateField('fullDescription', e.target.value)} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input type="datetime-local" value={form.startAt} onChange={(e) => updateField('startAt', e.target.value)} required />
            <Input type="datetime-local" value={form.endAt} onChange={(e) => updateField('endAt', e.target.value)} required />
          </div>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {form.imagePreview && <img src={form.imagePreview} alt="Превью баннера" className="w-full max-h-56 object-cover rounded" />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Оплата" value={form.paymentInfo} onChange={(e) => updateField('paymentInfo', e.target.value)} />
            <Input
              type="number"
              placeholder="Лимит участников"
              value={form.maxParticipants}
              onChange={(e) => updateField('maxParticipants', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <p>Участники</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={form.participantIds.includes(user.id)}
                    onCheckedChange={() => toggleParticipant(user.id)}
                  />
                  <label htmlFor={`user-${user.id}`}>{user.fullName}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" asChild>
              <Link href="/admin/events">Назад</Link>
            </Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
