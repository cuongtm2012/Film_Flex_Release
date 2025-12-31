import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GENRES, type Genre } from '@/lib/genres';

interface GenreSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (genres: string[]) => Promise<void>;
}

export default function GenreSelectionModal({ isOpen, onClose, onSave }: GenreSelectionModalProps) {
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const MIN_GENRES = 3;

    const toggleGenre = (slug: string) => {
        setSelectedGenres(prev =>
            prev.includes(slug)
                ? prev.filter(g => g !== slug)
                : [...prev, slug]
        );
    };

    const handleSave = async () => {
        if (selectedGenres.length < MIN_GENRES) {
            toast({
                title: 'Chọn ít nhất 3 thể loại',
                description: `Bạn cần chọn ít nhất ${MIN_GENRES} thể loại yêu thích`,
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            await onSave(selectedGenres);
            toast({
                title: '✅ Đã lưu sở thích',
                description: 'Chúng tôi sẽ gợi ý phim phù hợp với bạn!',
            });
            onClose();
        } catch (error) {
            toast({
                title: 'Lỗi',
                description: 'Không thể lưu sở thích. Vui lòng thử lại.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        try {
            await fetch('/api/user/preferences/skip', {
                method: 'POST',
                credentials: 'include',
            });
            onClose();
        } catch (error) {
            console.error('Error skipping onboarding:', error);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-primary/20 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="relative p-6 border-b border-gray-800">
                    <button
                        onClick={handleSkip}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            🎬 Chọn Thể Loại Yêu Thích
                        </h2>
                        <p className="text-gray-300">
                            Chọn ít nhất {MIN_GENRES} thể loại để nhận gợi ý phim phù hợp
                        </p>
                        <p className="text-sm text-primary mt-1">
                            Đã chọn: {selectedGenres.length}/{MIN_GENRES}
                        </p>
                    </div>
                </div>

                {/* Genre Grid */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {GENRES.map((genre: Genre) => {
                            const isSelected = selectedGenres.includes(genre.slug);

                            return (
                                <button
                                    key={genre.slug}
                                    onClick={() => toggleGenre(genre.slug)}
                                    className={`
                    relative p-6 rounded-lg border-2 transition-all duration-200
                    ${isSelected
                                            ? 'border-primary bg-primary/10 scale-105'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                                        }
                  `}
                                >
                                    {/* Selection indicator */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div className="text-5xl mb-3">{genre.icon}</div>

                                    {/* Name */}
                                    <div className="text-white font-semibold text-sm mb-1">
                                        {genre.name}
                                    </div>

                                    {/* Description */}
                                    <div className="text-xs text-gray-400">
                                        {genre.description}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 flex gap-3">
                    <Button
                        onClick={handleSkip}
                        variant="outline"
                        className="flex-1 border-gray-700 hover:bg-gray-800"
                        disabled={isLoading}
                    >
                        Bỏ qua
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={selectedGenres.length < MIN_GENRES || isLoading}
                        className="flex-1 bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-semibold shadow-lg shadow-primary/25"
                    >
                        {isLoading ? 'Đang lưu...' : `Lưu sở thích (${selectedGenres.length})`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
