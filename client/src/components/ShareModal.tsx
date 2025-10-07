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
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
        break;
      case 'messenger':
        shareUrl = `https://www.messenger.com/t/?link=${encodedUrl}`;
        break;
      case 'native':
        if (navigator.share) {
          navigator.share(shareData).catch(console.error);
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
      id: 'reddit',
      name: 'Reddit',
      color: 'bg-orange-600 hover:bg-orange-700',
      icon: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      )
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