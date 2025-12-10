'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../../auth/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="PAST">PAST</SelectItem>
            <SelectItem value="REJECTED">REJECTED</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={() => exportFile('csv')}>Экспорт CSV</Button>
          <Button onClick={() => exportFile('xlsx')}>Экспорт XLSX</Button>
          <Button asChild>
            <Link href="/admin/events/new">Новое событие</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Управление событиями</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Начало</TableHead>
                <TableHead>Окончание</TableHead>
                <TableHead>Участники</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell>{new Date(event.startAt).toLocaleString('ru-RU')}</TableCell>
                  <TableCell>{new Date(event.endAt).toLocaleString('ru-RU')}</TableCell>
                  <TableCell>{event.participants}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" asChild>
                      <Link href={`/admin/events/${event.id}/edit`}>Редактировать</Link>
                    </Button>
                    {event.status === 'PENDING' && (
                      <Button onClick={() => approve(event.id)}>Одобрить</Button>
                    )}
                    <Button variant="outline" onClick={() => exportFile('csv')}>CSV</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
