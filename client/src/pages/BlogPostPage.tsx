import { Link, useRoute } from 'wouter';
import { PageSEO } from '@/components/PageSEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBlogPostById } from '@shared/blog-posts';
import { Calendar, Clock, User, ArrowLeft } from 'lucide-react';
import NotFound from '@/pages/not-found';

export default function BlogPostPage() {
  const [, params] = useRoute('/blog/posts/:postId');
  const rawId = params?.postId;
  const id = rawId ? parseInt(rawId, 10) : NaN;
  const post = !Number.isNaN(id) ? getBlogPostById(id) : undefined;

  if (!post) {
    return <NotFound />;
  }

  const canonicalPath = `/blog/posts/${post.id}`;
  const paragraphs = post.content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <PageSEO
        title={post.title}
        description={post.excerpt}
        canonical={canonicalPath}
        keywords={post.tags.join(', ')}
        ogImage={post.image}
      />

      <Button variant="ghost" className="mb-6 -ml-2" asChild>
        <Link href="/blog">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Blog
        </Link>
      </Button>

      <article>
        <div className="mb-6 overflow-hidden rounded-lg">
          <img src={post.image} alt={post.title} className="max-h-[420px] w-full object-cover" loading="eager" />
        </div>
        <Badge className="mb-3">{post.category}</Badge>
        <h1 className="mb-4 text-3xl font-bold leading-tight">{post.title}</h1>
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime}
          </span>
        </div>
        <div className="prose prose-invert max-w-none space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed text-foreground">
              {p}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
