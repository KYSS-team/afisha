import { Suspense } from 'react';
import { ResetForm } from '../reset-form';

export default function ResetWithTokenPage({ params }: { params: { token: string } }) {
  return (
    <Suspense fallback={<div className="card max-w-lg">Загрузка формы...</div>}>
      <ResetForm initialToken={params.token} />
    </Suspense>
  );
}
