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
  aggregations?: any;
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
      const health = await this.client.ping();
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
    const {
      page = 1,
      limit = 20,
      filters = {},
      sortBy = 'relevance',
      fuzzy = true
    } = options;

    const from = (page - 1) * limit;

    try {
      const searchBody: any = {
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        from,
        size: limit,
        highlight: {
          fields: {
            name: {},
            originName: {},
            description: {},
            'actors': {},
            'directors': {}
          }
        }
      };

      // Build search query
      if (query && query.trim()) {
        const searchQueries = [
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
          }
        ];

        // Add exact match boost for better relevance
        searchQueries.push({
          term: {
            'name.keyword': {
              value: query,
              boost: 5
            }
          }
        });

        searchBody.query.bool.should = searchQueries;
        searchBody.query.bool.minimum_should_match = 1;
      } else {
        searchBody.query = { match_all: {} };
      }

      // Apply filters
      if (filters.section) {
        searchBody.query.bool.filter.push({
          term: { section: filters.section }
        });
      }

      if (filters.type) {
        searchBody.query.bool.filter.push({
          term: { type: filters.type }
        });
      }

      if (filters.isRecommended !== undefined) {
        searchBody.query.bool.filter.push({
          term: { isRecommended: filters.isRecommended }
        });
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

      // Apply sorting
      if (sortBy === 'name') {
        searchBody.sort = [{ 'name.keyword': { order: 'asc' } }];
      } else if (sortBy === 'year') {
        searchBody.sort = [{ year: { order: 'desc' } }, { _score: { order: 'desc' } }];
      } else if (sortBy === 'view') {
        searchBody.sort = [{ view: { order: 'desc' } }, { _score: { order: 'desc' } }];
      } else if (sortBy === 'created') {
        searchBody.sort = [{ createdAt: { order: 'desc' } }, { _score: { order: 'desc' } }];
      } else {
        // Default relevance sorting
        searchBody.sort = [{ _score: { order: 'desc' } }, { modifiedAt: { order: 'desc' } }];
      }

      const response = await this.client.search({
        index: this.movieIndex,
        body: searchBody
      });

      const movies = response.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        _highlights: hit.highlight
      }));

      return {
        data: movies,
        total: typeof response.hits.total === 'object' 
          ? response.hits.total.value 
          : response.hits.total || 0,
        aggregations: response.aggregations
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      throw error;
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
    const config: ElasticsearchConfig = {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    };

    // Add authentication if provided
    if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      config.auth = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      };
    }

    // Add TLS config for cloud deployments
    if (process.env.ELASTICSEARCH_CLOUD === 'true') {
      config.tls = {
        rejectUnauthorized: false
      };
    }

    return new ElasticsearchService(config);
  } catch (error) {
    console.error('Failed to create Elasticsearch service:', error);
    return null;
  }
}