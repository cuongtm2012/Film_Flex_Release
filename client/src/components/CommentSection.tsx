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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ThumbsUp, ThumbsDown, MessageCircle, Loader2, Reply, 
  Clock, User as UserIcon, Send, RefreshCw 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    <div className="space-y-6" ref={commentSectionRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-primary" />
          Discussions ({totalComments})
        </h2>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManualRefresh}
            className="flex items-center"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          
          {totalComments > 5 && !showFullComments && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFullComments(true)}
            >
              Show All
            </Button>
          )}
        </div>
      </div>
      
      {/* Main Comment Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      placeholder={user ? "Share your thoughts about this movie..." : "Please log in to comment"}
                      className="min-h-24 bg-card pl-4 pr-12 py-3"
                      disabled={!user}
                      {...field}
                    />
                    {user && (
                      <Button 
                        className="absolute bottom-3 right-3 p-2 h-8 w-8"
                        size="icon"
                        variant="ghost"
                        type="submit"
                        disabled={!field.value.trim() || addCommentMutation.isPending}
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
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

      <Separator />
      
      {/* Comment List with Replies */}
      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : organizedComments.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence>
            {organizedComments.slice(0, showFullComments ? undefined : 5).map((comment) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-card/50 border-gray-800 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8 border border-gray-700">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {getInitials(comment.username || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center">
                            {comment.username || "Anonymous"}
                            {comment.isAdmin && (
                              <Badge variant="outline" className="ml-2 bg-primary/20 text-primary border-primary/30 text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1 inline-block" />
                            {formatDate(comment.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-base">{comment.content}</p>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <div className="flex items-center space-x-4">
                      <Button 
                        variant={comment.hasLiked ? "default" : "ghost"}
                        size="sm" 
                        onClick={() => likeCommentMutation.mutate(comment.id)}
                        disabled={likeCommentMutation.isPending}
                        className={comment.hasLiked ? "bg-primary/20 hover:bg-primary/30 text-primary" : ""}
                      >
                        <ThumbsUp className={`h-4 w-4 mr-1 ${comment.hasLiked ? "fill-primary" : ""}`} />
                        <span>{comment.likes || 0}</span>
                      </Button>
                      <Button 
                        variant={comment.hasDisliked ? "default" : "ghost"}
                        size="sm"
                        onClick={() => dislikeCommentMutation.mutate(comment.id)}
                        disabled={dislikeCommentMutation.isPending}
                        className={comment.hasDisliked ? "bg-destructive/20 hover:bg-destructive/30 text-destructive" : ""}
                      >
                        <ThumbsDown className={`h-4 w-4 mr-1 ${comment.hasDisliked ? "fill-destructive" : ""}`} />
                        <span>{comment.dislikes || 0}</span>
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleReply(comment.id, comment.username)}
                      disabled={!user}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      <span>Reply</span>
                    </Button>
                  </CardFooter>
                  
                  {/* We don't have actual reply threading in the database schema,
                      so we're not showing a replies section. Instead, users will use @mentions 
                      which will be displayed in the main comment list. */}
                  
                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-800">
                      <Form {...replyForm}>
                        <form onSubmit={replyForm.handleSubmit(onReplySubmit)} className="w-full">
                          <div className="flex flex-col space-y-2">
                            <FormField
                              control={replyForm.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="relative">
                                    <Textarea
                                      id={`reply-textarea-${comment.id}`}
                                      placeholder="Write a reply..."
                                      className="min-h-16 bg-card/50 pl-4 pr-12 py-2 text-sm resize-none"
                                      {...field}
                                    />
                                    <Button 
                                      className="absolute bottom-2 right-2 p-1.5 h-7 w-7"
                                      size="icon"
                                      variant="ghost"
                                      type="submit"
                                      disabled={!field.value.trim() || addReplyMutation.isPending}
                                    >
                                      {addReplyMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Send className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="self-start"
                              onClick={cancelReply}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {!showFullComments && totalComments > 5 && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowFullComments(true)}
                className="w-full sm:w-auto"
              >
                Show All Comments ({totalComments})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
          <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground font-medium">No comments yet. Be the first to share your thoughts!</p>
          
          {user ? (
            <div className="max-w-md mx-auto mt-4">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 mx-auto border-dashed border-primary/40 hover:border-primary"
                onClick={() => {
                  // Focus on the comment textarea
                  const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                  if (textarea) {
                    textarea.focus();
                    // Scroll to textarea
                    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Write your first comment
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">Please log in to comment</p>
          )}
        </div>
      )}
      
      {/* Auto-refresh indicator */}
      {liveUpdateInterval && (
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 mr-1.5 animate-spin animate-pulse opacity-50" />
          <span>Comments refresh automatically</span>
        </div>
      )}
    </div>
  );
}