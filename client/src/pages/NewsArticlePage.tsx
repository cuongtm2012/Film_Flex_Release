import { Link, useRoute } from 'wouter';
import { PageSEO } from '@/components/PageSEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNewsArticleBySlug } from '@shared/seo-static';
import { ArrowLeft, Newspaper } from 'lucide-react';
import NotFound from '@/pages/not-found';

export default function NewsArticlePage() {
  const [, params] = useRoute('/news/:slug');
  const slug = params?.slug ?? '';
  const article = slug ? getNewsArticleBySlug(slug) : undefined;

  if (!slug || !article) {
    return <NotFound />;
  }

  const canonicalPath = `/news/${article.slug}`;
  const paragraphs = article.content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <PageSEO
        title={article.title}
        description={article.excerpt}
        canonical={canonicalPath}
        keywords="tin phim, PhimGG, review phim, trailer"
        ogImage={article.image}
      />

      <Button variant="ghost" className="mb-6 -ml-2" asChild>
        <Link href="/news">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tin tức
        </Link>
      </Button>

      <article>
        <div className="mb-6 overflow-hidden rounded-lg">
          <img
            src={article.image}
            alt={article.title}
            className="max-h-[420px] w-full object-cover"
            loading="eager"
          />
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Newspaper className="h-3 w-3" />
            {article.category}
          </Badge>
          <time className="text-sm text-muted-foreground" dateTime={article.date}>
            {article.date}
          </time>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight">{article.title}</h1>
        <p className="mb-8 text-lg text-muted-foreground">{article.excerpt}</p>
        <div className="prose prose-invert max-w-none space-y-4 text-foreground">
          {paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
