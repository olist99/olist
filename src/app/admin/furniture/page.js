import { redirect } from 'next/navigation';

export default function FurniturePage() {
  redirect('/admin?tab=hotel-content&view=furniture');
}
