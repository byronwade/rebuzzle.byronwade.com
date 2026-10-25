/** Static Terms of Service body copy (kept separate so the page stays under the giant-component threshold). */
export const TERMS_SECTIONS = [
  { id: "acceptance-of-terms", title: "Acceptance of terms" },
  { id: "account-creation-and-responsibilities", title: "Account creation and responsibilities" },
  { id: "acceptable-use-policy", title: "Acceptable use policy" },
  { id: "intellectual-property-rights", title: "Intellectual property rights" },
  { id: "service-availability-and-modifications", title: "Service availability and modifications" },
  { id: "user-generated-content", title: "User-generated content" },
  { id: "account-termination", title: "Account termination" },
  { id: "limitation-of-liability", title: "Limitation of liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "dispute-resolution", title: "Dispute resolution" },
  { id: "changes-to-terms", title: "Changes to terms" },
  { id: "severability", title: "Severability" },
  { id: "contact-information", title: "Contact information" },
] as const;

export function TermsBody() {
  return (
    <>
      <section className="legal-section" id="acceptance-of-terms">
        <h2>1. Acceptance of terms</h2>
        <p>
          By accessing or using Rebuzzle ("the Service"), you agree to be bound by these Terms of
          Service ("Terms"). If you disagree with any part of these terms, you may not access the
          Service.
        </p>
      </section>

      <section className="legal-section" id="account-creation-and-responsibilities">
        <h2>2. Account creation and responsibilities</h2>
        <div>
          <div>
            <h3>Account requirements</h3>
            <p>
              To use certain features of the Service, you must create an account. When creating an
              account, you agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Maintain the security of your password</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </div>
          <div>
            <h3>Account eligibility</h3>
            <p>
              You must be at least 13 years old to create an account. By creating an account, you
              represent that you meet this age requirement.
            </p>
          </div>
        </div>
      </section>

      <section className="legal-section" id="acceptable-use-policy">
        <h2>3. Acceptable use policy</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose or in violation of any laws</li>
          <li>Attempt to gain unauthorized access to the Service or related systems</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
          <li>Impersonate any person or entity or misrepresent your affiliation</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Share your account credentials with others</li>
          <li>Attempt to reverse engineer or extract source code from the Service</li>
        </ul>
      </section>

      <section className="legal-section" id="intellectual-property-rights">
        <h2>4. Intellectual property rights</h2>
        <div>
          <div>
            <h3>Our content</h3>
            <p>
              The Service, including all puzzles, content, design, graphics, and software, is owned
              by Rebuzzle and protected by copyright, trademark, and other intellectual property
              laws. You may not copy, modify, distribute, or create derivative works without our
              express written permission.
            </p>
          </div>
          <div>
            <h3>User content</h3>
            <p>
              You retain ownership of any content you submit to the Service. By submitting content,
              you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and
              display your content in connection with the Service.
            </p>
          </div>
        </div>
      </section>

      <section className="legal-section" id="service-availability-and-modifications">
        <h2>5. Service availability and modifications</h2>
        <p>We reserve the right to:</p>
        <ul>
          <li>Modify, suspend, or discontinue the Service at any time</li>
          <li>Update features, content, or functionality</li>
          <li>Perform maintenance that may temporarily interrupt service</li>
          <li>Change pricing or subscription terms with notice</li>
        </ul>
        <p>
          We do not guarantee that the Service will be available at all times or free from errors.
        </p>
      </section>

      <section className="legal-section" id="user-generated-content">
        <h2>6. User-generated content</h2>
        <p>
          If you submit content (comments, solutions, etc.), you are solely responsible for that
          content. You agree that your content:
        </p>
        <ul>
          <li>Does not violate any laws or third-party rights</li>
          <li>Is not offensive, defamatory, or harmful</li>
          <li>Does not contain malware or malicious code</li>
          <li>Is accurate and not misleading</li>
        </ul>
        <p>We reserve the right to remove any content that violates these Terms.</p>
      </section>

      <section className="legal-section" id="account-termination">
        <h2>7. Account termination</h2>
        <div>
          <div>
            <h3>Termination by you</h3>
            <p>
              You may terminate your account at any time by contacting us or using account deletion
              features in your settings.
            </p>
          </div>
          <div>
            <h3>Termination by us</h3>
            <p>We may suspend or terminate your account immediately if you:</p>
            <ul>
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Abuse the Service or other users</li>
              <li>Fail to pay required fees (if applicable)</li>
            </ul>
          </div>
          <div>
            <h3>Effect of termination</h3>
            <p>
              Upon termination, your right to use the Service will immediately cease. We may delete
              your account and associated data, subject to our Privacy Policy and applicable law.
            </p>
          </div>
        </div>
      </section>

      <section className="legal-section" id="limitation-of-liability">
        <h2>8. Limitation of liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
        <ul>
          <li>The Service is provided "as is" and "as available" without warranties of any kind</li>
          <li>
            We disclaim all warranties, express or implied, including merchantability and fitness
            for a particular purpose
          </li>
          <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
          <li>
            Our total liability shall not exceed the amount you paid us in the past 12 months, or
            $100, whichever is greater
          </li>
        </ul>
      </section>

      <section className="legal-section" id="indemnification">
        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Rebuzzle, its officers, directors, employees, and
          agents from any claims, damages, losses, liabilities, and expenses (including legal fees)
          arising from your use of the Service, violation of these Terms, or infringement of any
          rights of another.
        </p>
      </section>

      <section className="legal-section" id="dispute-resolution">
        <h2>10. Dispute resolution</h2>
        <div>
          <div>
            <h3>Governing law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              jurisdiction in which Rebuzzle operates, without regard to conflict of law principles.
            </p>
          </div>
          <div>
            <h3>Dispute process</h3>
            <p>
              If you have a dispute with us, you agree to first contact us to attempt to resolve the
              dispute informally. If we cannot resolve the dispute within 60 days, you agree to
              resolve disputes through binding arbitration or small claims court, as applicable.
            </p>
          </div>
        </div>
      </section>

      <section className="legal-section" id="changes-to-terms">
        <h2>11. Changes to terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify you of material
          changes by posting the updated Terms on this page and updating the "Last updated" date.
          Your continued use of the Service after changes become effective constitutes acceptance of
          the new Terms.
        </p>
      </section>

      <section className="legal-section" id="severability">
        <h2>12. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable or invalid, that provision
          shall be limited or eliminated to the minimum extent necessary, and the remaining
          provisions shall remain in full force and effect.
        </p>
      </section>

      <section className="legal-section" id="contact-information">
        <h2>13. Contact information</h2>
        <p>If you have questions about these Terms, please contact us at:</p>
        <p>
          Email:{" "}
          <a className="text-link underline underline-offset-4" href="mailto:legal@byronwade.com">
            legal@byronwade.com
          </a>
        </p>
      </section>
    </>
  );
}
