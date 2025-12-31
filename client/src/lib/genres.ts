/**
 * Genre data and icons for movie categorization
 * Used in genre selection modal and throughout the app
 */

export interface Genre {
    slug: string;
    name: string;
    icon: string;
    description: string;
}

export const GENRES: Genre[] = [
    {
        slug: 'hanh-dong',
        name: 'Hành Động',
        icon: '💥',
        description: 'Phim hành động kịch tính'
    },
    {
        slug: 'hai-huoc',
        name: 'Hài Hước',
        icon: '😂',
        description: 'Phim hài vui nhộn'
    },
    {
        slug: 'kinh-di',
        name: 'Kinh Dị',
        icon: '💀',
        description: 'Phim kinh dị rùng rợn'
    },
    {
        slug: 'tinh-cam',
        name: 'Tình Cảm',
        icon: '💕',
        description: 'Phim tình cảm lãng mạn'
    },
    {
        slug: 'phieu-luu',
        name: 'Phiêu Lưu',
        icon: '🗺️',
        description: 'Phim phiêu lưu mạo hiểm'
    },
    {
        slug: 'khoa-hoc-vien-tuong',
        name: 'Khoa Học Viễn Tưởng',
        icon: '🚀',
        description: 'Phim khoa học viễn tưởng'
    },
    {
        slug: 'hoat-hinh',
        name: 'Hoạt Hình',
        icon: '🎨',
        description: 'Phim hoạt hình animation'
    },
    {
        slug: 'chinh-kich',
        name: 'Chính Kịch',
        icon: '🎭',
        description: 'Phim chính kịch nghiêm túc'
    },
    {
        slug: 'bi-an',
        name: 'Bí Ẩn',
        icon: '🔍',
        description: 'Phim bí ẩn ly kỳ'
    },
    {
        slug: 'gia-dinh',
        name: 'Gia Đình',
        icon: '👨‍👩‍👧‍👦',
        description: 'Phim gia đình ấm áp'
    },
    {
        slug: 'tam-ly',
        name: 'Tâm Lý',
        icon: '🧠',
        description: 'Phim tâm lý sâu sắc'
    },
    {
        slug: 'hinh-su',
        name: 'Hình Sự',
        icon: '🔫',
        description: 'Phim hình sự gay cấn'
    },
    {
        slug: 'chien-tranh',
        name: 'Chiến Tranh',
        icon: '⚔️',
        description: 'Phim chiến tranh hùng tráng'
    },
    {
        slug: 'lich-su',
        name: 'Lịch Sử',
        icon: '📜',
        description: 'Phim lịch sử cổ trang'
    },
    {
        slug: 'the-thao',
        name: 'Thể Thao',
        icon: '⚽',
        description: 'Phim thể thao sôi động'
    },
    {
        slug: 'am-nhac',
        name: 'Âm Nhạc',
        icon: '🎵',
        description: 'Phim âm nhạc ca vũ'
    }
];

/**
 * Get genre by slug
 */
export function getGenreBySlug(slug: string): Genre | undefined {
    return GENRES.find(g => g.slug === slug);
}

/**
 * Get genres by slugs
 */
export function getGenresBySlugs(slugs: string[]): Genre[] {
    return slugs.map(slug => getGenreBySlug(slug)).filter(Boolean) as Genre[];
}

/**
 * Get genre icon
 */
export function getGenreIcon(slug: string): string {
    return getGenreBySlug(slug)?.icon || '🎬';
}
