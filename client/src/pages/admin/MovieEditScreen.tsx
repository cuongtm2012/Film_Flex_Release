import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Define Section type and options
const sectionOptions = [
  { value: 'trending_now', label: 'Trending Now' },
  { value: 'latest_movies', label: 'Latest Movies' },
  { value: 'top_rated', label: 'Top Rated Movies' },
  { value: 'popular_tv', label: 'Popular TV Series' },
type Section = typeof sectionOptions[number]['value'];

interface MovieData {
  id: string;
  movieId: string;
  name: string;
  section: Section | null;
  isRecommended: boolean;
  type?: string;
  status?: string;
  active?: boolean;
  thumb_url?: string;
  poster_url?: string;
  content?: string;
  origin_name?: string;
}

export default function MovieEditScreen() {
  const queryClient = useQueryClient();
  const [, params] = useRoute("/admin/movies/:movieId");
  const movieId = params?.movieId || "";

  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [section, setSection] = useState<Section | "">("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch movie data
  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const response = await fetch(`/api/movies/${movieId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch movie data");
        }
        const data = await response.json();
        setMovieData(data);
        setSection(data.section || "");
      } catch (error) {
        console.error("Error fetching movie data:", error);
        toast.error("Failed to load movie data");
      } finally {
        setIsLoading(false);
      }
    };

    if (movieId) {
      fetchMovieData();
    }
  }, [movieId]);
  // Save changes
  const handleSave = async () => {
    if (!movieData) return;

    const loadingToast = toast.loading("Saving changes...");

    try {
      const response = await fetch(`/api/movies/${movieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },        body: JSON.stringify({
          ...movieData,
          section: section || null,
          isRecommended: movieData.isRecommended || false
        }),
      });

      // Always dismiss the loading toast
      toast.dismiss(loadingToast);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Failed to save changes";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use default error message if we can't parse the error response
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.status || !data.movie) {
        throw new Error("Server returned success but with invalid data");
      }

      // Show success message
      toast.success("Changes saved successfully");

      // Invalidate all related queries to force a refresh
      queryClient.invalidateQueries([`/api/movies/${movieId}`]);
      queryClient.invalidateQueries(["/api/movies"]);

      // Navigate back to content list after successful save
      window.location.href = '/admin?tab=content-management';
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!movieData) {
    return <div>Movie not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Movie: {movieData.name}</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Section</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full p-2 border rounded-md"
              value={section}
              onChange={e => setSection(e.target.value as Section)}
            >
              <option value="">Select a section...</option>
              {sectionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Button onClick={handleSave} className="w-full md:w-auto">
          Save Changes
        </Button>
      </div>
    </div>
  );
}