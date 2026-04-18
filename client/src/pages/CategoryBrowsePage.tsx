import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import type { MovieListResponse } from '@/types/api';
import { PageSEO } from '@/components/PageSEO';
import MovieGrid from '@/components/MovieGrid';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

function formatSlugTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function CategoryBrowsePage() {
  const [, params] = useRoute('/categories/:slug');
  const slug = params?.slug ?? '';
  const [page, setPage] = useState(1);
  const limit = 48;

  const title = useMemo(() => formatSlugTitle(slug), [slug]);

  const { data, isLoading, isError } = useQuery<MovieListResponse>({
    queryKey: ['/api/categories', slug, page, limit],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/categories/${encodeURIComponent(slug)}?${q}`);
      if (!res.ok) throw new Error('Failed to load category');
      return res.json();
    },
    enabled: !!slug,
  });

  if (!slug) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <PageSEO
        title={`Thể loại: ${title}`}
        description={`Xem phim thể loại ${title} HD Vietsub, thuyết minh trên PhimGG. Danh sách cập nhật liên tục.`}
        canonical={`/categories/${slug}`}
        keywords={`thể loại ${title}, xem phim online, PhimGG`}
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            Khám phá phim theo thể loại.{' '}
            <Link href="/genres" className="text-primary underline-offset-4 hover:underline">
              Tất cả thể loại
            </Link>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/movies">Tất cả phim</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <p className="text-center text-destructive">Không tải được danh sách phim. Thử lại sau.</p>
      )}

      {data?.items && (
        <>
          <Separator className="mb-4 md:mb-6" />
          <MovieGrid
            title=""
            movies={data.items}
            currentPage={page}
            totalPages={data.pagination?.totalPages || 1}
            totalItems={data.pagination?.totalItems || data.items.length}
            itemsPerPage={limit}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
