import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileQuestion, Mail, Search, HelpCircle } from "lucide-react";

const FAQsPage = () => {
  // FAQ categories with their questions and answers
  const faqCategories = [
    {
      category: "Account & Billing",
      items: [
        {
          question: "How do I create an account?",
          answer:
            "To create an account, click on the 'Sign Up' button at the top right of the page. Fill in your details including email, username, and password. Follow the verification steps sent to your email, and you'll be ready to start using FilmFlex.",
        },
        {
          question: "What subscription plans do you offer?",
          answer:
            "FilmFlex offers several subscription tiers: Basic (standard definition, single device), Standard (high definition, two devices), and Premium (ultra HD, four devices). Visit our pricing page for current rates and special offers.",
        },
        {
          question: "How can I update my payment information?",
          answer:
            "You can update your payment information by going to your account settings. Click on your profile icon, select 'Account', then 'Billing Information'. Here you can add, remove, or update payment methods.",
        },
        {
          question: "Can I cancel my subscription at any time?",
          answer:
            "Yes, you can cancel your subscription at any time. There are no cancelation fees. Your account will remain active until the end of your current billing cycle.",
        },
        {
          question: "Do you offer a free trial?",
          answer:
            "Yes, we offer a 7-day free trial for new members. You'll need to provide payment information to start your trial, but you won't be charged until the trial period ends.",
        },
      ],
    },
    {
      category: "Content & Streaming",
      items: [
        {
          question: "What content is available on FilmFlex?",
          answer:
            "FilmFlex offers a wide variety of movies and TV shows across all genres, including action, comedy, drama, documentaries, horror, sci-fi, and more. We regularly update our library with new releases and classics.",
        },
        {
          question: "Can I download content to watch offline?",
          answer:
            "Yes, most titles are available for download on our mobile and tablet apps. Look for the download icon next to the title. Downloaded content remains available for 48 hours after you start watching, or 7 days if unwatched.",
        },
        {
          question: "What streaming quality does FilmFlex offer?",
          answer:
            "Depending on your subscription plan and internet connection, FilmFlex offers streaming in SD (480p), HD (720p and 1080p), and Ultra HD (4K). Our adaptive streaming technology adjusts quality automatically based on your internet speed.",
        },
        {
          question: "Is FilmFlex available in my country?",
          answer:
            "FilmFlex is currently available in over 25 countries. Visit our availability page to see if your country is supported. Please note that content libraries may vary by region due to licensing agreements.",
        },
        {
          question: "Why isn't a particular movie or show available?",
          answer:
            "Content availability depends on licensing agreements which vary by region and change over time. If you can't find a specific title, it may not be licensed in your region, or it might have been removed from our library temporarily.",
        },
      ],
    },
    {
      category: "Technical Support",
      items: [
        {
          question: "What devices can I use to watch FilmFlex?",
          answer:
            "FilmFlex is compatible with most internet-connected devices, including smart TVs, game consoles, streaming media players, set-top boxes, smartphones, tablets, and web browsers on computers.",
        },
        {
          question: "Why am I experiencing buffering or poor video quality?",
          answer:
            "Buffering and quality issues are usually related to your internet connection. Try these steps: 1) Check your internet speed at speedtest.net (we recommend at least 5 Mbps for HD), 2) Close other applications using bandwidth, 3) Move closer to your Wi-Fi router or use an ethernet connection, 4) Restart your device and router.",
        },
        {
          question: "How many devices can I stream on simultaneously?",
          answer:
            "The number of devices you can stream on simultaneously depends on your subscription plan: Basic (1 device), Standard (2 devices), Premium (4 devices).",
        },
        {
          question: "Can I watch FilmFlex on my TV?",
          answer:
            "Yes, you can watch FilmFlex on smart TVs with our app installed, or by connecting devices like Chromecast, Roku, Amazon Fire TV, Apple TV, or game consoles. Many modern TVs come with the FilmFlex app pre-installed.",
        },
        {
          question: "How do I reset my password?",
          answer:
            "To reset your password, click the 'Forgot Password' link on the sign-in page. Enter the email associated with your account, and we'll send you a password reset link. For security reasons, this link expires after 24 hours.",
        },
      ],
    },
    {
      category: "Features & Personalization",
      items: [
        {
          question: "How does the recommendation system work?",
          answer:
            "Our recommendation system uses a combination of your viewing history, ratings, searches, and preferences to suggest content you might enjoy. The more you watch and interact with FilmFlex, the more personalized your recommendations become.",
        },
        {
          question: "Can I create multiple profiles on one account?",
          answer:
            "Yes, depending on your subscription plan, you can create up to 5 profiles per account. Each profile gets its own personalized recommendations, watch history, and watchlist. This is perfect for families or shared accounts.",
        },
        {
          question: "How do I add a movie or show to my watchlist?",
          answer:
            "To add a title to your watchlist, simply click on the '+' or bookmark icon displayed on the title's card or detail page. You can access your watchlist anytime from the main navigation menu.",
        },
        {
          question: "Can I set parental controls on my account?",
          answer:
            "Yes, FilmFlex offers robust parental controls. You can set content restrictions based on maturity ratings for specific profiles, and even protect certain profiles with a PIN to prevent unauthorized access.",
        },
        {
          question: "How do I rate content on FilmFlex?",
          answer:
            "You can rate content by clicking on the rating stars on a title's detail page after watching. Your ratings help improve our recommendations for you and contribute to our community ratings.",
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="text-center mb-12">
        <FileQuestion className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">Frequently Asked Questions</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Find answers to common questions about FilmFlex, from account management to streaming features.
        </p>
      </div>

      {/* Search bar for FAQ (this would be functional in a real implementation) */}
      <div className="max-w-xl mx-auto mb-12">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-3 border-0 bg-muted/50 rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Search for a question..."
          />
        </div>
      </div>

      {/* FAQ Categories and Questions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
        {/* Category sidebar (for larger screens) */}
        <div className="hidden md:block">
          <div className="bg-black/20 rounded-lg p-4 sticky top-20">
            <h2 className="font-bold text-lg mb-4">Categories</h2>
            <ul className="space-y-2">
              {faqCategories.map((category, index) => (
                <li key={index}>
                  <a
                    href={`#${category.category.toLowerCase().replace(/[&\s]+/g, "-")}`}
                    className="block p-2 hover:bg-muted/80 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {category.category}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ accordion content */}
        <div className="md:col-span-3">
          {faqCategories.map((category, categoryIndex) => (
            <div 
              key={categoryIndex} 
              className="mb-10"
              id={category.category.toLowerCase().replace(/[&\s]+/g, "-")}
            >
              <h2 className="text-2xl font-bold mb-4">{category.category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {category.items.map((item, itemIndex) => (
                  <AccordionItem key={itemIndex} value={`item-${categoryIndex}-${itemIndex}`}>
                    <AccordionTrigger className="text-lg font-medium">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>

      {/* Didn't find an answer section */}
      <div className="bg-black/20 rounded-lg p-8 text-center max-w-3xl mx-auto mb-10">
        <HelpCircle className="h-10 w-10 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-3">Didn't Find Your Answer?</h2>
        <p className="text-muted-foreground mb-6">
          Our support team is here to help with any questions you may have about FilmFlex.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/contact" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </a>
        </div>
      </div>

      {/* Related information links */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-4">Additional Resources</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <a href="/terms" className="p-4 bg-black/20 rounded-lg text-center hover:bg-black/30 transition-colors">
          <span className="font-medium">Terms of Service</span>
        </a>
        <a href="/about" className="p-4 bg-black/20 rounded-lg text-center hover:bg-black/30 transition-colors">
          <span className="font-medium">About FilmFlex</span>
        </a>
        <a href="/how-to-watch" className="p-4 bg-black/20 rounded-lg text-center hover:bg-black/30 transition-colors">
          <span className="font-medium">How to Watch</span>
        </a>
      </div>
    </div>
  );
};

export default FAQsPage;