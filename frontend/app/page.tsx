import Link from 'next/link';

export default function Home() {
  return (
    <section className="card space-y-3">
      <h1 className="text-3xl font-bold">Добро пожаловать в электронную афишу</h1>
      <p className="text-slate-700">
        Здесь можно следить за активными событиями, предлагать собственные мероприятия и управлять пользователями в админ-панели.
      </p>
      <div className="flex flex-wrap gap-2">
        <a 
        className="
        " 
        href="/events">Смотреть события</a>
        <a 
        className="
        "
         href="/auth/register">Создать аккаунт</a>
      </div>
    </section>
  );
}
