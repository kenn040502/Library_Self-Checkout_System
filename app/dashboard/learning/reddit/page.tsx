import { redirect } from 'next/navigation';

export default function RedditRedirect() {
  redirect('/dashboard/learning/youtube?view=community');
}
