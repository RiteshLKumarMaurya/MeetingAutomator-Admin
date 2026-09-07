import type { Metadata } from 'next';
import AdminBookingsPage from './AdminBookingsPage';

export const metadata: Metadata = {
  title: 'Consultations — Admin',
  description: 'Manage Meeting Automator one-to-one consultation bookings.',
};

export default function Page() {
  return <AdminBookingsPage />;
}
