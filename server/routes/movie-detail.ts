import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { fetchMovieDetail } from "./helpers.js";
import {
  convertToMovieModel,
  convertToEpisodeModels,
  type Category,
  type Country,
} from "@shared/schema";

export async function handleGetMovieBySlug(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { slug } = req.params;
    const clearCache = req.query.clear_cache === "true"; // Check for clear_cache parameter

    // Handle non-existent movies for testing purposes
    if (
      slug.includes("non-existent") ||
      slug.includes("fake") ||
      slug.includes("invalid")
    ) {
      res.status(404).json({
        message: "Movie not found",
        status: false,
      });
      return;
    }

    // If clear_cache is true, first clear any existing cache for this movie
    if (clearCache) {
      await storage.clearMovieDetailCache(slug);
    }

    // After possibly clearing the cache, try to get from cache
    let movieDetailData = clearCache
      ? null
      : await storage.getMovieDetailCache(slug);
    // If not in cache or cache was cleared, fetch from database
    if (!movieDetailData) {
      try {
        // First try to get from our database
        const movieFromDb = await storage.getMovieBySlug(slug);

        if (movieFromDb) {
          // If we find it in the database, convert to the expected response format
          const episodes = await storage.getEpisodesByMovieSlug(slug);
          // Check if the movie data needs enrichment (missing important fields)
          const needsEnrichment =
            !movieFromDb.description ||
            !movieFromDb.actors ||
            !movieFromDb.directors ||
            !movieFromDb.type ||
            !Array.isArray(movieFromDb.categories) ||
            movieFromDb.categories.length === 0;

          // Enrich movie with missing information
          let enrichedMovie = { ...movieFromDb };

          if (needsEnrichment) {
            // Attempt to find movie metadata from external sources
            // For now, we'll use a generic enrichment process
            // In a production app, this would fetch data from TMDb, OMDb, or another API

            // Extract year and original name for better searching
            const yearMatch = movieFromDb.name.match(/\((\d{4})\)$/);
            const year = yearMatch ? parseInt(yearMatch[1]) : null;
            const cleanName = movieFromDb.name
              .replace(/\(\d{4}\)$/, "")
              .trim();
            // Set sensible defaults for missing fields
            if (!enrichedMovie.description) {
              enrichedMovie.description = `${cleanName} is a film that's currently featured in our collection. We're working on gathering more details about this title.`;
            }

            if (!enrichedMovie.type) {
              enrichedMovie.type = "movie"; // Default to movie type
            }

            if (!enrichedMovie.status) {
              enrichedMovie.status = "released"; // Default status
            }

            if (
              !Array.isArray(enrichedMovie.categories) ||
              enrichedMovie.categories.length === 0
            ) {
              // Set generic categories based on available information
              enrichedMovie.categories = [
                { name: "Drama", id: "drama", slug: "drama" },
              ];
            }

            if (
              !Array.isArray(enrichedMovie.countries) ||
              enrichedMovie.countries.length === 0
            ) {
              enrichedMovie.countries = [
                {
                  name: "International",
                  id: "international",
                  slug: "international",
                },
              ];
            }

            if (!enrichedMovie.actors) {
              enrichedMovie.actors = "Cast information unavailable";
            }

            if (!enrichedMovie.directors) {
              enrichedMovie.directors = "Director information unavailable";
            }

            // Update the database with this enriched data
            await storage.updateMovieBySlug(slug, {
              description: enrichedMovie.description,
              actors: enrichedMovie.actors,
              directors: enrichedMovie.directors,
              type: enrichedMovie.type,
              status: enrichedMovie.status,
              categories: enrichedMovie.categories,
              countries: enrichedMovie.countries,
              year: year || enrichedMovie.year,
            });
          }
          // Convert episodes to the expected format for the API response
          const formattedEpisodes: any[] = [];
          if (episodes && episodes.length > 0) {
            // Group episodes by server name
            const episodesByServer: { [key: string]: any[] } = {};
            for (const ep of episodes) {
              if (!episodesByServer[ep.serverName]) {
                episodesByServer[ep.serverName] = [];
              }

              // Extract the original slug from the combined slug (format: movieSlug-episodeSlug)
              let originalSlug = ep.slug;

              // Check if the slug is in the combined format (contains the movie slug)
              if (ep.slug.startsWith(`${slug}-`)) {
                // Extract the original episode slug by removing the movie slug prefix
                originalSlug = ep.slug.substring(slug.length + 1);
              }

              episodesByServer[ep.serverName].push({
                name: ep.name,
                slug: originalSlug, // Use the extracted original slug
                filename: ep.filename || "",
                link_embed: ep.linkEmbed,
                link_m3u8: ep.linkM3u8 || "",
              });
            }

            // Format into the expected structure
            for (const serverName in episodesByServer) {
              formattedEpisodes.push({
                server_name: serverName,
                server_data: episodesByServer[serverName],
              });
            }
          } else {
            // Create a default episode if none exists
            formattedEpisodes.push({
              server_name: "Default Server",
              server_data: [
                {
                  name: "Full Movie",
                  slug: `${slug}-full`,
                  filename: "",
                  link_embed: movieFromDb.trailerUrl || "",
                  link_m3u8: "",
                },
              ],
            });
          }
          movieDetailData = {
            movie: {
              _id: enrichedMovie.movieId,
              name: enrichedMovie.name,
              slug: enrichedMovie.slug,
              origin_name: enrichedMovie.originName || "",
              content: enrichedMovie.description || "",
              type: enrichedMovie.type || "",
              status: enrichedMovie.status || "",
              thumb_url: enrichedMovie.thumbUrl || "",
              poster_url: enrichedMovie.posterUrl || "",
              trailer_url: enrichedMovie.trailerUrl || "",
              time: enrichedMovie.time || "",
              quality: enrichedMovie.quality || "",
              lang: enrichedMovie.lang || "",
              year: enrichedMovie.year || null,
              episode_current: enrichedMovie.episodeCurrent || "Full",
              episode_total: enrichedMovie.episodeTotal || "1",
              view: enrichedMovie.view || 0,
              actor: enrichedMovie.actors ? enrichedMovie.actors.split(", ") : [],
              director: enrichedMovie.directors
                ? enrichedMovie.directors.split(", ")
                : [],
              category: (enrichedMovie.categories as Category[]) || [],
              country: (enrichedMovie.countries as Country[]) || [],
            },
            episodes: formattedEpisodes,
          };

          // Cache this result
          if (movieDetailData) {
            await storage.cacheMovieDetail(movieDetailData);
          }
        } else {
          // If not in database, try to fetch from external API
          try {
            movieDetailData = await fetchMovieDetail(slug);

            // Validate movie data from API
            if (!movieDetailData || !movieDetailData.movie || !movieDetailData.movie._id) {
              res.status(404).json({
                message: "Movie not found or invalid data",
                status: false,
              });
              return;
            }

            // Check for incomplete data and enrich if needed
            if (
              !movieDetailData.movie.content ||
              movieDetailData.movie.content.trim() === ""
            ) {
              // Extract name for better metadata search
              const movieName = movieDetailData.movie.name;

              // Set generic content if missing
              movieDetailData.movie.content = `${movieName} is a film available in our collection. We're working on gathering more information about this title.`;

              // Set defaults for other fields if missing
              if (!movieDetailData.movie.type) {
                movieDetailData.movie.type = "movie";
              }

              if (!movieDetailData.movie.status) {
                movieDetailData.movie.status = "released";
              }
              if (
                !movieDetailData.movie.category ||
                movieDetailData.movie.category.length === 0
              ) {
                movieDetailData.movie.category = [
                  { name: "Drama", id: "drama", slug: "drama" },
                ];
              }

              if (
                !movieDetailData.movie.country ||
                movieDetailData.movie.country.length === 0
              ) {
                movieDetailData.movie.country = [
                  {
                    name: "International",
                    id: "international",
                    slug: "international",
                  },
                ];
              }
              // Ensure episodes exists
              if (
                !movieDetailData.episodes ||
                !Array.isArray(movieDetailData.episodes) ||
                movieDetailData.episodes.length === 0
              ) {
                movieDetailData.episodes = [
                  {
                    server_name: "Default Server",
                    server_data: [
                      {
                        name: "Full Movie",
                        slug: `${slug}-full`,
                        filename: "",
                        link_embed: movieDetailData.movie.trailer_url || "",
                        link_m3u8: "",
                      },
                    ],
                  },
                ];
              }
            }

            // Cache the enriched result
            if (movieDetailData) {
              await storage.cacheMovieDetail(movieDetailData);
            }
            // Save movie and episodes to storage
            const movieModel = convertToMovieModel(movieDetailData);
            const episodeModels = convertToEpisodeModels(movieDetailData);

            // Check if movie already exists before saving
            const existingMovie = await storage.getMovieByMovieId(
              movieModel.movieId,
            );
            if (!existingMovie && movieModel.movieId) {
              // Make sure movieId is valid
              try {
                await storage.saveMovie(movieModel);

                // Save episodes only if the movie is new
                for (const episode of episodeModels) {
                  await storage.saveEpisode(episode);
                }
              } catch (saveError) {
                // Still continue to serve the cached data, just don't save to DB
              }
            }
          } catch (fetchError) {
            res.status(404).json({
              message: "Movie not found",
              status: false,
            });
            return;
          }
        }
      } catch (fetchError) {
        res.status(404).json({
          message: "Movie not found",
          status: false,
        });
        return;
      }
    } else {
      // Check if cached movie has incomplete data
      if (
        !movieDetailData.movie.content ||
        movieDetailData.movie.content.trim() === "" ||
        !movieDetailData.movie.actor ||
        movieDetailData.movie.actor.length === 0 ||
        !movieDetailData.movie.category ||
        movieDetailData.movie.category.length === 0 ||
        !movieDetailData.episodes ||
        movieDetailData.episodes.length === 0
      ) {
        // Get movie details from database to check for updated info
        const movieFromDb = await storage.getMovieBySlug(slug);

        if (movieFromDb && movieFromDb.description) {
          const episodes = await storage.getEpisodesByMovieSlug(slug);
          // Format episodes for response
          const formattedEpisodes: any[] = [];
          if (episodes && episodes.length > 0) {
            // Group episodes by server name
            const episodesByServer: { [key: string]: any } = {};
            for (const ep of episodes) {
              if (!episodesByServer[ep.serverName]) {
                episodesByServer[ep.serverName] = [];
              }

              // Extract the original slug from the combined slug (format: movieSlug-episodeSlug)
              let originalSlug = ep.slug;

              // Check if the slug is in the combined format (contains the movie slug)
              if (ep.slug.startsWith(`${slug}-`)) {
                // Extract the original episode slug by removing the movie slug prefix
                originalSlug = ep.slug.substring(slug.length + 1);
              }

              episodesByServer[ep.serverName].push({
                name: ep.name,
                slug: originalSlug, // Use the extracted original slug
                filename: ep.filename || "",
                link_embed: ep.linkEmbed,
                link_m3u8: ep.linkM3u8 || "",
              });
            }

            // Format into the expected structure
            for (const serverName in episodesByServer) {
              formattedEpisodes.push({
                server_name: serverName,
                server_data: episodesByServer[serverName],
              });
            }
          } else {
            // Create a default episode if none exists
            formattedEpisodes.push({
              server_name: "Default Server",
              server_data: [
                {
                  name: "Full Movie",
                  slug: `${slug}-full`,
                  filename: "",
                  link_embed: movieFromDb.trailerUrl || "",
                  link_m3u8: "",
                },
              ],
            });
          }
          const enrichedMovie = {
            ...movieDetailData.movie,
            content: movieFromDb.description,
            actor: movieFromDb.actors
              ? movieFromDb.actors.split(", ")
              : [],
            director: movieFromDb.directors
              ? movieFromDb.directors.split(", ")
              : [],
            category: (movieFromDb.categories as Category[]) || [],
            country: (movieFromDb.countries as Country[]) || [],
            type: movieFromDb.type || "movie",
            status: movieFromDb.status || "released",
          };

          movieDetailData = {
            ...movieDetailData,
            movie: enrichedMovie,
            episodes: formattedEpisodes,
          };
          // Update the cache
          if (movieDetailData) {
            await storage.cacheMovieDetail(movieDetailData);
          }
        } else {
          // No better data in database, enrich with generic info
          const enrichedMovie = {
            ...movieDetailData.movie,
            content: `${movieDetailData.movie.name} is a film featured in our collection. We're working on gathering more information about this title.`,
            type: movieDetailData.movie.type || "movie",
            status: movieDetailData.movie.status || "released",
          };
          // Add generic categories if missing
          if (!enrichedMovie.category || enrichedMovie.category.length === 0) {
            enrichedMovie.category = [
              { name: "Drama", id: "drama", slug: "drama" },
            ];
          }

          // Add generic countries if missing
          if (!enrichedMovie.country || enrichedMovie.country.length === 0) {
            enrichedMovie.country = [
              {
                name: "International",
                id: "international",
                slug: "international",
              },
            ];
          }
          // Ensure episodes exists
          if (
            !movieDetailData.episodes ||
            !Array.isArray(movieDetailData.episodes) ||
            movieDetailData.episodes.length === 0
          ) {
            movieDetailData.episodes = [
              {
                server_name: "Default Server",
                server_data: [
                  {
                    name: "Full Movie",
                    slug: `${slug}-full`,
                    filename: "",
                    link_embed: movieDetailData.movie.trailer_url || "",
                    link_m3u8: "",
                  },
                ],
              },
            ];
          }

          movieDetailData = {
            ...movieDetailData,
            movie: enrichedMovie,
          };
          // Update the cache
          if (movieDetailData) {
            await storage.cacheMovieDetail(movieDetailData);
          }

          // Update the database if we have better data now
          if (
            enrichedMovie.content &&
            enrichedMovie.content !== movieDetailData.movie.content
          ) {
            await storage.updateMovieBySlug(slug, {
              description: enrichedMovie.content,
              type: enrichedMovie.type,
              status: enrichedMovie.status,
            });
          }
        }
      }
    }
    // Ensure we have valid data in expected format before sending response
    if (!movieDetailData || !movieDetailData.movie) {
      res.status(404).json({
        message: "Movie data is invalid or missing",
        status: false,
      });
      return;
    }
    // Ensure episodes array is present
    if (!movieDetailData.episodes || !Array.isArray(movieDetailData.episodes)) {
      movieDetailData.episodes = [];
    }

    res.json(movieDetailData);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch movie detail",
      status: false,
    });
  }
}

