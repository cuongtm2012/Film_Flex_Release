import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Share2, 
  Copy, 
  Facebook, 
  MessageCircle,
  Send,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function ShareDialog({ isOpen, onClose, title, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    console.log("Copy to clipboard clicked"); // Debug log
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      console.log("Successfully copied to clipboard"); // Debug log
      toast({
        title: "Link copied!",
        description: "Movie link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err); // Debug log
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareOptions = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`Check out "${title}" on FilmFlex!`)}`
    },
    {
      name: "Reddit",
      icon: MessageCircle,
      color: "bg-orange-600 hover:bg-orange-700",
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`Check out "${title}" on FilmFlex!`)}`
    },
    {
      name: "Telegram",
      icon: Send,
      color: "bg-blue-500 hover:bg-blue-600",
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out "${title}" on FilmFlex!`)}`
    },
    {
      name: "X",
      icon: MessageCircle,
      color: "bg-black hover:bg-gray-800",
      url: `https://x.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" on FilmFlex!`)}&url=${encodeURIComponent(url)}`
    }
  ];

  const handleShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{title}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Copy Link Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input 
                value={url} 
                readOnly 
                className="flex-1"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button 
                onClick={copyToClipboard} 
                size="sm" 
                variant="outline"
                className="px-3"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Media Sharing */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share on Social Media</label>
            <div className="grid grid-cols-2 gap-2">
              {shareOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Button
                    key={option.name}
                    onClick={() => handleShare(option.url)}
                    className={`${option.color} text-white justify-start gap-2`}
                    size="sm"
                  >
                    <IconComponent className="h-4 w-4" />
                    {option.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Native Share API for mobile */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <div className="space-y-2">
              <Button
                onClick={() => {
                  navigator.share({
                    title: `${title} - FilmFlex`,
                    text: `Check out "${title}" on FilmFlex!`,
                    url: url,
                  }).catch(console.error);
                }}
                className="w-full"
                variant="outline"
              >
                <Share2 className="h-4 w-4 mr-2" />
                More sharing options
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}