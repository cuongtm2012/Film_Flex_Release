import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Film, Star, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onClose: () => void;
}

export default function SplashScreen({ onClose }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    setIsAnimating(true);
    // Store in localStorage to prevent showing again in this session
    localStorage.setItem('filmflex-splash-seen', 'true');
    
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-1000 ${
      isAnimating ? 'opacity-0 scale-95' : isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
    }`}>
      {/* Background with cinematic gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
        </div>
        
        {/* Film reel pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-y-1"></div>
          <div className="absolute bottom-0 right-0 w-full h-8 bg-gradient-to-r from-transparent via-white to-transparent transform skew-y-1"></div>
        </div>
      </div>

      {/* Main content */}
      <div className={`relative text-center px-8 max-w-2xl transition-all duration-1000 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}>
        {/* Logo/Brand section */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Film className="h-16 w-16 text-red-500 animate-pulse" />
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-bounce" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 bg-clip-text text-transparent animate-pulse">
            FilmFlex
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <Star className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Welcome text */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            Chào mừng đến với thế giới điện ảnh
          </h2>
          <p className="text-lg text-gray-300 mb-2">
            Khám phá hàng ngàn bộ phim và series chất lượng cao
          </p>
          <p className="text-sm text-gray-400">
            Trải nghiệm xem phim tuyệt vời với chất lượng HD & 4K
          </p>
        </div>

        {/* CTA Button */}
        <div className="space-y-4">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-12 rounded-full text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-red-500/25 group"
          >
            <Play className="mr-3 h-6 w-6 group-hover:animate-pulse" />
            Xem Ngay
          </Button>
          
          <p className="text-xs text-gray-500 mt-4">
            Nhấn để bắt đầu khám phá ngay bây giờ
          </p>
        </div>

        {/* Features preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Film className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-semibold mb-1">Phim Mới Nhất</h3>
            <p className="text-gray-400 text-sm">Cập nhật liên tục các bộ phim hot nhất</p>
          </div>
          
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
              <Play className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-semibold mb-1">Chất Lượng Cao</h3>
            <p className="text-gray-400 text-sm">Trải nghiệm xem phim với chất lượng tốt nhất</p>
          </div>
          
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-semibold mb-1">Đánh Giá Cao</h3>
            <p className="text-gray-400 text-sm">Những bộ phim được yêu thích nhất</p>
          </div>
        </div>
      </div>
    </div>
  );
}