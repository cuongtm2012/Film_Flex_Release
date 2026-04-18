/**
 * Static SEO data shared by the API (sitemap) and the client (news pages).
 * Keep slugs stable — they are used in URLs and sitemap.xml.
 */

/** Category URL slugs — must match links from /genres → /categories/:slug */
export const CATEGORY_SLUGS: string[] = [
  'hanh-dong',
  'chinh-kich',
  'tinh-cam',
  'hai-huoc',
  'kinh-di',
  'khoa-hoc-vien-tuong',
  'giat-gan',
  'phieu-luu-hanh-dong',
  'bi-an',
  'toi-pham',
  'am-nhac',
  'gia-dinh',
  'chien-tranh',
  'hoat-hinh',
  'cao-boi',
];

export interface StaticNewsArticle {
  slug: string;
  id: number;
  title: string;
  excerpt: string;
  date: string;
  category: 'news' | 'review' | 'trailer';
  image: string;
  content: string;
}

export const NEWS_ARTICLES: StaticNewsArticle[] = [
  {
    slug: 'top-10-phim-he-xem-ngay',
    id: 1,
    title: 'Top 10 phim đáng xem mùa hè này',
    excerpt:
      'Mùa hè đã đến, cùng điểm qua những bộ phim bom tấn và phim độc lập đáng chú ý nhất trên PhimGG.',
    date: '2025-05-01',
    category: 'news',
    image:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1450&auto=format&fit=crop',
    content: `Mùa hè là thời điểm lý tưởng để cập nhật những bộ phim mới nhất. Danh sách dưới đây gồm các tác phẩm có lượt xem cao và đánh giá tốt trên PhimGG.

Bạn có thể lưu phim vào danh sách xem sau hoặc chia sẻ link trực tiếp từ trang chi tiết từng tựa phim. Chúc bạn có những buổi xem phim thật thoải mái.`,
  },
  {
    slug: 'review-phim-trinh-tham-dang-chu-y',
    id: 2,
    title: 'Review: Bộ phim trinh thám đang được bàn tán nhiều nhất',
    excerpt:
      'Phân tích nhanh về kịch bản, diễn xuất và mức độ hồi hộp — có đáng để bạn dành một tối cuối tuần?',
    date: '2025-04-28',
    category: 'review',
    image:
      'https://images.unsplash.com/photo-1518929458113-94d07e1aaf46?q=80&w=1446&auto=format&fit=crop',
    content: `Bộ phim kết hợp giữa kỹ thuật quay và nhịp kịch bản ổn định, phù hợp khán giả thích dòng tâm lý và trinh thám.

Nếu bạn thích twist ở hồi cuối, đây là một lựa chọn đáng xem. Chi tiết đầy đủ luôn có trên trang chi tiết phim tương ứng trên PhimGG.`,
  },
  {
    slug: 'phim-sap-ra-mat-thang-toi',
    id: 3,
    title: 'Phim sắp ra mắt: Những tựa đáng chờ tháng tới',
    excerpt:
      'Tổng hợp lịch ra mắt và chất lượng dự kiến của các phim bom tấn sắp đổ bộ trên nền tảng streaming.',
    date: '2025-04-25',
    category: 'news',
    image:
      'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1374&auto=format&fit=crop',
    content: `Danh sách sẽ được cập nhật khi có thông tin chính thức. Bạn có thể theo dõi mục Phim mới và tin tức để không bỏ lỡ.

Gợi ý: xem trailer trên PhimGG trước khi thêm phim vào danh sách yêu thích.`,
  },
  {
    slug: 'trailer-phim-vien-tuong-moi',
    id: 4,
    title: 'Trailer: Phim khoa học viễn tưởng quy mô lớn',
    excerpt:
      'Những điểm nhấn đầu tiên từ trailer chính thức — hình ảnh, âm thanh và dàn diễn viên.',
    date: '2025-04-20',
    category: 'trailer',
    image:
      'https://images.unsplash.com/photo-1596727147705-61a532a659bd?q=80&w=1374&auto=format&fit=crop',
    content: `Trailer cho thấy phong cách thị giác mạnh và nhịp cắt nhanh. Phù hợp khán giả thích phim khoa học viễn tưởng và giải trí tốc độ cao.

Khi phim lên sóng đầy đủ, bạn mở thẳng trang chi tiết để xem với phụ đề Việt và chọn chất lượng HD.`,
  },
  {
    slug: 'phong-van-dao-dien-giai-thuong',
    id: 5,
    title: 'Phỏng vấn đạo diễn đoạt giải — góc nhìn về phim độc lập',
    excerpt:
      'Trò chuyện ngắn về hành trình làm phim, khó khăn sản xuất và lời khuyên cho khán giả trẻ.',
    date: '2025-04-15',
    category: 'news',
    image:
      'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1470&auto=format&fit=crop',
    content: `Đạo diễn chia sẻ về quy trình casting, tài chính và cách giữ nhất quán giọng điệu nghệ thuật xuyên suốt phim.

Độc giả có thể theo dõi thêm các bài tin và review khác trong mục Tin tức trên PhimGG.`,
  },
];

export function getNewsArticleBySlug(slug: string): StaticNewsArticle | undefined {
  return NEWS_ARTICLES.find((a) => a.slug === slug);
}
