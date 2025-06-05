import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MovieReactionsProps {
  movieSlug: string;
  userId?: number;
}

interface ReactionCounts {
  like: number;
  dislike: number;
  heart: number;
}

interface ReactionResponse {
  status: boolean;
  reactions: ReactionCounts;
  movieSlug: string;
}

interface UserReactionResponse {
  userReaction: string | null;
  movieSlug: string;
  userId: number;
}

const MovieReactions: React.FC<MovieReactionsProps> = ({ movieSlug, userId }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch reaction counts for the movie
  const { data: reactionData, isLoading: reactionsLoading } = useQuery<ReactionResponse>({
    queryKey: [`/api/movies/${movieSlug}/reactions`],
    enabled: !!movieSlug
  });

  // Fetch user's current reaction (if logged in)
  const { data: userReactionData } = useQuery<UserReactionResponse>({
    queryKey: [`/api/users/${userId}/reactions/${movieSlug}`],
    enabled: !!userId && !!movieSlug
  });

  const reactions: ReactionCounts = reactionData?.reactions || { like: 0, dislike: 0, heart: 0 };
  const userReaction = userReactionData?.userReaction || null;

  // Mutation for adding/updating reactions
  const addReactionMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const response = await fetch(`/api/movies/${movieSlug}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reactionType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add reaction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieSlug}/reactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/reactions/${movieSlug}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to add reaction',
        variant: "destructive",
      });
    }
  });

  // Mutation for removing reactions
  const removeReactionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/movies/${movieSlug}/reactions`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove reaction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieSlug}/reactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/reactions/${movieSlug}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to remove reaction',
        variant: "destructive",
      });
    }
  });

  const handleReaction = (reactionType: string) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: 'Please log in to react to movies',
        variant: "destructive",
      });
      return;
    }

    // If clicking the same reaction, remove it
    if (userReaction === reactionType) {
      removeReactionMutation.mutate();
    } else {
      // Add or change reaction
      addReactionMutation.mutate(reactionType);
    }
  };

  const isLoading = addReactionMutation.isPending || removeReactionMutation.isPending;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant={userReaction === 'like' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleReaction('like')}
          disabled={isLoading || reactionsLoading}
          className={`flex items-center gap-2 ${
            userReaction === 'like' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'hover:bg-green-50 hover:text-green-600'
          }`}
        >
          {isLoading && userReaction === 'like' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsUp className="h-4 w-4" />
          )}
          <span>{reactions.like}</span>
        </Button>

        <Button
          variant={userReaction === 'dislike' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleReaction('dislike')}
          disabled={isLoading || reactionsLoading}
          className={`flex items-center gap-2 ${
            userReaction === 'dislike' 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'hover:bg-red-50 hover:text-red-600'
          }`}
        >
          {isLoading && userReaction === 'dislike' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsDown className="h-4 w-4" />
          )}
          <span>{reactions.dislike}</span>
        </Button>

        <Button
          variant={userReaction === 'heart' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleReaction('heart')}
          disabled={isLoading || reactionsLoading}
          className={`flex items-center gap-2 ${
            userReaction === 'heart' 
              ? 'bg-pink-600 hover:bg-pink-700 text-white' 
              : 'hover:bg-pink-50 hover:text-pink-600'
          }`}
        >
          {isLoading && userReaction === 'heart' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${userReaction === 'heart' ? 'fill-current' : ''}`} />
          )}
          <span>{reactions.heart}</span>
        </Button>
      </div>

      {reactionsLoading && (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      )}
    </div>
  );
};

export default MovieReactions;