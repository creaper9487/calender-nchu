import { redirect } from 'next/navigation';

// 舊入口，已整併到 /import。
export default function StartupRedirect() {
  redirect('/import');
}
