'use client';

import { useEffect, useState } from 'react';
import { api } from '../auth/utils';

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-sm">ФИО</label>
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm">Роль</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Все</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm">Статус</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Любой</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DELETED">Удалён</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm">Регистрация от</label>
          <input type="date" className="input" value={registeredFrom} onChange={(e) => setRegisteredFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm">Регистрация до</label>
          <input type="date" className="input" value={registeredTo} onChange={(e) => setRegisteredTo(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">ФИО</th>
              <th align="left">Почта</th>
              <th align="left">Роль</th>
              <th align="left">Статус</th>
              <th align="left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.status}</td>
                <td className="space-x-2">
                  <button className="btn" onClick={() => openEdit(user)}>
                    Редактировать
                  </button>
                  <button className="btn" onClick={() => confirmReset(user)}>
                    Сбросить пароль
                  </button>
                  {user.status !== 'DELETED' && (
                    <button className="btn" onClick={() => deleteUser(user.id)}>
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="card space-y-3 w-[420px]">
            <h3 className="text-lg font-semibold">Редактирование пользователя</h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm">ФИО</label>
              <input className="input" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">Роль</label>
              <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">Статус</label>
              <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setEditing(null)}>
                Отмена
              </button>
              <button className="btn" onClick={saveEdit}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="card space-y-3 w-[380px]">
            <h3 className="text-lg font-semibold">Сброс пароля для {resetTarget.fullName}</h3>
            <input
              className="input"
              type="password"
              placeholder="Новый пароль"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setResetTarget(null)}>
                Отмена
              </button>
              <button className="btn" onClick={submitReset} disabled={!newPassword}>
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
