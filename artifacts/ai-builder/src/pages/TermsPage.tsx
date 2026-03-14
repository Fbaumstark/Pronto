import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { ProntoLogoMark, ProntoTagline } from "@/components/ProntoLogo";

export default function TermsPage() {
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
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: March 14, 2026 &nbsp;·&nbsp; Effective immediately upon account creation
        </p>

        <div className="prose prose-invert max-w-none space-y-10 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By creating an account, accessing, or using Pronto ("the Service," "we," "us," or "our"), you ("User," "you," or "your") agree to be bound by these Terms of Service ("Terms") in their entirety. If you do not agree to every provision of these Terms, you must not access or use the Service. These Terms constitute a legally binding agreement between you and Pronto. We reserve the right to update these Terms at any time; continued use of the Service after any modification constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. USE AT YOUR OWN RISK</h2>
            <p className="text-muted-foreground uppercase font-semibold mb-2">
              THE SERVICE IS PROVIDED STRICTLY ON AN "AS IS" AND "AS AVAILABLE" BASIS. YOUR USE OF PRONTO IS ENTIRELY AT YOUR OWN RISK.
            </p>
            <p className="text-muted-foreground">
              You expressly acknowledge and agree that: (a) the Service may produce incorrect, incomplete, or harmful code; (b) AI-generated output is not reviewed, validated, or guaranteed to be functional, secure, or fit for any particular purpose; (c) you are solely responsible for reviewing, testing, and validating any code or content generated through the Service before deploying it in any environment; and (d) you assume full responsibility for any consequences arising from your use of, or reliance on, AI-generated output.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. No Warranty</h2>
            <p className="text-muted-foreground">
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, PRONTO EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-3">
              <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT;</li>
              <li>ANY WARRANTY THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS;</li>
              <li>ANY WARRANTY REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR QUALITY OF ANY AI-GENERATED CODE, CONTENT, OR OUTPUT;</li>
              <li>ANY WARRANTY THAT YOUR DATA WILL BE PRESERVED, BACKED UP, OR RECOVERABLE;</li>
              <li>ANY WARRANTY THAT DEPLOYED APPLICATIONS WILL REMAIN AVAILABLE, FUNCTIONAL, OR ACCESSIBLE AT ANY TIME.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. No Liability for Content, Storage, or Long-Term Function</h2>
            <p className="text-muted-foreground mb-3">
              Pronto is an AI-assisted development platform. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Content Storage:</strong> We do not guarantee the indefinite storage, availability, or integrity of any project files, application data, secrets, or other content you store through the Service. Projects, files, and associated data may be deleted, corrupted, or become inaccessible at any time without notice.</li>
              <li><strong className="text-foreground">Long-Term Function:</strong> We make no representations that deployed applications, published URLs, or custom domain configurations will remain functional, accessible, or available over any period of time. Services may be modified, suspended, or discontinued at any time, with or without notice.</li>
              <li><strong className="text-foreground">AI-Generated Code:</strong> Code generated by the AI may contain security vulnerabilities, bugs, logic errors, patent infringements, or other defects. You are solely responsible for auditing and securing any code before production use.</li>
              <li><strong className="text-foreground">Third-Party Services:</strong> The Service integrates with third-party providers including Anthropic (AI), Stripe (payments), and cloud infrastructure providers. We are not responsible for any disruption, failure, data loss, or policy changes by such third parties.</li>
              <li><strong className="text-foreground">Data Loss:</strong> You acknowledge the risk of data loss and agree to maintain independent backups of all projects, source code, and data. Pronto is not liable for any data loss, however caused.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PRONTO, ITS OWNERS, OFFICERS, EMPLOYEES, AGENTS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES;</li>
              <li>LOSS OF PROFITS, REVENUE, DATA, BUSINESS, GOODWILL, OR ANTICIPATED SAVINGS;</li>
              <li>DAMAGES ARISING FROM UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS OR DATA;</li>
              <li>DAMAGES ARISING FROM THE CONDUCT OF ANY THIRD PARTY ON THE SERVICE;</li>
              <li>DAMAGES ARISING FROM YOUR RELIANCE ON AI-GENERATED CODE OR CONTENT;</li>
              <li>SERVICE INTERRUPTIONS, DOWNTIME, OR LOSS OF AVAILABILITY;</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF PRONTO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. IN ALL CASES, PRONTO'S TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO PRONTO IN THE THREE (3) MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100.00).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. User Responsibilities and Prohibited Conduct</h2>
            <p className="text-muted-foreground mb-3">You agree that you will not use the Service to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Generate, store, or deploy content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable;</li>
              <li>Infringe upon or violate any third party's intellectual property rights, privacy rights, or other proprietary rights;</li>
              <li>Build applications that process personal data of children under 13 without appropriate parental consent mechanisms;</li>
              <li>Attempt to circumvent, disable, or interfere with security features of the Service;</li>
              <li>Use the Service to develop malware, spyware, ransomware, or any software designed to cause harm;</li>
              <li>Reverse engineer, decompile, disassemble, or attempt to discover the source code of the Service;</li>
              <li>Use automated tools to scrape, crawl, or harvest data from the Service without our express written permission;</li>
              <li>Resell or sublicense access to the Service without written authorization;</li>
              <li>Engage in any activity that places an unreasonable load on our infrastructure.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Violation of any of the above may result in immediate termination of your account without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground mb-3">
              <strong className="text-foreground">Your Content:</strong> You retain ownership of any original content you submit to the Service. By using the Service, you grant Pronto a limited, non-exclusive, royalty-free license to process, store, and transmit your content solely to provide and improve the Service.
            </p>
            <p className="text-muted-foreground mb-3">
              <strong className="text-foreground">AI-Generated Output:</strong> Ownership of AI-generated code and content may be subject to applicable law and the terms of the underlying AI provider (Anthropic). You are solely responsible for determining whether you have the right to use, commercialize, or distribute any AI-generated output. Pronto makes no representations regarding the intellectual property status of AI-generated output.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Pronto Platform:</strong> The Service itself, including its software, design, trademarks, and branding, are the exclusive property of Pronto and are protected by applicable intellectual property laws. These Terms grant you no rights in or to the Pronto platform except as explicitly stated herein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Credits, Billing, and Refunds</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Credits are a non-transferable, non-refundable digital resource used to access AI generation and deployment features.</li>
              <li>Free credits granted at signup have no monetary value and cannot be redeemed for cash.</li>
              <li>Paid credits and subscription fees are non-refundable except where required by applicable law.</li>
              <li>We reserve the right to modify credit pricing, subscription rates, and credit values at any time with reasonable notice.</li>
              <li>Auto top-up charges are authorized by you at time of subscription and will be charged automatically when your balance reaches zero.</li>
              <li>We are not responsible for charges resulting from unauthorized use of your account. It is your responsibility to secure your account credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Service Modifications and Termination</h2>
            <p className="text-muted-foreground mb-3">
              Pronto reserves the right, in its sole discretion and at any time, without liability or obligation to you, to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Modify, suspend, or discontinue any part of the Service, temporarily or permanently;</li>
              <li>Change features, credit costs, pricing, or functionality with or without notice;</li>
              <li>Remove or delete any project, deployed application, or stored data;</li>
              <li>Terminate or suspend your account for any reason, including breach of these Terms;</li>
              <li>Impose limits on certain features or restrict access to portions of the Service.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Upon termination, your right to use the Service ceases immediately. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to defend, indemnify, and hold harmless Pronto and its owners, officers, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with: (a) your access to or use of the Service; (b) your violation of these Terms; (c) your violation of any third-party right, including any intellectual property right, privacy right, or proprietary right; (d) any content you submit, generate, store, or deploy through the Service; (e) any application you build and publish through the Service; or (f) any claim that your application caused damage to a third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Dispute Resolution and Arbitration</h2>
            <p className="text-muted-foreground mb-3">
              Any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved exclusively through binding arbitration, except that either party may bring individual claims in small claims court. You waive any right to a jury trial and any right to participate in a class action or class-wide arbitration. The arbitration shall be conducted in accordance with applicable commercial arbitration rules.
            </p>
            <p className="text-muted-foreground">
              NOTWITHSTANDING THE FOREGOING, EITHER PARTY MAY SEEK INJUNCTIVE OR OTHER EQUITABLE RELIEF IN A COURT OF COMPETENT JURISDICTION TO PREVENT ACTUAL OR THREATENED INFRINGEMENT, MISAPPROPRIATION, OR VIOLATION OF INTELLECTUAL PROPERTY RIGHTS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by and construed in accordance with the laws of the United States, without regard to its conflict of law principles. To the extent that any court action is permitted under these Terms, you agree to submit to the personal jurisdiction of the courts located in the United States for the purpose of litigating all such claims.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Security and Secrets</h2>
            <p className="text-muted-foreground">
              The Service offers a Secrets Vault feature allowing you to store API keys and sensitive credentials. While we implement industry-standard encryption (AES-256), we make no guarantee that stored secrets are immune from unauthorized access, breach, or disclosure. You acknowledge that storing sensitive credentials is done at your own risk, and you agree to rotate any compromised credentials immediately. Pronto is not liable for any damages resulting from the compromise of credentials stored in the Secrets Vault.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">14. Deployed Applications</h2>
            <p className="text-muted-foreground">
              Applications published through Pronto are publicly accessible via URLs provided by the Service. You are solely responsible for the content, legality, and functionality of any application you deploy. Pronto may take down any deployed application at its sole discretion for any reason, including but not limited to violations of these Terms, applicable law, or complaints from third parties. Pronto is not responsible for any harm caused to end users of applications you build and deploy through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">15. Entire Agreement and Severability</h2>
            <p className="text-muted-foreground">
              These Terms, together with the Privacy Policy, constitute the entire agreement between you and Pronto regarding the Service and supersede all prior agreements. If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">16. Contact</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us. We will make reasonable efforts to respond within a reasonable timeframe.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
