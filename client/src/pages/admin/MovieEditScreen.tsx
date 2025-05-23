import { useState, useEffect, ChangeEvent } from "react";
import { useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define Section type and options
type SectionOption = {
  value: string;
  label: string;
};

const sectionOptions: SectionOption[] = [
  { value: 'trending_now', label: 'Trending Now' },
  { value: 'latest_movies', label: 'Latest Movies' },
  { value: 'top_rated', label: 'Top Rated Movies' },
  { value: 'popular_tv', label: 'Popular TV Series' },
];

const movieTypes = [
  { value: 'movie', label: 'Movie' },
  { value: 'series', label: 'TV Series' },
  { value: 'anime', label: 'Anime' },
];

interface MovieData {
  id: string;
  movieId: string;
  name: string;
  section: string | null;
  isRecommended: boolean;
  type?: string;
  status?: string;
  active?: boolean;
  thumb_url?: string;
  poster_url?: string;
  content?: string;
  origin_name?: string;
  year?: number | string;
  episodeCurrent?: string;
  episodeTotal?: string;
}

export default function MovieEditScreen() {
  const queryClient = useQueryClient();
  const [, params] = useRoute("/admin/movies/:movieId");
  const movieId = params?.movieId || "";

  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [section, setSection] = useState<string>("");
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
        
        // Ensure we have all the data fields with proper defaults
        const movieData = {
          ...data,
          type: data.type || 'movie',
          year: data.year || '',
          episodeCurrent: data.episodeCurrent || '',
          episodeTotal: data.episodeTotal || '',
          section: data.section || '',
          isRecommended: data.isRecommended || false
        };
        
        setMovieData(movieData);
        setSection(movieData.section || "");
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

  const handleFieldChange = (field: keyof MovieData, value: any) => {
    if (!movieData) return;
    
    let processedValue = value;
    
    // Special handling for year field
    if (field === 'year' && value !== '') {
      const numValue = parseInt(value);
      processedValue = !isNaN(numValue) ? numValue : value;
    }

    setMovieData(prev => ({
      ...prev!,
      [field]: processedValue
    }));
  };

  const handleInputChange = (field: keyof MovieData) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleFieldChange(field, e.target.value);
  };

  const handleSave = async () => {
    if (!movieData) return;

    const loadingToast = toast.loading("Saving changes...");

    try {
      const response = await fetch(`/api/movies/${movieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...movieData,
          section: section || null,
          isRecommended: movieData.isRecommended || false,
          // Convert year to number if it's a valid number, otherwise keep as string
          year: movieData.year ? (isNaN(Number(movieData.year)) ? movieData.year : Number(movieData.year)) : undefined
        }),
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
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

      toast.success("Changes saved successfully");
      queryClient.invalidateQueries({ queryKey: [`/api/movies/${movieId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Movie: {movieData.name}</h1>
        <Button variant="outline" onClick={() => window.location.href = '/admin?tab=content-management'}>
          Back to List
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={movieData.name}
                  onChange={handleInputChange('name')}
                  placeholder="Movie name"
                />
              </div>

              <div>
                <Label htmlFor="origin_name">Original Name</Label>
                <Input
                  id="origin_name"
                  value={movieData.origin_name || ''}
                  onChange={handleInputChange('origin_name')}
                  placeholder="Original movie name"
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={movieData.type || 'movie'}
                  onValueChange={(value) => handleFieldChange('type', value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {movieTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={movieData.year || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    handleFieldChange('year', val ? parseInt(val) : '');
                  }}
                  placeholder="Release year"
                  min="1900"
                  max="2100"
                />
              </div>

              <div>
                <Label htmlFor="episodeCurrent">Current Episode</Label>
                <Input
                  id="episodeCurrent"
                  value={movieData.episodeCurrent || ''}
                  onChange={handleInputChange('episodeCurrent')}
                  placeholder="e.g. Tập 27"
                />
              </div>

              <div>
                <Label htmlFor="episodeTotal">Total Episodes</Label>
                <Input
                  id="episodeTotal"
                  value={movieData.episodeTotal || ''}
                  onChange={handleInputChange('episodeTotal')}
                  placeholder="e.g. 33"
                />
              </div>

              <div>
                <Label htmlFor="section">Section</Label>
                <Select 
                  value={section} 
                  onValueChange={setSection}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sectionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Description</Label>
                <textarea
                  id="content"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={movieData.content || ''}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('content', e.target.value)}
                  placeholder="Movie description"
                />
              </div>

              <div>
                <Label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={movieData.isRecommended || false}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange('isRecommended', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Recommended</span>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => window.location.href = '/admin?tab=content-management'}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!movieData.name}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}