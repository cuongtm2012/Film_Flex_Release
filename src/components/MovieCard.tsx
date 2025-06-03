import React from 'react';
import { Content } from '../types/content';

interface MovieCardProps {
  content: Content;
}

const MovieCard: React.FC<MovieCardProps> = ({ content }) => {
  const episodeTotal = content.episodeTotal || 0;
  const isSingleEpisode = episodeTotal <= 1;

  return (
    <div>
      {isSingleEpisode ? (
        <h2>{content.title}</h2>
      ) : (
        <h2>
          {content.title} ({episodeTotal} episodes)
        </h2>
      )}
    </div>
  );
};

export default MovieCard;