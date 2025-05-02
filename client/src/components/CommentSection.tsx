import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Reply } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Comment } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface CommentSectionProps {
  movieSlug: string;
  comments: Comment[];
  isLoading?: boolean;
  onRefreshComments: () => void;
}

export default function CommentSection({ 
  movieSlug, 
  comments, 
  isLoading = false,
  onRefreshComments 
}: CommentSectionProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Placeholder user ID (in a real app, this would come from auth)
  const currentUserId = 1;
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", `/api/movies/${movieSlug}/comments`, {
        userId: currentUserId,
        content: commentText.trim()
      });
      
      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
      
      setCommentText("");
      onRefreshComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLikeComment = async (commentId: number) => {
    try {
      await apiRequest("POST", `/api/comments/${commentId}/like`, {});
      onRefreshComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like comment",
        variant: "destructive"
      });
    }
  };
  
  const handleDislikeComment = async (commentId: number) => {
    try {
      await apiRequest("POST", `/api/comments/${commentId}/dislike`, {});
      onRefreshComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to dislike comment",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return (
      <div>
        <h4 className="text-lg font-bold mb-3">Comments</h4>
        <div className="mb-4">
          <div className="h-24 w-full bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-10 w-32 bg-gray-700 rounded animate-pulse ml-auto"></div>
        </div>
        
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-muted p-4 rounded animate-pulse">
              <div className="flex items-start gap-3 mb-2">
                <div className="rounded-full w-10 h-10 bg-gray-700"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-24 bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-12 w-full bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-lg font-bold mb-3">Comments</h4>
      <form onSubmit={handleSubmitComment} className="mb-4">
        <Textarea
          placeholder="Write your comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="w-full bg-muted border border-muted-foreground/30 rounded p-3 text-white focus:outline-none focus:border-primary resize-none"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>
      
      {comments.length === 0 ? (
        <div className="text-center py-8 bg-muted rounded">
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-muted p-4 rounded">
              <div className="flex items-start gap-3 mb-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} />
                  <AvatarFallback>
                    {comment.userId.toString().substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium">User {comment.userId}</h5>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-12 text-sm text-muted-foreground">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1 hover:text-white transition"
                  onClick={() => handleLikeComment(comment.id)}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{comment.likes}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1 hover:text-white transition"
                  onClick={() => handleDislikeComment(comment.id)}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>{comment.dislikes}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:text-white transition"
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-center mt-6">
            <Button variant="outline" className="bg-muted hover:bg-muted/70 text-white">
              Load More Comments
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
