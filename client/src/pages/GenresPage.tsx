import React from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { 
  Swords, 
  Flame, 
  Heart, 
  Laugh, 
  Ghost, 
  Rocket, 
  Zap, 
  Bomb, 
  Lightbulb, 
  Skull, 
  Music, 
  Shirt, 
  BadgeAlert, 
  Gamepad2, 
  Mountain 
} from "lucide-react";

// Genre card component
interface GenreCardProps {
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const GenreCard: React.FC<GenreCardProps> = ({ name, slug, icon, color, description }) => (
  <Link href={`/categories/${slug}`}>
    <Card className="h-full overflow-hidden cursor-pointer group hover:shadow-md transition-all">
      <div className={`p-6 flex flex-col items-center text-center h-full border-t-4 ${color}`}>
        <div className={`p-3 rounded-full mb-4 ${color.replace('border', 'bg').replace('-500', '-500/20')}`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  </Link>
);

const GenresPage = () => {
  // Genre list with descriptions
  const genres = [
    {
      name: "Action",
      slug: "hanh-dong",
      icon: <Swords size={24} className="text-red-500" />,
      color: "border-red-500",
      description: "High-energy films with chase scenes, battles, and stunts",
    },
    {
      name: "Drama",
      slug: "chinh-kich",
      icon: <Flame size={24} className="text-blue-500" />,
      color: "border-blue-500",
      description: "Character-focused stories with emotional themes",
    },
    {
      name: "Romance",
      slug: "tinh-cam",
      icon: <Heart size={24} className="text-pink-500" />,
      color: "border-pink-500",
      description: "Love stories exploring relationships and emotions",
    },
    {
      name: "Comedy",
      slug: "hai-huoc",
      icon: <Laugh size={24} className="text-yellow-500" />,
      color: "border-yellow-500",
      description: "Humorous content designed to entertain and amuse",
    },
    {
      name: "Horror",
      slug: "kinh-di",
      icon: <Ghost size={24} className="text-purple-500" />,
      color: "border-purple-500",
      description: "Frightening films designed to scare and thrill audiences",
    },
    {
      name: "Sci-Fi",
      slug: "khoa-hoc-vien-tuong",
      icon: <Rocket size={24} className="text-cyan-500" />,
      color: "border-cyan-500",
      description: "Futuristic stories exploring science and technology",
    },
    {
      name: "Thriller",
      slug: "giat-gan",
      icon: <Zap size={24} className="text-amber-500" />,
      color: "border-amber-500",
      description: "Suspenseful, exciting stories that keep viewers on edge",
    },
    {
      name: "Action & Adventure",
      slug: "phieu-luu-hanh-dong",
      icon: <Bomb size={24} className="text-orange-500" />,
      color: "border-orange-500",
      description: "Exciting stories with heroic characters on daring journeys",
    },
    {
      name: "Mystery",
      slug: "bi-an",
      icon: <Lightbulb size={24} className="text-emerald-500" />,
      color: "border-emerald-500",
      description: "Puzzling plots with secrets waiting to be uncovered",
    },
    {
      name: "Crime",
      slug: "toi-pham",
      icon: <Skull size={24} className="text-gray-500" />,
      color: "border-gray-500",
      description: "Stories focusing on criminal acts and investigations",
    },
    {
      name: "Musical",
      slug: "am-nhac",
      icon: <Music size={24} className="text-indigo-500" />,
      color: "border-indigo-500",
      description: "Films featuring song and dance performances",
    },
    {
      name: "Family",
      slug: "gia-dinh",
      icon: <Shirt size={24} className="text-lime-500" />,
      color: "border-lime-500",
      description: "Content appropriate and entertaining for all ages",
    },
    {
      name: "War",
      slug: "chien-tranh",
      icon: <BadgeAlert size={24} className="text-rose-500" />,
      color: "border-rose-500",
      description: "Stories set during wartime exploring combat and conflict",
    },
    {
      name: "Animation",
      slug: "hoat-hinh",
      icon: <Gamepad2 size={24} className="text-teal-500" />,
      color: "border-teal-500",
      description: "Cartoon films for both children and adults",
    },
    {
      name: "Western",
      slug: "cao-boi",
      icon: <Mountain size={24} className="text-stone-500" />,
      color: "border-stone-500",
      description: "Stories set in the American Old West frontier",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">Movie & TV Genres</h1>
        <p className="text-muted-foreground text-lg">
          Explore our content by genre to find exactly what you're in the mood for
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {genres.map((genre) => (
          <GenreCard
            key={genre.slug}
            name={genre.name}
            slug={genre.slug}
            icon={genre.icon}
            color={genre.color}
            description={genre.description}
          />
        ))}
      </div>

      <div className="mt-16 bg-black/20 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Can't decide what to watch?</h2>
        <p className="text-lg text-muted-foreground mb-6">
          Check out our curated collections or try our personalized recommendations
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/top-rated">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
              Top Rated
            </div>
          </Link>
          <Link href="/new-releases">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 cursor-pointer">
              New Releases
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GenresPage;