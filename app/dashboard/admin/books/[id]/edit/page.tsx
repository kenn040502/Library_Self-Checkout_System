import { notFound, redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import AdminShell from '@/app/ui/dashboard/adminShell';
import AddBookForm from '@/app/ui/dashboard/admin/addBookForm';
import { isLikelyImageUrl } from '@/app/lib/validators/imageUrl';

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'staff') redirect('/dashboard');

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Books')
    .select(
      'id, title, author, isbn, classification, publisher, publication_year, cover_image_url, category',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  return (
    <>
      <title>Edit book | Admin</title>
      <AdminShell
        titleSubtitle="Catalog · Edit"
        title={`Edit: ${data.title}`}
        description="Update title metadata, cover image, or classification."
      >
        <AddBookForm
          mode="edit"
          bookId={id}
          initialValues={{
            title: data.title ?? '',
            author: data.author ?? '',
            isbn: data.isbn ?? '',
            publisher: data.publisher ?? '',
            year: data.publication_year ?? '',
            classification: data.classification ?? '',
            coverUrl: isLikelyImageUrl(data.cover_image_url) ? (data.cover_image_url ?? '') : '',
            category: data.category ?? '',
            tags: [],
          }}
        />
      </AdminShell>
    </>
  );
}
