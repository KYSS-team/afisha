import { Suspense } from 'react';
import { ResetForm } from './reset-form';

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="card max-w-lg">Загрузка формы...</div>}>
      <ResetForm />
    </Suspense>
  );
}
