'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../auth/utils';

interface EventFormState {
  title: string;
  shortDescription: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  paymentInfo: string;
  maxParticipants: string;
}

export default function NewEventPage() {
  const [form, setForm] = useState<EventFormState>({
    title: '',
    shortDescription: '',
    fullDescription: '',
    startAt: '',
    endAt: '',
    paymentInfo: '',
    maxParticipants: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageType, setImageType] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId') ?? '';
    const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    if (savedUserId && isValidUuid.test(savedUserId)) {
      setUserId(savedUserId);
      return;
    }

    localStorage.removeItem('userId');
    setUserId('');
    router.replace('/auth/login?error=auth_required');
  }, [router]);

  const handleFile = (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Размер файла должен быть меньше 2 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImageBase64(base64);
      setImageType(file.type);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const updateField = (key: keyof EventFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!userId) {
      setMessage('Авторизуйтесь, чтобы создавать события.');
      return;
    }
    if (!imageBase64) {
      setMessage('Добавьте баннер события (до 2 МБ).');
      return;
    }
    setLoading(true);
    try {
      await api.post(
        '/events',
        {
          title: form.title,
          shortDescription: form.shortDescription,
          fullDescription: form.fullDescription,
          startAt: form.startAt,
          endAt: form.endAt,
          imageBase64,
          imageType,
          paymentInfo: form.paymentInfo,
          maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
          participantIds: []
        },
        { params: { creatorId: userId } }
      );
      localStorage.setItem('events:lastAction', `${Date.now()}`);
      setMessage('Событие отправлено на модерацию. Мы уведомим об одобрении.');
      setTimeout(() => router.push('/events'), 600);
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Не удалось создать событие');
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <div className="card max-w-2xl">Перенаправляем на страницу входа...</div>;
  }

  return (
    <div className="card space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">Новая афиша</p>
          <h1 className="text-2xl font-semibold">Создать событие</h1>
        </div>
        <button className="btn secondary" onClick={() => router.back()}>
          Назад
        </button>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm">Название</span>
            <input
              className="input"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm">Краткое описание</span>
            <input
              className="input"
              value={form.shortDescription}
              onChange={(e) => updateField('shortDescription', e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm">Полное описание</span>
          <textarea
            className="input min-h-[120px]"
            value={form.fullDescription}
            onChange={(e) => updateField('fullDescription', e.target.value)}
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm">Начало</span>
            <input
              type="datetime-local"
              className="input"
              value={form.startAt}
              onChange={(e) => updateField('startAt', e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm">Окончание</span>
            <input
              type="datetime-local"
              className="input"
              value={form.endAt}
              onChange={(e) => updateField('endAt', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm">Оплата</span>
            <input
              className="input"
              value={form.paymentInfo}
              onChange={(e) => updateField('paymentInfo', e.target.value)}
              placeholder="Например, бесплатно"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm">Лимит участников</span>
            <input
              className="input"
              type="number"
              value={form.maxParticipants}
              onChange={(e) => updateField('maxParticipants', e.target.value)}
              placeholder="Необязательно"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Баннер события</span>
          <label className="upload">
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <span>{imagePreview ? 'Заменить изображение' : 'Загрузить изображение (до 2 МБ)'}</span>
          </label>
          {imagePreview && (
            <div className="rounded-lg border p-2 bg-slate-50">
              <img src={imagePreview} alt="Превью баннера" className="w-full max-h-64 object-cover rounded" />
            </div>
          )}
          {!imagePreview && <p className="text-xs text-slate-500">Поддерживаются изображения PNG или JPG.</p>}
        </div>

        {message && <div className="rounded bg-slate-100 p-3 text-sm">{message}</div>}

        <div className="flex justify-end">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Сохраняем...' : 'Отправить на модерацию'}
          </button>
        </div>
      </form>
    </div>
  );
}
