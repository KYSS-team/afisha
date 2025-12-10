'use client';

import { useEffect, useState } from 'react';
import { api } from '../auth/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  registeredAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('USER');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    api
      .get<UserRow[]>('/admin/users', {
        headers: { 'X-Role': 'ADMIN' },
        params: {
          query,
          role: role || undefined,
          status: status || undefined,
          registeredFrom: registeredFrom ? new Date(registeredFrom).toISOString() : undefined,
          registeredTo: registeredTo ? new Date(registeredTo).toISOString() : undefined,
        },
      })
      .then((res) => setUsers(res.data));
  }, [query, role, status, registeredFrom, registeredTo]);

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api.patch(
      `/admin/users/${editing.id}`,
      { fullName: editFullName, role: editRole, status: editStatus },
      { headers: { 'X-Role': 'ADMIN' } },
    );
    setEditing(null);
    setQuery((q) => q + '');
  };

  const confirmReset = (user: UserRow) => {
    setResetTarget(user);
    setNewPassword('');
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    await api.post(
      `/admin/users/${resetTarget.id}/reset-password`,
      { newPassword },
      { headers: { 'X-Role': 'ADMIN' } },
    );
    setResetTarget(null);
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/admin/users/${id}`, { headers: { 'X-Role': 'ADMIN' } });
    setQuery((q) => q + '');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input placeholder="ФИО" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Роль" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              <SelectItem value="USER">USER</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Любой</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="DELETED">Удалён</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={registeredFrom} onChange={(e) => setRegisteredFrom(e.target.value)} />
          <Input type="date" value={registeredTo} onChange={(e) => setRegisteredTo(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Управление пользователями</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Почта</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{new Date(user.registeredAt).toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell>{user.status}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" onClick={() => openEdit(user)}>Редактировать</Button>
                    <Button variant="outline" onClick={() => confirmReset(user)}>Сбросить пароль</Button>
                    {user.status !== 'DELETED' && (
                      <Button variant="destructive" onClick={() => deleteUser(user.id)}>Удалить</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="ФИО" />
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger><SelectValue placeholder="Роль" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="DELETED">DELETED</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
              <Button onClick={saveEdit}>Сохранить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сброс пароля для {resetTarget?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Новый пароль"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResetTarget(null)}>Отмена</Button>
              <Button onClick={submitReset} disabled={!newPassword}>Подтвердить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
