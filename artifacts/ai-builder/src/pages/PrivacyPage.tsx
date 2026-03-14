import { useLocation } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";
import { ProntoLogoMark, ProntoTagline } from "@/components/ProntoLogo";

export default function PrivacyPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ProntoLogoMark size={28} />
          <div>
            <span className="font-display font-bold text-sm text-foreground leading-none">Pronto</span>
            <ProntoTagline className="mt-0.5" />
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: March 14, 2026 &nbsp;·&nbsp; Effective immediately upon account creation
        </p>

        <div className="prose prose-invert max-w-none space-y-10 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              Pronto ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy carefully. If you do not agree with the terms of this policy, please do not access the Service. By creating an account or using the Service, you consent to the data practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect information in the following ways:</p>

            <h3 className="text-base font-semibold text-foreground mb-2">2.1 Information You Provide Directly</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li><strong className="text-foreground">Account Information:</strong> First name (optional), email address, and hashed password when you register.</li>
              <li><strong className="text-foreground">Project Content:</strong> Code, prompts, instructions, and any text or data you submit to generate or modify applications.</li>
              <li><strong className="text-foreground">Secrets Vault Data:</strong> API keys and credentials you choose to store, which are encrypted at rest using AES-256 encryption.</li>
              <li><strong className="text-foreground">Payment Information:</strong> Billing details processed and stored by Stripe, our third-party payment processor. We do not store full payment card data on our servers.</li>
              <li><strong className="text-foreground">Communications:</strong> Any messages, support requests, or feedback you send to us.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li><strong className="text-foreground">Usage Data:</strong> Credit usage, number of AI generation requests, deployment activity, and feature interactions.</li>
              <li><strong className="text-foreground">Session Data:</strong> Session identifiers, authentication tokens stored in secure HTTP-only cookies.</li>
              <li><strong className="text-foreground">Log Data:</strong> Server logs including IP addresses, browser types, referring URLs, and timestamps of requests. These logs are used for security monitoring and debugging.</li>
              <li><strong className="text-foreground">Device Information:</strong> Browser type and version, operating system, and general device characteristics used for compatibility and security purposes.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mb-2">2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Stripe:</strong> We receive payment status, subscription status, and billing event data from Stripe to manage your account and credits.</li>
              <li><strong className="text-foreground">Anthropic:</strong> Your prompts and project context are transmitted to Anthropic's API to generate code. Anthropic's privacy practices are governed by their own privacy policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide, operate, and maintain the Service;</li>
              <li>Process your prompts and generate AI-powered code output;</li>
              <li>Manage your account, credits, and billing;</li>
              <li>Send transactional communications such as payment receipts and account notifications;</li>
              <li>Monitor and analyze usage patterns to improve the Service;</li>
              <li>Detect, prevent, and respond to fraud, abuse, or security incidents;</li>
              <li>Comply with legal obligations;</li>
              <li>Enforce our Terms of Service;</li>
              <li>Communicate with you about Service updates, changes in pricing or terms, and important notices.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We do not use your project content to train our own AI models. We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. How We Share Your Information</h2>
            <p className="text-muted-foreground mb-3">
              We do not sell, trade, or rent your personal information to third parties. We may share information in the following limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Anthropic (AI Provider):</strong> Your prompts, project files, and conversation context are transmitted to Anthropic's Claude API to generate code responses. This transmission is necessary to provide the core Service. Anthropic's use of this data is subject to their API usage policies and privacy policy.</li>
              <li><strong className="text-foreground">Stripe (Payment Processor):</strong> Your payment information and billing-related data are handled by Stripe. Stripe is PCI DSS compliant. We share only the information necessary to process payments and manage subscriptions.</li>
              <li><strong className="text-foreground">Infrastructure Providers:</strong> We use cloud hosting providers to operate the Service. These providers may have access to data stored on their infrastructure but are contractually bound to protect it.</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose your information if required to do so by law, court order, or governmental authority, or if we believe disclosure is necessary to protect the rights, property, or safety of Pronto, our users, or others.</li>
              <li><strong className="text-foreground">Business Transfers:</strong> In the event of a merger, acquisition, sale of assets, or bankruptcy, your information may be transferred as part of the transaction. We will provide notice before your personal information is transferred and becomes subject to a different privacy policy.</li>
              <li><strong className="text-foreground">With Your Consent:</strong> We may share your information with third parties when you explicitly consent to such sharing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground mb-3">
              We retain your personal information for as long as your account is active or as needed to provide you the Service. Specifically:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Account data is retained until you request account deletion;</li>
              <li>Project files and application data are retained as long as your account is active and for a reasonable period thereafter;</li>
              <li>Payment and billing records are retained for a minimum of 7 years as required by applicable financial regulations;</li>
              <li>Server logs are retained for up to 90 days for security and debugging purposes;</li>
              <li>Encrypted secrets vault data is retained until you explicitly delete entries or close your account.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We do not guarantee the retention or recovery of any data. You are responsible for maintaining independent backups of any content you consider important.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
            <p className="text-muted-foreground mb-3">
              We implement industry-standard technical and organizational security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>AES-256 encryption for stored secrets and sensitive credentials;</li>
              <li>bcrypt hashing for stored passwords;</li>
              <li>HTTPS/TLS encryption for all data in transit;</li>
              <li>HTTP-only, secure session cookies;</li>
              <li>Access controls limiting staff access to user data.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data. In the event of a data breach that affects your personal information, we will notify you as required by applicable law. You acknowledge that you provide personal information at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-3">
              We use cookies and similar tracking technologies to maintain session state and authenticate users. Specifically:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Session Cookies:</strong> We use an HTTP-only session cookie ("sid") to maintain your authenticated session. This cookie is strictly necessary for the Service to function.</li>
              <li><strong className="text-foreground">No Advertising Cookies:</strong> We do not use third-party advertising cookies or tracking pixels.</li>
              <li><strong className="text-foreground">No Analytics Cookies:</strong> We do not currently use third-party analytics services that place cookies on your browser.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              You can control cookies through your browser settings. Disabling the session cookie will prevent you from logging in to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights and Choices</h2>
            <p className="text-muted-foreground mb-3">Depending on your jurisdiction, you may have the following rights:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Access:</strong> You may request a copy of the personal information we hold about you.</li>
              <li><strong className="text-foreground">Correction:</strong> You may request that we correct inaccurate or incomplete information.</li>
              <li><strong className="text-foreground">Deletion:</strong> You may request deletion of your personal information. Note that we may be required to retain certain information for legal or financial compliance purposes.</li>
              <li><strong className="text-foreground">Portability:</strong> You may request your data in a portable, machine-readable format where technically feasible.</li>
              <li><strong className="text-foreground">Objection:</strong> You may object to certain types of data processing where permitted by applicable law.</li>
              <li><strong className="text-foreground">Account Deletion:</strong> You may close your account at any time. Closing your account will result in the deletion of your projects and personal data, subject to our data retention obligations.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise any of these rights, please contact us. We will respond within a reasonable timeframe and in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground">
              The Service is not directed to individuals under the age of 13, and we do not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected personal information from a child under 13, we will take steps to delete that information promptly. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries other than your own, including the United States, where data protection laws may differ from those in your country. By using the Service, you consent to the transfer of your information to these countries. We take reasonable steps to ensure that any international transfers comply with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Third-Party Links and Deployed Applications</h2>
            <p className="text-muted-foreground">
              The Service may contain links to third-party websites. We are not responsible for the privacy practices of such sites. Applications built and deployed through Pronto are independently operated by their creators. If you interact with a third-party application built on Pronto, that application's own privacy policy and terms govern your interaction. Pronto is not responsible for the data practices of applications built by its users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground">
              If you are a California resident, you have the right to request information about the categories of personal information we collect, the purposes for which we use it, and any third parties with whom we share it. You also have the right to request deletion of your personal information, subject to certain exceptions. We do not sell personal information as defined under the California Consumer Privacy Act. To exercise your rights under CCPA, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. GDPR Rights (EEA/UK Users)</h2>
            <p className="text-muted-foreground">
              If you are located in the European Economic Area or the United Kingdom, you have rights under the General Data Protection Regulation (GDPR) or UK GDPR, including the right to access, rectify, erase, restrict, or port your data, and to object to processing. Our lawful basis for processing your data is primarily the performance of our contract with you (to provide the Service) and our legitimate interests in operating, securing, and improving the Service. Where required, we will obtain your explicit consent. To exercise your GDPR rights or to lodge a complaint with a supervisory authority, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">14. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We reserve the right to update this Privacy Policy at any time. When we do, we will revise the "Last updated" date at the top of this page. For material changes, we will provide additional notice, such as an in-app notification or email. We encourage you to review this Privacy Policy periodically. Your continued use of the Service after any modification constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">15. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us. We will make reasonable efforts to address your inquiry promptly.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
