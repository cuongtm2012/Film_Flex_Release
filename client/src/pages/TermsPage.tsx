import React from "react";
import { FileTerminal, Shield, Book, Scale, Globe, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";

const TermsPage = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header section */}
      <div className="mb-12 text-center">
        <FileTerminal className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-3">Terms of Use</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Please read these terms carefully before using PhimGG.
        </p>
        <div className="flex justify-center mt-6 text-sm text-muted-foreground">
          <p>Last updated: May 1, 2025</p>
        </div>
      </div>

      {/* Table of contents */}
      <div className="bg-black/20 p-6 rounded-lg mb-10 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Table of Contents</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li><a href="#acceptance" className="text-primary hover:underline">Acceptance of Terms</a></li>
          <li><a href="#changes" className="text-primary hover:underline">Changes to Terms</a></li>
          <li><a href="#access" className="text-primary hover:underline">Access and Use of Services</a></li>
          <li><a href="#accounts" className="text-primary hover:underline">User Accounts</a></li>
          <li><a href="#subscription" className="text-primary hover:underline">Subscription and Billing</a></li>
          <li><a href="#content" className="text-primary hover:underline">Content and Licenses</a></li>
          <li><a href="#restrictions" className="text-primary hover:underline">Restrictions on Use</a></li>
          <li><a href="#copyright" className="text-primary hover:underline">Copyright and Intellectual Property</a></li>
          <li><a href="#disclaimer" className="text-primary hover:underline">Disclaimers and Limitations</a></li>
          <li><a href="#termination" className="text-primary hover:underline">Termination</a></li>
          <li><a href="#governing-law" className="text-primary hover:underline">Governing Law</a></li>
          <li><a href="#contact" className="text-primary hover:underline">Contact Information</a></li>
        </ol>
      </div>

      {/* Terms content */}
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Section 1 */}
        <section id="acceptance">
          <div className="flex items-center mb-4">
            <Scale className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
          </div>
          <div className="text-muted-foreground space-y-4 pl-9">
            <p>
              By accessing or using PhimGG, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and PhimGG regarding your use of the streaming platform and services offered through our website, applications, and other related services (collectively, the "Services").
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 2 */}
        <section id="changes">
          <div className="flex items-center mb-4">
            <FileTerminal className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">2. Changes to Terms</h2>
          </div>
          <div className="text-muted-foreground space-y-4 pl-9">
            <p>
              PhimGG reserves the right to modify these Terms at any time. We will notify you of any significant changes by posting a notice on our website or sending you an email. Your continued use of the Services after any changes indicates your acceptance of the modified Terms.
            </p>
            <p>
              It is your responsibility to check these Terms periodically for changes. If you do not agree to the new terms, you should discontinue using the service.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 3 */}
        <section id="access">
          <div className="flex items-center mb-4">
            <Globe className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">3. Access and Use of Services</h2>
          </div>
          <div className="text-muted-foreground space-y-4 pl-9">
            <p>
              PhimGG grants you a limited, non-exclusive, non-transferable, and revocable license to access and use the Services for your personal, non-commercial use. This license does not include the right to:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software contained on PhimGG</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
            <p>
              The Service is available only to individuals who are at least 13 years old. If you are between the ages of 13 and 18, you may only use the Service with the consent and supervision of a parent or legal guardian who agrees to be bound by these Terms.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 4 */}
        <section id="accounts">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">4. User Accounts</h2>
          </div>
          <div className="text-muted-foreground space-y-4 pl-9">
            <p>
              To access certain features of the Services, you will need to create an account. You are responsible for maintaining the confidentiality of your account information, including your password, and for all activity that occurs under your account.
            </p>
            <p>
              You agree to notify PhimGG immediately of any unauthorized use of your account or any other breach of security. PhimGG will not be liable for any loss or damage arising from your failure to comply with this section.
            </p>
            <p>
              You may not use another user's account without permission. You may not sell, transfer, or assign your account or any account rights.
            </p>
          </div>
        </section>

        <Separator />

        {/* Section 5 */}
        <section id="subscription">
          <div className="flex items-center mb-4">
            <Book className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">5. Subscription and Billing</h2>
          </div>
          <div className="text-muted-foreground space-y-4 pl-9">
            <p>
              To access premium content on PhimGG, you must subscribe to one of our subscription plans. By subscribing, you agree to pay the applicable subscription fees as they become due plus any applicable taxes.
            </p>
            <p>
              Subscription fees are billed in advance on a monthly or annual basis, depending on the subscription plan you select. Your subscription will automatically renew at the end of each billing period unless you cancel it before the renewal date.
            </p>
            <p>
              PhimGG reserves the right to change subscription fees at any time, but we will give you reasonable advance notice of any increase in such fees. If you do not agree to a fee change, you may cancel your subscription before the change takes effect.
            </p>
            <p>
              All payments are non-refundable, except as expressly set forth in these Terms or as required by applicable law.
            </p>
          </div>
        </section>

        {/* More sections would follow in a similar format, but omitted for brevity */}
        <Separator />

        {/* Contact section */}
        <section id="contact">
          <div className="flex items-center mb-4">
            <HelpCircle className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">12. Contact Information</h2>
          </div>
          <div className="text-muted-foreground space-y-4 pl-9">
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="bg-black/10 p-4 rounded-md">
              <p>PhimGG Legal Department</p>
              <p>123 Streaming Lane</p>
              <p>Digital City, FL 10001</p>
              <p>Email: legal@filmflex.example.com</p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </section>
      </div>

      {/* Related documents */}
      <div className="mt-16 bg-black/20 p-8 rounded-lg max-w-3xl mx-auto text-center">
        <h2 className="text-xl font-bold mb-6">Related Legal Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/privacy" className="p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
            <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
            <span className="font-medium">Privacy Policy</span>
          </a>
          <a href="/cookie-policy" className="p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
            <Book className="h-6 w-6 mx-auto mb-2 text-primary" />
            <span className="font-medium">Cookie Policy</span>
          </a>
          <a href="/content-guidelines" className="p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
            <Scale className="h-6 w-6 mx-auto mb-2 text-primary" />
            <span className="font-medium">Content Guidelines</span>
          </a>
        </div>
      </div>

      {/* Print and download options */}
      <div className="flex justify-center mt-10 max-w-3xl mx-auto text-sm text-muted-foreground">
        <a href="#" className="hover:text-foreground transition-colors mr-4">
          Print Page
        </a>
        <a href="#" className="hover:text-foreground transition-colors">
          Download as PDF
        </a>
      </div>
    </div>
  );
};

export default TermsPage;