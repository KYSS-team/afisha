'use client';

import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../auth/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

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
  createdByFullName?: string;
  participantsCount?: number;
  participationStatus?: 'CONFIRMED' | 'CANCELLED' | 'NONE';
}

export default function EventsPage() {
  const [tab, setTab] = useState<'my' | 'active' | 'past'>('my');
  const [events, setEvents] = useState<EventCard[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [cancelEvent, setCancelEvent] = useState<EventCard | null>(null);

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
    if (!userId) {
      setEvents([]);
      return;
    }
    setLoading(true);

    let url = `/events`;
    if (tab === 'my') {
      url = `/users/${userId}/events`;
    } else if (tab === 'active') {
      url = `/events/active`;
    } else if (tab === 'past') {
      url = `/events/past`;
    }

    api
      .get<EventCard[] | { events?: EventCard[] }>(url, {
        params: { userId: userId || undefined }
      })
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.events)
            ? res.data.events
            : [];
        setEvents(data);
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

  const cardImage = (eventId: string) => `${API_BASE_URL}/events/${eventId}/image`;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value as any)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList>
            <TabsTrigger value="my">Мои события</TabsTrigger>
            <TabsTrigger value="active">Активные</TabsTrigger>
            <TabsTrigger value="past">Прошедшие</TabsTrigger>
          </TabsList>

          {userId && (
            <Button asChild>
              <Link href="/events/new">Создать событие</Link>
            </Button>
          )}
        </div>

        <TabsContent value={tab}>
          {events.length === 0 && !loading && (
            <Card>
              <CardContent className="p-6">{emptyStateByTab[tab]}</CardContent>
            </Card>
          )}

          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-4 w-1/4" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <TooltipProvider key={event.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/events/${event.id}`}>
                      <Card className="hover:-translate-y-1 transition-transform">
                        <CardHeader>
                          <CardTitle>{event.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            {event.status === 'ACTIVE' && <Badge>Активно</Badge>}
                            {event.status === 'PAST' && <Badge variant="secondary">Прошло</Badge>}
                            {event.status === 'PENDING' && <Badge variant="outline">Ожидает</Badge>}
                            {event.status === 'REJECTED' && <Badge variant="destructive">Отклонено</Badge>}
                            {event.participationStatus && event.participationStatus !== 'NONE' && (
                              <Badge variant={event.participationStatus === 'CONFIRMED' ? 'default' : 'destructive'}>
                                {event.participationStatus === 'CONFIRMED' ? 'Участвую' : 'Отменено'}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex-grow">
                            <img
                              src={cardImage(event.id)}
                              alt={`Изображение события ${event.title}`}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <CardDescription className="mt-2 line-clamp-2">
                              {event.shortDescription ?? event.fullDescription}
                            </CardDescription>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            {userId &&
                              event.status === 'ACTIVE' &&
                              event.participationStatus !== 'CONFIRMED' && (
                                <Button
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                      await api.post(`/events/${event.id}/confirm`, null, { params: { userId } });
                                      window.dispatchEvent(new Event('events:updated'));
                                    } catch (error) {
                                      console.error('Failed to confirm participation', error);
                                    }
                                  }}
                                >
                                  Участвовать
                                </Button>
                              )}
                            {userId && event.participationStatus === 'CONFIRMED' && (
                              <Button
                                variant="destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCancelEvent(event);
                                }}
                              >
                                Отменить участие
                              </Button>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <div>
                            <span>
                              {new Date(event.startAt).toLocaleDateString('ru-RU')} — {new Date(event.endAt).toLocaleDateString('ru-RU')}
                            </span>
                            <p className="text-sm text-gray-500">{event.createdByFullName}</p>
                          </div>
                          <div>
                            Участники: {event.participantsCount ?? 0}
                            {event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{event.fullDescription}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!cancelEvent} onOpenChange={(open) => !open && setCancelEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить участие?</DialogTitle>
          </DialogHeader>
          <p>Вы уверены, что хотите отменить участие в событии «{cancelEvent?.title}»?</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Вернуться</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!cancelEvent) return;
                try {
                  await api.post(`/events/${cancelEvent.id}/cancel`, null, { params: { userId } });
                  window.dispatchEvent(new Event('events:updated'));
                  setCancelEvent(null);
                } catch (error) {
                  console.error('Failed to cancel participation', error);
                }
              }}
            >
              Подтвердить отмену
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
