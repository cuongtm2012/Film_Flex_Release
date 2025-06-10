import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

const ShareButton: React.FC<{
  title?: string;
  url?: string;
  shareCount?: number;
}> = ({ title, url, shareCount }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsShareModalOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={title}
        url={url}
        shareCount={shareCount}
      />
    </>
  );
};

export default ShareButton;