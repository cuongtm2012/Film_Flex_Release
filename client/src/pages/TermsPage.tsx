import React from "react";
import { Link } from "wouter";

const TermsPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Terms of Use</h1>
        <p className="text-center text-muted-foreground mb-8">
          Last updated: May 4, 2025
        </p>

        <div className="prose dark:prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the FilmFlex service, you agree to be bound by these Terms of Use. If you do not agree to these Terms, please do not use the service. FilmFlex reserves the right to modify these Terms at any time, and such modifications shall be effective immediately upon posting on the website. Your continued use of the service following any modifications indicates your acceptance of the modified Terms.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            FilmFlex is a streaming service that offers a wide variety of movies, TV shows, documentaries, and other entertainment content. The content available through our service is licensed from studios, distributors, and other content providers and may change from time to time without notice.
          </p>

          <h2>3. Subscription and Billing</h2>
          <p>
            To access the FilmFlex streaming service, you must have an internet connection and a compatible device, and you must create an account and subscribe to one of our plans. You agree to pay the subscription fees applicable to the plan you choose. Subscription fees will be billed at the beginning of your subscription and on each renewal date thereafter, unless you cancel your subscription prior to the renewal date.
          </p>
          <p>
            FilmFlex offers free trials for eligible subscribers. Eligibility for free trials is determined at FilmFlex's sole discretion. At the end of your free trial period, your subscription will automatically continue at the regular price unless you cancel before the trial ends.
          </p>

          <h2>4. Account Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account information, including your password, and for all activity that occurs under your account. You agree to notify FilmFlex immediately of any unauthorized use of your account or any other breach of security. FilmFlex cannot and will not be liable for any loss or damage arising from your failure to comply with this section.
          </p>

          <h2>5. User Conduct</h2>
          <p>
            You agree not to use the FilmFlex service for any unlawful purpose or in any way that could damage, disable, overburden, or impair the service. You may not attempt to gain unauthorized access to any part of the service, other accounts, computer systems, or networks connected to the service through hacking, password mining, or any other means.
          </p>

          <h2>6. Content Usage Rules</h2>
          <p>
            All content provided through the FilmFlex service is owned by FilmFlex or its licensors and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works from, publicly display, publicly perform, republish, download, store, or transmit any content from the FilmFlex service, except as follows:
          </p>
          <ul>
            <li>You may view content for personal, non-commercial use only</li>
            <li>You may not circumvent, remove, alter, deactivate, degrade, or thwart any of the content protections on the service</li>
            <li>You may not use any robot, spider, scraper, or other automated means to access the service</li>
            <li>You may not decompile, reverse engineer, or disassemble any software or other products or processes accessible through the service</li>
          </ul>

          <h2>7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, in no event shall FilmFlex, its affiliates, or their respective officers, directors, employees, or agents be liable for any direct, indirect, incidental, special, exemplary, or consequential damages arising out of or in connection with your use of the service, including but not limited to, loss of profits, data, use, or other intangible losses.
          </p>

          <h2>8. Governing Law</h2>
          <p>
            These Terms of Use shall be governed by and construed in accordance with the laws of the country in which you reside, without giving effect to any principles of conflicts of law. Any legal action or proceeding arising under these Terms shall be brought exclusively in the federal or state courts located in the relevant jurisdiction.
          </p>

          <h2>9. Termination</h2>
          <p>
            FilmFlex may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including if you breach these Terms of Use. Upon termination, your right to use the service will immediately cease.
          </p>

          <h2>10. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Use, please contact us at:
          </p>
          <p>
            FilmFlex Customer Support<br />
            Email: support@filmflex.example.com<br />
            Address: 123 Streaming Lane, Digital City, 10001
          </p>

          <div className="mt-10 text-center">
            <p>
              By using FilmFlex, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
            </p>
            <p className="mt-4">
              <Link href="/">
                <div className="inline-block text-primary hover:underline cursor-pointer">
                  Return to Home
                </div>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;