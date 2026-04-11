import { redirect } from 'next/navigation';

export default async function ManagePage() {
  redirect('/manage/companies');
}
