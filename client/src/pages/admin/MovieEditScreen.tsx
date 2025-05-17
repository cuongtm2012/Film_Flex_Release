import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { toast } from "react-hot-toast";
import { MovieDetailResponse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Define Section type based on the database schema
// and display names for the dropdown
const sectionOptions = [
  { value: 'trending_now', label: 'Trending Now' },
  { value: 'latest_movies', label: 'Latest Movies' },
  { value: 'top_rated', label: 'Top Rated Movies' },
  { value: 'popular_tv', label: 'Popular TV Series' },
] as const;
type Section = typeof sectionOptions[number]['value'];

interface MovieData {
  id: string;
  movieId: string;
  name: string;
  section: Section | null;
  // marks: MovieMark[]; // Remove marks for this feature request
}

export default function MovieEditScreen() {
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
    if (!section) {
      toast.error("Please select a section.");
      return;
    }
    try {
      const response = await fetch(`/api/movies/${movieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...movieData,
          section,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
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