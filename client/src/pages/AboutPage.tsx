import React from "react";
import { Building, Users, Award, Sparkles } from "lucide-react";
import { Link } from "wouter";

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">About FilmFlex</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
          <p className="lead text-xl text-center mb-10">
            FilmFlex is dedicated to bringing the world's best movies and TV shows to audiences everywhere.
            Our platform combines cutting-edge technology with a passion for storytelling.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            <div className="bg-black/5 dark:bg-white/5 p-6 rounded-lg">
              <h2 className="flex items-center text-2xl font-semibold mb-4">
                <Building className="mr-2 h-6 w-6 text-primary" />
                Our Mission
              </h2>
              <p>
                To create the most enjoyable and accessible streaming experience, connecting people with the stories they love through innovative technology and curated content.
              </p>
            </div>
            
            <div className="bg-black/5 dark:bg-white/5 p-6 rounded-lg">
              <h2 className="flex items-center text-2xl font-semibold mb-4">
                <Sparkles className="mr-2 h-6 w-6 text-primary" />
                Our Vision
              </h2>
              <p>
                To be the premier destination for entertainment worldwide, where quality content meets personalized discovery in a seamless, enjoyable viewing experience.
              </p>
            </div>
          </div>
          
          <h2 className="text-3xl font-semibold mb-6">Our Story</h2>
          
          <p>
            Founded in 2022, FilmFlex began with a simple idea: make great content accessible to everyone. What started as a small team of film enthusiasts has grown into a global streaming platform with millions of viewers.
          </p>
          
          <p>
            Our journey has been driven by innovation and a deep love for storytelling. From our early days of curating independent films to our current extensive library spanning genres and cultures, we've remained committed to quality entertainment.
          </p>
          
          <div className="my-12">
            <h2 className="text-3xl font-semibold mb-6 flex items-center">
              <Award className="mr-2 h-6 w-6 text-primary" />
              Achievements & Milestones
            </h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold">2022</h3>
                <p>FilmFlex launches with 500 carefully selected movies.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold">2023</h3>
                <p>Expands catalog to include TV shows and hit 1 million subscribers.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold">2024</h3>
                <p>Launches FilmFlex Originals, producing exclusive content.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold">2025</h3>
                <p>Reaches 5 million subscribers across 50+ countries.</p>
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-semibold mb-6 flex items-center">
            <Users className="mr-2 h-6 w-6 text-primary" />
            Our Team
          </h2>
          
          <p>
            The heart of FilmFlex is our diverse team of cinema lovers, tech innovators, and creative minds. Based in multiple locations around the world, our team works tirelessly to bring you the best streaming experience possible.
          </p>
          
          <p>
            We're united by our passion for great storytelling and our belief in the power of film and television to connect, inspire, and entertain.
          </p>
          
          <div className="mt-12 text-center">
            <h3 className="text-2xl font-semibold mb-4">Ready to experience FilmFlex?</h3>
            <Link href="/movies">
              <div className="inline-block bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                Explore Our Catalog
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;