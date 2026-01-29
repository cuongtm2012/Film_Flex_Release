import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { Movie } from '@shared/schema';

interface AIRecommendationsResponse {
    status: boolean;
    recommendations: Movie[];
    reasons: string[];
    aiPowered: boolean;
    processingTime: number;
}

export default function AIRecommendationsSection() {
    const { data, isLoading, error } = useQuery<AIRecommendationsResponse>({
        queryKey: ['ai-recommendations'],
        queryFn: async () => {
            const res = await fetch('/api/ai/recommendations?limit=10');
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            return res.json();
        },
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: 1
    });

    if (error || !data?.recommendations?.length) {
        return null; // Hide section if error or no recommendations
    }

    return (
        <section className="py-8 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 pointer-events-none" />

            <div className="container mx-auto px-4 relative">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Sparkles className="h-7 w-7 text-purple-500 animate-pulse" />
                            <div className="absolute inset-0 blur-xl bg-purple-500/30 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                                For You
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {data.aiPowered ? 'AI-powered recommendations' : 'Personalized picks'}
                            </p>
                        </div>
                    </div>

                    {/* AI Badge */}
                    {data.aiPowered && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-xs font-medium text-purple-400">Powered by AI</span>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-3 animate-pulse">
                                <div className="aspect-[2/3] bg-muted rounded-lg" />
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Movies Grid */}
                {!isLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {data.recommendations.slice(0, 10).map((movie, index) => (
                            <Link key={movie.slug} href={`/movie/${movie.slug}`}>
                                <div className="group cursor-pointer space-y-3">
                                    {/* Movie Poster */}
                                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                                        <img
                                            src={movie.thumb_url || movie.thumbUrl || movie.poster_url || movie.posterUrl || '/placeholder-movie.jpg'}
                                            alt={movie.name}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                            loading="lazy"
                                        />

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        {/* AI Reason Badge */}
                                        {data.reasons[index] && (
                                            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                <div className="bg-purple-500/90 backdrop-blur-sm rounded-md px-2 py-1">
                                                    <p className="text-xs text-white line-clamp-2">
                                                        {data.reasons[index]}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Quality Badge */}
                                        {movie.quality && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-semibold text-white">
                                                {movie.quality}
                                            </div>
                                        )}
                                    </div>

                                    {/* Movie Info */}
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
                                            {movie.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {movie.year || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* View More */}
                {!isLoading && data.recommendations.length > 0 && (
                    <div className="mt-6 text-center">
                        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/20 transition-all duration-300 group">
                            <span className="text-sm font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Refresh Recommendations
                            </span>
                            <ChevronRight className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
