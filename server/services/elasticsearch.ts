import { Client } from '@elastic/elasticsearch';
import { Movie, Episode } from '@shared/schema';

export interface ElasticsearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export interface SearchResult {
  data: Movie[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  aggregations?: any;
  error?: string;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  filters?: {
    section?: string;
    type?: string;
    isRecommended?: boolean;
    year?: number[];
    categories?: string[];
    countries?: string[];
  };
  sortBy?: string;
  fuzzy?: boolean;
}

export class ElasticsearchService {
  private client: Client;
  private movieIndex = 'movies';
  private episodeIndex = 'episodes';

  constructor(config: ElasticsearchConfig) {
    this.client = new Client(config);
  }

  async initialize(): Promise<void> {
    try {
      // Check if Elasticsearch is available
      await this.client.ping();
      console.log('Elasticsearch connection established');

      // Create indexes if they don't exist
      await this.createIndexes();
    } catch (error) {
      console.error('Failed to initialize Elasticsearch:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      // Create movies index
      const movieIndexExists = await this.client.indices.exists({
        index: this.movieIndex
      });

      if (!movieIndexExists) {
        await this.client.indices.create({
          index: this.movieIndex,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  movie_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'stop']
                  },
                  autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'edge_ngram_tokenizer',
                    filter: ['lowercase', 'asciifolding']
                  }
                },
                tokenizer: {
                  edge_ngram_tokenizer: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 20,
                    token_chars: ['letter', 'digit']
                  }
                }
              }
            },
            mappings: {
              properties: {
                movieId: { type: 'keyword' },
                slug: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'movie_analyzer',
                  fields: {
                    autocomplete: {
                      type: 'text',
                      analyzer: 'autocomplete_analyzer',
                      search_analyzer: 'movie_analyzer'
                    },
                    keyword: { type: 'keyword' }
                  }
                },
                originName: {
                  type: 'text',
                  analyzer: 'movie_analyzer',
                  fields: {
                    autocomplete: {
                      type: 'text',
                      analyzer: 'autocomplete_analyzer',
                      search_analyzer: 'movie_analyzer'
                    }
                  }
                },
                description: {
                  type: 'text',
                  analyzer: 'movie_analyzer'
                },
                type: { type: 'keyword' },
                status: { type: 'keyword' },
                section: { type: 'keyword' },
                year: { type: 'integer' },
                quality: { type: 'keyword' },
                lang: { type: 'keyword' },
                view: { type: 'integer' },
                isRecommended: { type: 'boolean' },
                actors: {
                  type: 'text',
                  analyzer: 'movie_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                directors: {
                  type: 'text',
                  analyzer: 'movie_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                categories: {
                  type: 'nested',
                  properties: {
                    id: { type: 'keyword' },
                    name: {
                      type: 'text',
                      analyzer: 'movie_analyzer',
                      fields: {
                        keyword: { type: 'keyword' }
                      }
                    },
                    slug: { type: 'keyword' }
                  }
                },
                countries: {
                  type: 'nested',
                  properties: {
                    id: { type: 'keyword' },
                    name: {
                      type: 'text',
                      analyzer: 'movie_analyzer',
                      fields: {
                        keyword: { type: 'keyword' }
                      }
                    },
                    slug: { type: 'keyword' }
                  }
                },
                thumbUrl: { type: 'keyword', index: false },
                posterUrl: { type: 'keyword', index: false },
                trailerUrl: { type: 'keyword', index: false },
                createdAt: { type: 'date' },
                modifiedAt: { type: 'date' },
                episodeCount: { type: 'integer' }
              }
            }
          }
        });
        console.log('Movies index created successfully');
      }

      // Create episodes index
      const episodeIndexExists = await this.client.indices.exists({
        index: this.episodeIndex
      });

      if (!episodeIndexExists) {
        await this.client.indices.create({
          index: this.episodeIndex,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  movie_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'stop']
                  },
                  autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'edge_ngram_tokenizer',
                    filter: ['lowercase', 'asciifolding']
                  }
                },
                tokenizer: {
                  edge_ngram_tokenizer: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 20,
                    token_chars: ['letter', 'digit']
                  }
                }
              }
            },
            mappings: {
              properties: {
                slug: { type: 'keyword' },
                movieSlug: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'movie_analyzer'
                },
                serverName: { type: 'keyword' },
                filename: { type: 'keyword' },
                linkEmbed: { type: 'keyword', index: false },
                linkM3u8: { type: 'keyword', index: false },
                createdAt: { type: 'date' }
              }
            }
          }
        });
        console.log('Episodes index created successfully');
      }
    } catch (error) {
      console.error('Failed to create indexes:', error);
      throw error;
    }
  }

  async indexMovie(movie: Movie): Promise<void> {
    try {
      await this.client.index({
        index: this.movieIndex,
        id: movie.slug,
        body: {
          ...movie,
          episodeCount: 0 // Will be updated when episodes are indexed
        }
      });
    } catch (error) {
      console.error('Failed to index movie:', error);
      throw error;
    }
  }

  async indexMovies(movies: Movie[]): Promise<void> {
    if (movies.length === 0) return;

    const body = movies.flatMap(movie => [
      { index: { _index: this.movieIndex, _id: movie.slug } },
      {
        ...movie,
        episodeCount: 0
      }
    ]);

    try {
      const response = await this.client.bulk({ body });
      
      if (response.errors) {
        console.error('Bulk indexing errors:', response.items.filter(item => item.index?.error));
      } else {
        console.log(`Successfully indexed ${movies.length} movies`);
      }
    } catch (error) {
      console.error('Failed to bulk index movies:', error);
      throw error;
    }
  }

  async indexEpisode(episode: Episode): Promise<void> {
    try {
      await this.client.index({
        index: this.episodeIndex,
        id: episode.slug,
        body: episode
      });

      // Update movie episode count
      await this.updateMovieEpisodeCount(episode.movieSlug);
    } catch (error) {
      console.error('Failed to index episode:', error);
      throw error;
    }
  }

  async indexEpisodes(episodes: Episode[]): Promise<void> {
    if (episodes.length === 0) return;

    const body = episodes.flatMap(episode => [
      { index: { _index: this.episodeIndex, _id: episode.slug } },
      episode
    ]);

    try {
      const response = await this.client.bulk({ body });
      
      if (response.errors) {
        console.error('Bulk indexing errors:', response.items.filter(item => item.index?.error));
      } else {
        console.log(`Successfully indexed ${episodes.length} episodes`);
      }

      // Update episode counts for affected movies
      const movieSlugs = [...new Set(episodes.map(ep => ep.movieSlug))];
      for (const movieSlug of movieSlugs) {
        await this.updateMovieEpisodeCount(movieSlug);
      }
    } catch (error) {
      console.error('Failed to bulk index episodes:', error);
      throw error;
    }
  }

  private async updateMovieEpisodeCount(movieSlug: string): Promise<void> {
    try {
      const countResponse = await this.client.count({
        index: this.episodeIndex,
        body: {
          query: {
            term: { movieSlug }
          }
        }
      });

      await this.client.update({
        index: this.movieIndex,
        id: movieSlug,
        body: {
          doc: {
            episodeCount: countResponse.count
          }
        }
      });
    } catch (error) {
      console.error('Failed to update movie episode count:', error);
    }
  }

  async searchMovies(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      const { page = 1, limit = 20, sortBy = 'relevance', filters } = options;
      const fuzzy = options.fuzzy ?? true;
      
      const from = (page - 1) * limit;
      
      const searchBody: any = {
        from,
        size: limit,
        query: {
          bool: {
            must: [],
            filter: []
          }
        }
      };

      // Build search query
      if (query && query.trim()) {
        const shouldQueries = [
          {
            multi_match: {
              query: query,
              fields: [
                'name^3',
                'name.autocomplete^2',
                'originName^2',
                'originName.autocomplete',
                'description',
                'actors',
                'directors'
              ],
              type: 'best_fields',
              fuzziness: fuzzy ? 'AUTO' : 0
            }
          },
          // Add exact match boost for better relevance
          {
            term: {
              'name.keyword': {
                value: query,
                boost: 5
              }
            }
          }
        ];

        searchBody.query.bool.must.push({
          bool: {
            should: shouldQueries,
            minimum_should_match: 1
          }
        });
      } else {
        searchBody.query.bool.must.push({ match_all: {} });
      }

      // Add filters
      if (filters) {
        if (filters.section) {
          searchBody.query.bool.filter.push({ term: { section: filters.section } });
        }
        if (filters.type) {
          searchBody.query.bool.filter.push({ term: { type: filters.type } });
        }
        if (filters.isRecommended !== undefined) {
          searchBody.query.bool.filter.push({ term: { isRecommended: filters.isRecommended } });
        }
        if (filters.year && filters.year.length === 2) {
          searchBody.query.bool.filter.push({
            range: {
              year: {
                gte: filters.year[0],
                lte: filters.year[1]
              }
            }
          });
        }
        if (filters.categories && filters.categories.length > 0) {
          searchBody.query.bool.filter.push({
            nested: {
              path: 'categories',
              query: {
                terms: { 'categories.slug': filters.categories }
              }
            }
          });
        }
        if (filters.countries && filters.countries.length > 0) {
          searchBody.query.bool.filter.push({
            nested: {
              path: 'countries',
              query: {
                terms: { 'countries.slug': filters.countries }
              }
            }
          });
        }
      }

      // Add sorting
      if (sortBy === 'year') {
        searchBody.sort = [{ year: { order: 'desc' } }];
      } else if (sortBy === 'rating') {
        searchBody.sort = [{ imdbRating: { order: 'desc' } }];
      } else if (sortBy === 'views') {
        searchBody.sort = [{ view: { order: 'desc' } }];
      }
      // For relevance, we rely on Elasticsearch's default scoring

      const searchResponse = await this.client.search({
        index: this.movieIndex,
        body: searchBody
      });

      const movies = searchResponse.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      const totalHits = typeof searchResponse.hits.total === 'object' 
        ? searchResponse.hits.total.value 
        : searchResponse.hits.total;
      
      const total = totalHits || 0;

      return {
        data: movies,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown search error',
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      const { page = 1, limit = 20, sortBy = 'relevance' } = options;
      
      // Use the destructured values to avoid unused variable error
      const searchParams = {
        index: this.movieIndex,
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title^3', 'description^2', 'genres', 'tags'],
              fuzziness: 'AUTO'
            }
          },
          size: limit,
          from: (page - 1) * limit,
          sort: this.getSortConfig(sortBy)
        }
      };

      const response = await this.client.search(searchParams);
      
      return {
        results: response.body.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source
        })),
        total: response.body.hits.total.value || 0,
        page,
        limit,
        totalPages: Math.ceil((response.body.hits.total.value || 0) / limit)
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown search error',
        results: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
  }

  async getMovieById(id: string): Promise<any> {
    try {
      const searchResponse = await this.client.get({
        index: this.movieIndex,
        id: id
      });
      
      const source = searchResponse._source as Record<string, any>;
      return { id: searchResponse._id, ...source };
    } catch (error) {
      console.error('Elasticsearch get error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getRecommendations(options: { limit?: number } = {}): Promise<SearchResult> {
    const { limit = 20 } = options;
    
    try {
      const searchResponse = await this.client.search({
        index: this.movieIndex,
        body: {
          size: limit,
          query: {
            bool: {
              filter: [
                { term: { isRecommended: true } }
              ]
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { view: { order: 'desc' } }
          ]
        }
      });

      const movies = searchResponse.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      const totalHits = typeof searchResponse.hits.total === 'object' 
        ? searchResponse.hits.total.value 
        : searchResponse.hits.total;
      
      const total = totalHits || 0;

      return {
        data: movies,
        total,
        page: 1,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Elasticsearch recommendations error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown recommendations error',
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
  }

  async getSuggestions(query: string, limit: number = 8): Promise<string[]> {
    if (!query || query.trim() === '') return [];

    try {
      const response = await this.client.search({
        index: this.movieIndex,
        body: {
          suggest: {
            movie_suggest: {
              prefix: query,
              completion: {
                field: 'name.autocomplete',
                size: limit,
                skip_duplicates: true
              }
            }
          },
          _source: ['name', 'originName'],
          size: 0
        }
      });

      // Also get direct matches for better suggestions
      const searchResponse = await this.client.search({
        index: this.movieIndex,
        body: {
          query: {
            multi_match: {
              query: query,
              fields: ['name.autocomplete^2', 'originName.autocomplete'],
              type: 'phrase_prefix'
            }
          },
          _source: ['name', 'originName'],
          size: limit
        }
      });

      const suggestions = new Set<string>();
      
      // Add search results
      searchResponse.hits.hits.forEach((hit: any) => {
        suggestions.add(hit._source.name);
        if (hit._source.originName) {
          suggestions.add(hit._source.originName);
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  async getMoviesByCategory(categorySlug: string, options: SearchOptions = {}): Promise<SearchResult> {
    const { page = 1, limit = 20, sortBy = 'relevance' } = options;

    try {
      return await this.searchMovies('', {
        ...options,
        filters: {
          ...options.filters,
          categories: [categorySlug]
        }
      });
    } catch (error) {
      console.error('Failed to get movies by category:', error);
      throw error;
    }
  }

  async getMoviesByCountry(countrySlug: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      return await this.searchMovies('', {
        ...options,
        filters: {
          ...options.filters,
          countries: [countrySlug]
        }
      });
    } catch (error) {
      console.error('Failed to get movies by country:', error);
      throw error;
    }
  }

  async deleteMovie(slug: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.movieIndex,
        id: slug
      });

      // Also delete associated episodes
      await this.client.deleteByQuery({
        index: this.episodeIndex,
        body: {
          query: {
            term: { movieSlug: slug }
          }
        }
      });
    } catch (error) {
      console.error('Failed to delete movie from index:', error);
      throw error;
    }
  }

  async deleteEpisode(slug: string): Promise<void> {
    try {
      // Get episode to find movie slug
      const episode = await this.client.get({
        index: this.episodeIndex,
        id: slug
      });

      await this.client.delete({
        index: this.episodeIndex,
        id: slug
      });

      // Update movie episode count
      if (episode._source) {
        await this.updateMovieEpisodeCount((episode._source as any).movieSlug);
      }
    } catch (error) {
      console.error('Failed to delete episode from index:', error);
      throw error;
    }
  }

  async reindex(): Promise<void> {
    try {
      console.log('Starting reindex process...');
      
      // Delete existing indexes
      await this.client.indices.delete({
        index: [this.movieIndex, this.episodeIndex],
        ignore_unavailable: true
      });

      // Recreate indexes
      await this.createIndexes();
      
      console.log('Indexes recreated. Ready for bulk indexing.');
    } catch (error) {
      console.error('Failed to reindex:', error);
      throw error;
    }
  }

  async getHealth(): Promise<any> {
    try {
      const [clusterHealth, indexStats] = await Promise.all([
        this.client.cluster.health(),
        this.client.indices.stats({ index: [this.movieIndex, this.episodeIndex] })
      ]);

      return {
        cluster: clusterHealth,
        indexes: indexStats
      };
    } catch (error) {
      console.error('Failed to get Elasticsearch health:', error);
      return { error: error.message };
    }
  }
}

// Factory function to create Elasticsearch service
export function createElasticsearchService(): ElasticsearchService | null {
  try {
    // Check for Elasticsearch configuration
    const elasticsearchNode = process.env.ELASTICSEARCH_NODE || process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    
    const config: ElasticsearchConfig = {
      node: elasticsearchNode,
    };

    console.log('🔍 Creating Elasticsearch service with configuration:');
    console.log(`   Node: ${config.node}`);
    console.log(`   ELASTICSEARCH_NODE: ${process.env.ELASTICSEARCH_NODE || 'not set'}`);
    console.log(`   ELASTICSEARCH_ENABLED: ${process.env.ELASTICSEARCH_ENABLED || 'not set'}`);

    // Add authentication if provided
    if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      config.auth = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      };
      console.log('   Authentication: enabled');
    }

    // Add TLS config for cloud deployments
    if (process.env.ELASTICSEARCH_CLOUD === 'true') {
      config.tls = {
        rejectUnauthorized: false
      };
      console.log('   TLS: enabled for cloud');
    }

    return new ElasticsearchService(config);
  } catch (error) {
    console.error('Failed to create Elasticsearch service:', error);
    return null;
  }
}