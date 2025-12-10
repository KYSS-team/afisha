'use client';

import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../../auth/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EventCard {
  id: string;
  shortDescription?: string;
  title: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  imageUrl: string;
  paymentInfo?: string;
  status: 'ACTIVE' | 'PAST' | 'REJECTED' | 'PENDING';
  maxParticipants?: number;
  participantsCount?: number;
  createdBy?: string;
  createdByFullName?: string;
  participationStatus?: 'CONFIRMED' | 'CANCELLED' | 'NONE';
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
    api.get<EventCard>(`/events/${params.id}`).then((res) => setEvent(res.data));
  }, [params.id]);

  useEffect(() => {
    if (!userId) return;
    api.get(`/events/${params.id}/status`, { params: { userId } }).then((res) => setStatus(res.data || 'NONE'));
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
      await api.post(`/events/${params.id}/confirm`, null, { params: { userId } });
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
      await api.post(`/events/${params.id}/cancel`, null, { params: { userId } });
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

  const isCreator = event.createdBy === userId;
  const canConfirm = !isCreator && event.status === 'ACTIVE' && status !== 'CONFIRMED';
  const canCancel = status === 'CONFIRMED';
  const isFull = Boolean(event.maxParticipants && (event.participantsCount ?? 0) >= event.maxParticipants);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">
                {new Date(event.startAt).toLocaleDateString('ru-RU')} —{' '}
                {new Date(event.endAt).toLocaleDateString('ru-RU')}
              </p>
              <CardTitle>{event.title}</CardTitle>
              {event.shortDescription && <p className="text-slate-600">{event.shortDescription}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge>{event.status}</Badge>
              <Badge variant="outline" title="Ваш статус участия">
                {status === 'CONFIRMED' ? 'Участвую' : status === 'CANCELLED' ? 'Отменено' : 'Не участвуете'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <img
            src={`${API_BASE_URL}/events/${event.id}/image`}
            alt="Изображение события"
            className="w-full rounded-xl object-cover"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Описание</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-slate-700">{event.fullDescription}</p>
            {event.status === 'PENDING' && (
              <Badge variant="secondary" title="На рассмотрении администратором">
                Модерация
              </Badge>
            )}
            {event.paymentInfo && (
              <div
                className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 p-3 rounded"
                title="Информация об оплате"
              >
                {event.paymentInfo}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Организатор</span>
                <span className="font-semibold">{event.createdByFullName || 'Администратор'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Участники</span>
                <span title="Текущее количество участников">
                  {event.participantsCount ?? 0}
                  {event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
                </span>
              </div>
              {event.maxParticipants && (
                <div className="text-xs text-slate-500">
                  Свободных мест: {Math.max(0, event.maxParticipants - (event.participantsCount ?? 0))}
                </div>
              )}
            </div>
            {userId && (
              <>
                <div className="flex gap-2">
                  {canConfirm && (
                    <Button
                      disabled={loading || isFull}
                      onClick={confirm}
                      title={isFull ? 'Достигнут лимит участников' : undefined}
                    >
                      {isFull ? 'Нет мест' : 'Подтвердить участие'}
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="destructive" disabled={loading} onClick={() => setCancelModalOpen(true)}>
                      Отменить участие
                    </Button>
                  )}
                </div>
                <div className="text-sm">
                  Ваш статус: {status === 'CONFIRMED' ? 'Вы участвуете' : 'Вы не участвуете'}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {event.status === 'PAST' && status === 'CONFIRMED' && (
        <Card>
          <CardHeader>
            <CardTitle>Оставить отзыв</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const score = (form.elements.namedItem('score') as HTMLInputElement).value;
                const comment = (form.elements.namedItem('comment') as HTMLTextAreaElement).value;
                try {
                  await api.post(
                    `/events/${params.id}/ratings`,
                    { score: parseInt(score, 10), comment },
                    { params: { userId } },
                  );
                  setMessage({ type: 'success', text: 'Спасибо за ваш отзыв!' });
                } catch (error: any) {
                  setMessage({ type: 'error', text: error.response?.data?.message ?? 'Не удалось отправить отзыв' });
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span>Оценка:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <label key={star} className="flex items-center gap-1 cursor-pointer">
                    <Input type="radio" name="score" value={star} required />
                    <span>{star}⭐</span>
                  </label>
                ))}
              </div>
              <Textarea name="comment" placeholder="Ваш комментарий" />
              <Button type="submit">Отправить</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {message && (
        <div
          className={`rounded p-3 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-50'
          }`}
        >
          {message.text}
        </div>
      )}

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить участие?</DialogTitle>
          </DialogHeader>
          <p>Вы уверены, что хотите отменить участие в событии «{event.title}»?</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)} disabled={loading}>
                Вернуться
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={cancel} disabled={loading}>
              Подтвердить отмену
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
