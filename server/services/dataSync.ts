import { Storage } from '../storage';
import { elasticsearchService } from './elasticsearch';
import { Movie } from '../../shared/schema';

export class DataSyncService {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async fullSync(): Promise<void> {
    try {
      console.log('🔄 Starting full data synchronization...');
      
      // Get all movies from PostgreSQL (without pagination)
      let page = 1;
      const limit = 1000;
      let allMovies: Movie[] = [];
      
      while (true) {
        const { data: movies, total } = await this.storage.getMovies(page, limit);
        allMovies.push(...movies);
        
        console.log(`📥 Loaded ${allMovies.length}/${total} movies...`);
        
        if (movies.length < limit) {
          break; // No more movies
        }
        page++;
      }

      if (allMovies.length === 0) {
        console.log('⚠️ No movies found in database');
        return;
      }

      // Remove duplicates by slug (in case of database duplicates)
      const uniqueMovies = allMovies.reduce((acc, movie) => {
        acc[movie.slug] = movie;
        return acc;
      }, {} as Record<string, Movie>);

      const uniqueMoviesList = Object.values(uniqueMovies);
      
      console.log(`🎬 Found ${uniqueMoviesList.length} unique movies to index`);

      // Bulk index to Elasticsearch in chunks
      const chunkSize = 100;
      for (let i = 0; i < uniqueMoviesList.length; i += chunkSize) {
        const chunk = uniqueMoviesList.slice(i, i + chunkSize);
        await elasticsearchService.bulkIndexMovies(chunk);
        console.log(`✅ Indexed chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(uniqueMoviesList.length/chunkSize)}`);
      }

      await elasticsearchService.refreshIndex();
      console.log('🎉 Full synchronization completed successfully!');
      
    } catch (error) {
      console.error('❌ Full synchronization failed:', error);
      throw error;
    }
  }

  async syncMovie(movie: Movie): Promise<void> {
    try {
      await elasticsearchService.indexMovie(movie);
      console.log(`✅ Synced movie: ${movie.name} (${movie.slug})`);
    } catch (error) {
      console.error(`❌ Failed to sync movie ${movie.slug}:`, error);
      throw error;
    }
  }

  async deleteMovie(slug: string): Promise<void> {
    try {
      await elasticsearchService.deleteMovie(slug);
      console.log(`🗑️ Deleted movie from search index: ${slug}`);
    } catch (error) {
      console.error(`❌ Failed to delete movie ${slug} from search index:`, error);
      throw error;
    }
  }

  async checkSyncStatus(): Promise<{ 
    postgresCount: number; 
    elasticsearchCount: number; 
    isInSync: boolean 
  }> {
    try {
      // Get count from PostgreSQL
      const { total: postgresCount } = await this.storage.getMovies(1, 1);
      
      // Get count from Elasticsearch
      const elasticsearchResult = await elasticsearchService.searchMovies('', 1, 0);
      const elasticsearchCount = elasticsearchResult.total;
      
      const isInSync = Math.abs(postgresCount - elasticsearchCount) <= 1; // Allow small diff
      
      return {
        postgresCount,
        elasticsearchCount,
        isInSync
      };
    } catch (error) {
      console.error('Error checking sync status:', error);
      return {
        postgresCount: 0,
        elasticsearchCount: 0,
        isInSync: false
      };
    }
  }
}

export default DataSyncService;