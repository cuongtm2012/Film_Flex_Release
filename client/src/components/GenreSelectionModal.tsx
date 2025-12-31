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
                <div className="relative p-4 sm:p-6 border-b border-gray-800">
                    <button
                        onClick={handleSkip}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 text-muted-foreground hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    <div className="text-center pr-8">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                            Chọn Thể Loại Yêu Thích
                        </h2>
                        <p className="text-sm sm:text-base text-gray-300">
                            Chọn ít nhất {MIN_GENRES} thể loại để nhận gợi ý phim phù hợp
                        </p>
                        <p className="text-xs sm:text-sm text-primary mt-1">
                            Đã chọn: {selectedGenres.length}/{MIN_GENRES}
                        </p>
                    </div>
                </div>

                {/* Genre Grid */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {GENRES.map((genre: Genre) => {
                            const isSelected = selectedGenres.includes(genre.slug);

                            return (
                                <button
                                    key={genre.slug}
                                    onClick={() => toggleGenre(genre.slug)}
                                    className={`
                    relative px-3 py-2 sm:px-4 sm:py-3 rounded-lg border-2 transition-all duration-200
                    ${isSelected
                                            ? 'border-primary bg-primary/10 scale-105'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                                        }
                  `}
                                >
                                    {/* Selection indicator */}
                                    {isSelected && (
                                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full flex items-center justify-center">
                                            <span className="text-white text-[10px] sm:text-xs">✓</span>
                                        </div>
                                    )}

                                    {/* Name */}
                                    <div className="text-white font-semibold text-xs sm:text-sm text-center">
                                        {genre.name}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-800 flex gap-2 sm:gap-3">
                    <Button
                        onClick={handleSkip}
                        variant="outline"
                        className="flex-1 border-gray-700 hover:bg-gray-800 text-sm sm:text-base"
                        disabled={isLoading}
                    >
                        Bỏ qua
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={selectedGenres.length < MIN_GENRES || isLoading}
                        className="flex-1 bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-semibold shadow-lg shadow-primary/25 text-sm sm:text-base"
                    >
                        {isLoading ? 'Đang lưu...' : `Lưu (${selectedGenres.length})`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
