import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';
import { Search, X, Save, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FeaturedSection {
  id: number;
  sectionName: string;
  filmIds: number[];
  displayOrder: number[];
  updatedAt: string;
}

interface Movie {
  id: number;
  name: string;
  posterUrl: string;
  slug: string;
}

export default function FeaturedSectionsScreen() {
  const [sections, setSections] = useState<FeaturedSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all featured sections
  useEffect(() => {
    fetchSections();
  }, []);

  // Fetch movies for selected section
  useEffect(() => {
    if (selectedSection) {
      fetchSectionMovies(selectedSection);
    }
  }, [selectedSection]);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/admin/featured-sections');
      if (!response.ok) throw new Error('Failed to fetch sections');
      const data = await response.json();
      setSections(data);
    } catch (error) {
      toast.error('Failed to load featured sections');
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSectionMovies = async (sectionName: string) => {
    try {
      const response = await fetch(`/api/admin/featured-sections/${sectionName}/movies`);
      if (!response.ok) throw new Error('Failed to fetch movies');
      const data = await response.json();
      setMovies(data);
    } catch (error) {
      toast.error('Failed to load section movies');
      console.error('Error fetching section movies:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (error) {
      toast.error('Search failed');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMovie = (movie: Movie) => {
    if (movies.some(m => m.id === movie.id)) {
      toast.error('Movie already in section');
      return;
    }

    setMovies(prev => [...prev, movie]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveMovie = (movieId: number) => {
    setMovies(prev => prev.filter(movie => movie.id !== movieId));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(movies);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMovies(items);
  };

  const handleSave = async () => {
    if (!selectedSection) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/featured-sections/${selectedSection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filmIds: movies.map(m => m.id),
          displayOrder: movies.map((_, index) => index)
        })
      });

      if (!response.ok) throw new Error('Failed to save changes');
      
      toast.success('Changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Featured Sections Management</h1>
        
        {/* Section Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Section</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full max-w-xs p-2 border rounded-md"
          >
            <option value="">Select a section...</option>
            {sections.map(section => (
              <option key={section.id} value={section.sectionName}>
                {section.sectionName}
              </option>
            ))}
          </select>
        </div>

        {selectedSection && (
          <>
            {/* Movie Search */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search movies..."
                  className="w-full p-2 pl-10 border rounded-md"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                  {searchResults.map(movie => (
                    <div
                      key={movie.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleAddMovie(movie)}
                    >
                      <img
                        src={movie.posterUrl}
                        alt={movie.name}
                        className="w-10 h-15 object-cover mr-3"
                      />
                      <span>{movie.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Movie List */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Section Movies</h2>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="movies">
                  {(provided: DroppableProvided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {movies.map((movie, index) => (
                        <Draggable
                          key={movie.id}
                          draggableId={movie.id.toString()}
                          index={index}
                        >
                          {(provided: DraggableProvided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="flex items-center p-3 bg-white border rounded-md shadow-sm"
                            >
                              <span className="text-gray-500 mr-3">{index + 1}</span>
                              <img
                                src={movie.posterUrl}
                                alt={movie.name}
                                className="w-12 h-18 object-cover mr-3"
                              />
                              <span className="flex-grow">{movie.name}</span>
                              <button
                                onClick={() => handleRemoveMovie(movie.id)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                              >
                                <X className="h-5 w-5 text-gray-500" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </div>
  );
} 