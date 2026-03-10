import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, insertCommentSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ThumbsUp, ThumbsDown, MessageCircle, Loader2, Reply, 
  Send, RefreshCw 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Use Zod schema from shared schema
const formSchema = insertCommentSchema.extend({});

// Type for our component props
interface CommentSectionProps {
  movieSlug: string;
  comments: any[];
  totalComments: number;
  isLoading: boolean;
  refetchComments: () => void;
}

export function CommentSection({ 
  movieSlug, 
  comments, 
  totalComments, 
  isLoading, 
  refetchComments 
}: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const commentSectionRef = useRef<HTMLDivElement>(null);

  // State for UI controls
  const [showFullComments, setShowFullComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [liveUpdateInterval, setLiveUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Auto refresh comments every 30 seconds
  useEffect(() => {
    // Set up auto refresh if there are comments
    if (comments.length > 0) {
      const interval = setInterval(() => {
        refetchComments();
      }, 30000); // 30 seconds
      
      setLiveUpdateInterval(interval);
      
      // Clean up on unmount
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [comments.length]);
  
  // Main comment form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id || 1,
      content: "",
      movieSlug: movieSlug,
    },
  });

  // Reply form setup
  const replyForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id || 1,
      content: "",
      movieSlug: movieSlug,
    },
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", `/api/movies/${movieSlug}/comments`, values);
    },
    onSuccess: () => {
      // Reset form but keep the movieSlug
      form.reset({ 
        content: "", 
        userId: user?.id || 1,
        movieSlug: movieSlug,
      });
      
      // Show success toast
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
      
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieSlug}/comments`] });
      refetchComments();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Add reply mutation
  const addReplyMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", `/api/movies/${movieSlug}/comments`, values);
    },
    onSuccess: () => {
      // Reset form
      replyForm.reset({ 
        content: "", 
        userId: user?.id || 1,
        movieSlug: movieSlug,
      });
      
      // Clear the replying state
      setReplyingTo(null);
      
      // Show success toast
      toast({
        title: "Reply added",
        description: "Your reply has been posted successfully",
      });
      
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieSlug}/comments`] });
      refetchComments();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: number) => {
      return apiRequest("POST", `/api/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieSlug}/comments`] });
      refetchComments();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to like comment",
        variant: "destructive"
      });
    }
  });
  
  // Dislike comment mutation
  const dislikeCommentMutation = useMutation({
    mutationFn: (commentId: number) => {
      return apiRequest("POST", `/api/comments/${commentId}/dislike`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieSlug}/comments`] });
      refetchComments();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dislike comment",
        variant: "destructive"
      });
    }
  });
  
  // Handle main comment submission
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You must be logged in to comment",
        variant: "destructive"
      });
      return;
    }
    
    // Submit the comment
    addCommentMutation.mutate(values);
  }

  // Handle reply submission
  function onReplySubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You must be logged in to reply",
        variant: "destructive"
      });
      return;
    }
    
    // Submit the reply (as a regular comment with @mention)
    addReplyMutation.mutate(values);
  }

  // Start replying to a comment
  const handleReply = (commentId: number, username: string) => {
    setReplyingTo(commentId);
    
    // Set the default values for the reply form
    replyForm.reset({
      content: `@${username} `, 
      userId: user?.id || 1,
      movieSlug
    });
    
    // Focus on the reply textarea
    setTimeout(() => {
      const replyTextarea = document.getElementById(`reply-textarea-${commentId}`);
      if (replyTextarea) {
        replyTextarea.focus();
      }
    }, 100);
  };

  // Cancel a reply
  const cancelReply = () => {
    setReplyingTo(null);
    replyForm.reset({
      content: "",
      userId: user?.id || 1,
      movieSlug
    });
  };
  
  // Function to format dates
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Show relative time for recent comments (less than 7 days old)
      const now = new Date();
      const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffInDays < 7) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return format(date, 'MMM d, yyyy h:mm a');
      }
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Organize comments (without actual threading since we don't have parentId)
  const organizeComments = (commentList: any[]) => {
    // Simply add an empty replies array to each comment
    return commentList.map(comment => ({
      ...comment, 
      replies: []
    }));
  };

  // Organize the comments with threading
  const organizedComments = organizeComments(comments);
  
  // Manual refresh button handler
  const handleManualRefresh = () => {
    refetchComments();
    toast({
      title: "Refreshing comments...",
      description: "Getting the latest discussions",
    });
  };
    return (
    <div className="space-y-4" ref={commentSectionRef}>
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <MessageCircle className="h-4 w-4 mr-2 text-primary" />
          Comments ({totalComments})
        </h2>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleManualRefresh}
            className="h-8 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          {totalComments > 5 && !showFullComments && (
            <button 
              onClick={() => setShowFullComments(true)}
              className="text-xs text-primary hover:text-primary/80 hover:underline font-medium"
            >
              Show all {totalComments} comments
            </button>
          )}
        </div>
      </div>
      
      {/* Compact Comment Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative bg-card/30 rounded-lg border border-border/40">
                    <Textarea
                      placeholder={user ? "Share your thoughts..." : "Please log in to comment"}
                      className="min-h-16 max-h-32 bg-transparent border-0 pl-3 pr-12 py-3 text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={!user}
                      {...field}
                    />
                    {user && (
                      <Button 
                        className="absolute bottom-2 right-2 h-7 w-7 p-0"
                        size="sm"
                        type="submit"
                        disabled={!field.value.trim() || addCommentMutation.isPending}
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Compact Comment List */}
      {isLoading ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : organizedComments.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {organizedComments.slice(0, showFullComments ? undefined : 5).map((comment) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-card/20 rounded-lg border border-border/30 p-3 hover:bg-card/30 transition-colors"
              >
                {/* Comment Header */}
                <div className="flex items-start space-x-3">
                  <Avatar className="h-7 w-7 border border-border/50 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(comment.username || "User")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    {/* User info and timestamp */}
                    <div className="flex items-center space-x-2 text-xs mb-1">
                      <span className="font-medium text-foreground">
                        {comment.username || "Anonymous"}
                      </span>
                      {comment.isAdmin && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1 py-0 h-4">
                          Admin
                        </Badge>
                      )}
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    
                    {/* Comment content */}
                    <p className="text-sm text-foreground/90 leading-relaxed mb-2">
                      {comment.content}
                    </p>
                    
                    {/* Action buttons */}
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost"
                        size="sm" 
                        onClick={() => likeCommentMutation.mutate(comment.id)}
                        disabled={likeCommentMutation.isPending}
                        className={`h-7 px-2 text-xs ${comment.hasLiked ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <ThumbsUp className={`h-3 w-3 mr-1 ${comment.hasLiked ? "fill-current" : ""}`} />
                        {comment.likes || 0}
                      </Button>
                      
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => dislikeCommentMutation.mutate(comment.id)}
                        disabled={dislikeCommentMutation.isPending}
                        className={`h-7 px-2 text-xs ${comment.hasDisliked ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <ThumbsDown className={`h-3 w-3 mr-1 ${comment.hasDisliked ? "fill-current" : ""}`} />
                        {comment.dislikes || 0}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleReply(comment.id, comment.username)}
                        disabled={!user}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Compact Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 ml-10 pl-3 border-l-2 border-primary/20">
                    <Form {...replyForm}>
                      <form onSubmit={replyForm.handleSubmit(onReplySubmit)} className="space-y-2">
                        <FormField
                          control={replyForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <div className="relative bg-card/40 rounded-md border border-border/40">
                                <Textarea
                                  id={`reply-textarea-${comment.id}`}
                                  placeholder="Write a reply..."
                                  className="min-h-12 max-h-24 bg-transparent border-0 pl-3 pr-12 py-2 text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                  {...field}
                                />
                                <Button 
                                  className="absolute bottom-1.5 right-1.5 h-6 w-6 p-0"
                                  size="sm"
                                  type="submit"
                                  disabled={!field.value.trim() || addReplyMutation.isPending}
                                >
                                  {addReplyMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={cancelReply}
                          type="button"
                        >
                          Cancel
                        </Button>
                      </form>
                    </Form>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {!showFullComments && totalComments > 5 && (
            <div className="text-center py-2">
              <button 
                onClick={() => setShowFullComments(true)}
                className="text-sm text-primary hover:text-primary/80 hover:underline font-medium"
              >
                Show {totalComments - 5} more comments
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-lg bg-card/10">
          <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
          
          {user ? (
            <Button 
              variant="ghost" 
              size="sm"
              className="mt-3 text-xs text-primary hover:text-primary/80"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                if (textarea) {
                  textarea.focus();
                  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Write the first comment
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground/60 mt-2">Please log in to comment</p>
          )}
        </div>
      )}
      
      {/* Auto-refresh indicator */}
      {liveUpdateInterval && (
        <div className="flex items-center justify-center text-xs text-muted-foreground/60 py-2">
          <RefreshCw className="h-3 w-3 mr-1 animate-pulse opacity-50" />
          <span>Auto-refresh enabled</span>
        </div>
      )}
    </div>
  );
}