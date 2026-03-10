export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: March 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Evo Associates Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Evo Associates (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your personal information.
              This Privacy Policy explains what data we collect, how we use it, and your rights as a user of
              the Evo AI Assistant platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-foreground mb-2">Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Account registration details (name, email address, organization)</li>
              <li>Subscription and billing information (processed by a third-party payment provider)</li>
              <li>Communications you send to us (support requests, feedback)</li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">
              Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Usage data (features accessed, session duration, interaction patterns)</li>
              <li>Device and browser information</li>
              <li>IP address and general location data</li>
              <li>
                Cookies and similar tracking technologies (see our Cookie policy in the Terms of Service)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
              <li>Deliver and improve the Evo AI Assistant platform and its features</li>
              <li>Process subscriptions and manage your account</li>
              <li>Personalize your experience based on usage patterns</li>
              <li>Respond to support inquiries and communications</li>
              <li>Conduct internal research to develop our complexity science methodology</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal data to third parties. We do not use your prompts or AI interactions
              to train external models without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. AI Interactions &amp; Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Content you submit to the Evo AI Assistant (such as descriptions of team challenges or leadership
              situations) is processed to generate AI responses. This content may be stored temporarily to
              maintain session context and improve response quality. We treat your submissions as confidential
              and do not share them with other users or external parties.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              If you are a Pro or Enterprise subscriber, extended conversation history may be retained to enable
              continuity across sessions. You can delete this history at any time from your account settings.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <span className="font-semibold">Accuracy of AI Responses:</span> The Evo AI Assistant generates responses based on complexity
              science frameworks and the information you provide. While we design the assistant to deliver
              thoughtful, methodology-grounded analysis, AI-generated responses may not always be complete,
              accurate, or applicable to your specific situation. Responses should be used as a starting point for
              reflection and dialogue, not as a substitute for professional judgment. Evo Associates is not liable
              for decisions made in reliance on AI-generated content.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <span className="font-semibold">Model Training &amp; Improvement:</span> Conversation data submitted to the Evo AI Assistant is
              processed by Anthropic via their API and is not used by Anthropic to train AI models by default.
              Evo Associates does not use your conversation content to train AI models. We may use
              anonymized, aggregated insights from platform interactions to improve our methodology and
              product features. This data cannot be traced back to individual users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share your information only in the following limited circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
              <li>
                <span className="font-semibold">Service Providers:</span> Trusted third parties who assist in operating our platform (e.g., hosting,
                payment processing, analytics), bound by confidentiality agreements.
              </li>
              <li>
                <span className="font-semibold">Legal Requirements:</span> When required by law, regulation, or valid legal process.
              </li>
              <li>
                <span className="font-semibold">Business Transfers:</span> In the event of a merger, acquisition, or sale of assets, your data may
                transfer to the successor entity, subject to the same protections.
              </li>
              <li>
                <span className="font-semibold">With Your Consent:</span> For any other purpose, only with your explicit permission.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <span className="font-semibold">Subprocessors:</span> We work with the following third-party subprocessors to deliver the platform.
              Each is bound by data protection obligations consistent with this policy:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-6 mt-2">
              <li>Anthropic - AI response generation (API) – United States</li>
              <li>Render - Hosting and deployment services – United States</li>
              <li>Pinecone - Vector Database – United States</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide our
              services. You may request deletion of your account and associated data at any time. Certain data
              may be retained for a limited period thereafter to comply with legal obligations or resolve disputes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
              <li>Access: Request a copy of the personal data we hold about you.</li>
              <li>Correction: Request correction of inaccurate or incomplete data.</li>
              <li>Deletion: Request deletion of your data, subject to legal retention requirements.</li>
              <li>Portability: Receive your data in a structured, machine-readable format.</li>
              <li>Objection: Object to certain processing activities, including direct marketing.</li>
              <li>
                Withdrawal of Consent: Where processing is based on consent, withdraw it at any time.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at: mmorand@evoassociates.com. We will respond
              within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in
              transit and at rest, access controls, and regular security reviews. No system is completely immune
              to risk, but we take reasonable and appropriate steps to safeguard your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Evo AI Assistant is intended for professional use and is not directed at individuals under the
              age of 18. We do not knowingly collect personal data from minors. If you believe we have
              inadvertently collected such data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. International Users</h2>
            <p className="text-muted-foreground leading-relaxed">
              Evo Associates is based in the United States. Our platform is currently designed for use by
              US-based professionals. If you are accessing our platform from outside the U.S., please be aware
              that your data will be transferred to and processed in the United States.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As we expand to serve international users, we will update this policy to reflect applicable data
              transfer mechanisms, including Standard Contractual Clauses where required.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              email or through a prominent notice on the platform. Continued use of the platform after changes
              take effect constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions, concerns, or requests regarding this Privacy Policy, please contact:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Evo Associates
              <br />
              Email: <a href="mailto:mmorand@evoassociates.com">mmorand@evoassociates.com</a>
              <br />
              Website:{" "}
              <a
                href="https://app.evoassociates.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://app.evoassociates.com/
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex justify-end">
            <a 
              href="/terms-of-use" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View Terms of Use →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
