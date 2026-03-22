import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Facebook, MessageCircle, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  url?: string;
  shareCount?: number;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title = "PhimGG Movie",
  url = window.location.href,
  shareCount = 34
}) => {
  const shareData = {
    title,
    url,
    text: `Check out this amazing movie on PhimGG!`
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(shareData.text);

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'zalo':
        shareUrl = `https://button-share.zalo.me/share_external?d=${btoa(JSON.stringify({ url }))}`;
        break;
      case 'messenger':
        shareUrl = `https://www.messenger.com/t/?link=${encodedUrl}`;
        break;
      case 'native':
        if (navigator.share) {
          navigator.share(shareData).catch(() => {
            // Silently handle share cancellation
          });
          return;
        }
        break;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    }
  };

  const socialButtons = [
    {
      id: 'facebook',
      name: 'Facebook',
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: Facebook
    },
    {
      id: 'twitter',
      name: 'X',
      color: 'bg-black hover:bg-gray-800',
      icon: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      id: 'telegram',
      name: 'Telegram',
      color: 'bg-blue-500 hover:bg-blue-600',
      icon: Send
    },
    {
      id: 'zalo',
      name: 'Zalo',
      color: 'bg-[#0068FF] hover:bg-[#0052CC]',
      icon: MessageCircle
    },
    {
      id: 'messenger',
      name: 'Messenger',
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: MessageCircle
    },
    {
      id: 'native',
      name: 'Share',
      color: 'bg-green-600 hover:bg-green-700',
      icon: Share2
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-semibold text-white">
            Share
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Share Count */}
          <div className="text-left">
            <span className="text-sm text-zinc-400">
              {shareCount} Shares
            </span>
          </div>

          {/* Social Media Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {socialButtons.map((button) => {
              const IconComponent = button.icon;
              return (
                <Button
                  key={button.id}
                  onClick={() => handleShare(button.id)}
                  className={`
                    flex flex-col items-center justify-center 
                    p-4 h-16 rounded-lg transition-all duration-200
                    ${button.color} text-white
                    hover:scale-105 hover:shadow-lg
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900
                  `}
                  variant="secondary"
                >
                  <IconComponent className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">
                    {button.name}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Copy Link Button */}
          <Button
            onClick={() => {
              navigator.clipboard.writeText(url);
              // You can add a toast notification here
            }}
            variant="outline"
            className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;