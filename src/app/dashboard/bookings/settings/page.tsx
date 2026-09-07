import type { Metadata } from 'next';
import ConsultationSettingsPage from './ConsultationSettingsPage';

export const metadata: Metadata = {
  title: 'Consultation Settings — Admin',
  description: 'Configure consultation availability, booking windows and rescheduling rules.',
};

export default function Page() {
  return <ConsultationSettingsPage />;
}
