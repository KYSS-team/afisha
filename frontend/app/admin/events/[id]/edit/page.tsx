import { EventForm } from '../../EventForm';

interface Props {
  params: { id: string };
}

export default function EditEventPage({ params }: Props) {
  return <EventForm eventId={params.id} />;
}

