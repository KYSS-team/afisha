'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    axios.get<UserRow[]>('http://localhost:8080/admin/users', { params: { query } }).then((res) => setUsers(res.data));
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-sm">Поиск по ФИО</label>
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
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
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
