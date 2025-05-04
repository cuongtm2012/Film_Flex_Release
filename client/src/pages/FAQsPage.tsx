import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "wouter";

const FAQsPage = () => {
  const faqs = [
    {
      category: "Account & Billing",
      questions: [
        {
          question: "How do I create a FilmFlex account?",
          answer:
            "Creating a FilmFlex account is easy! Simply click the 'Sign Up' button at the top right of the screen, enter your email address, create a password, and follow the instructions. You'll be watching your favorite content in minutes.",
        },
        {
          question: "How do I reset my password?",
          answer:
            "If you've forgotten your password, click 'Log In' at the top of the page, then select 'Forgot Password'. Enter the email address associated with your account, and we'll send you instructions to reset your password.",
        },
        {
          question: "What payment methods do you accept?",
          answer:
            "FilmFlex accepts all major credit and debit cards, PayPal, and gift cards. In select regions, we also support Apple Pay and Google Pay.",
        },
        {
          question: "How do I cancel my subscription?",
          answer:
            "You can cancel your subscription anytime by going to your Account Settings, selecting 'Subscription', and clicking 'Cancel Subscription'. Your subscription will remain active until the end of your current billing period.",
        },
      ],
    },
    {
      category: "Streaming & Playback",
      questions: [
        {
          question: "What internet speed do I need for streaming?",
          answer:
            "We recommend a minimum internet connection speed of 5 Mbps for HD streaming and 15 Mbps for 4K Ultra HD streaming. You can check your connection speed in Account Settings > Playback Settings.",
        },
        {
          question: "Why is my video buffering or not playing smoothly?",
          answer:
            "Buffering usually occurs when your internet connection is slow or unstable. Try closing other applications that use bandwidth, connecting to a stronger Wi-Fi signal, or switching to a wired connection. You can also lower the video quality in the player settings to reduce buffering.",
        },
        {
          question: "Can I download content to watch offline?",
          answer:
            "Yes! Most content on FilmFlex is available for download on our mobile apps. Look for the download icon next to titles. Downloads remain available for 30 days or 48 hours after you start watching.",
        },
        {
          question: "What devices can I use to watch FilmFlex?",
          answer:
            "FilmFlex is available on smartphones, tablets, smart TVs, web browsers, streaming devices (like Roku, Apple TV, Chromecast), and game consoles (PlayStation, Xbox). Check our Devices page for a complete list of supported devices.",
        },
      ],
    },
    {
      category: "Content & Features",
      questions: [
        {
          question: "How often do you add new movies and shows?",
          answer:
            "We add new content weekly! Check our 'New Releases' section for the latest additions. We typically add new licensed content at the beginning of each month and release originals throughout the month.",
        },
        {
          question: "Why can't I find a specific movie or show on FilmFlex?",
          answer:
            "Content availability varies by region due to licensing agreements. Some titles may be temporarily unavailable or not available in your region. Our content library also rotates, with some titles leaving as new ones are added.",
        },
        {
          question: "Can I share my account with family members?",
          answer:
            "Yes! FilmFlex offers family plans that allow multiple users to access content through one account. Each family member can create their own profile with personalized recommendations and watch history.",
        },
        {
          question: "How do I create and manage user profiles?",
          answer:
            "To create a new profile, click on your account icon, select 'Manage Profiles', and click 'Add Profile'. You can customize each profile with a name, avatar, and content restrictions if needed.",
        },
      ],
    },
    {
      category: "Technical Support",
      questions: [
        {
          question: "The FilmFlex app is not working on my device. What should I do?",
          answer:
            "First, try closing and reopening the app. If that doesn't work, try logging out and logging back in. For persistent issues, try uninstalling and reinstalling the app, making sure you have the latest version. If problems continue, contact our support team.",
        },
        {
          question: "How do I update the FilmFlex app?",
          answer:
            "On mobile devices, visit your device's app store (Google Play or App Store) and check for updates. For smart TVs and streaming devices, updates usually happen automatically, but you can check your device's app store or settings menu for manual updates.",
        },
        {
          question: "Can I watch FilmFlex in 4K or HDR?",
          answer:
            "Yes! Many titles are available in 4K Ultra HD and HDR. Look for the 4K or HDR icon on titles. To stream in 4K, you need a compatible device, a display that supports 4K, and a Premium subscription plan.",
        },
        {
          question: "Why am I experiencing audio/video sync issues?",
          answer:
            "Audio/video sync issues can occur due to network fluctuations or device performance. Try pausing the video for a few seconds and then resuming, or exit and restart the video. If problems persist, try restarting your device or reinstalling the app.",
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Frequently Asked Questions</h1>
        <p className="text-lg text-center text-muted-foreground mb-10">
          Find answers to common questions about FilmFlex
        </p>

        <div className="space-y-10">
          {faqs.map((category, index) => (
            <div key={index}>
              <h2 className="text-2xl font-semibold mb-4">{category.category}</h2>
              <Accordion type="single" collapsible className="mb-8">
                {category.questions.map((faq, faqIndex) => (
                  <AccordionItem value={`${index}-${faqIndex}`} key={faqIndex}>
                    <AccordionTrigger className="text-left font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-black/5 dark:bg-white/5 rounded-lg p-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="mb-6">Our support team is here to help you with any other questions.</p>
          <Link href="/contact">
            <div className="inline-block bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              Contact Support
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQsPage;