import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, insertCommentSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, MessageCircle, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [showFullComments, setShowFullComments] = useState(false);
  
  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id || 1, // Default to 1 if not logged in for demo
      content: ""
    },
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", `/api/movies/${movieSlug}/comments`, values);
    },
    onSuccess: () => {
      // Reset form
      form.reset({ content: "" });
      
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
  
  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: number) => {
      return apiRequest("POST", `/api/comments/${commentId}/like`);
    },
    onSuccess: () => {
      // Invalidate comments query to refresh
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
      // Invalidate comments query to refresh
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
  
  // Handle form submission
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
  
  // Function to format dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || "U";
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-primary" />
          Comments ({totalComments})
        </h2>
        
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
      
      {/* Comment Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Share your thoughts about this movie..."
                    className="min-h-24 bg-card"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={addCommentMutation.isPending}
              className="w-full sm:w-auto"
            >
              {addCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Comment"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Separator />
      
      {/* Comment List */}
      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.slice(0, showFullComments ? undefined : 5).map((comment) => (
            <Card key={comment.id} className="bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>{getInitials(comment.username || "User")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{comment.username || "Anonymous User"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p>{comment.content}</p>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => likeCommentMutation.mutate(comment.id)}
                    disabled={likeCommentMutation.isPending}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span>{comment.likes || 0}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => dislikeCommentMutation.mutate(comment.id)}
                    disabled={dislikeCommentMutation.isPending}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    <span>{comment.dislikes || 0}</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          
          {!showFullComments && totalComments > 5 && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowFullComments(true)}
              >
                Show All Comments ({totalComments})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
}