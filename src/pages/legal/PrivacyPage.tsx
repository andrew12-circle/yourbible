import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { APP_NAME } from "@/lib/appBrand";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p><strong>Last updated:</strong> June 2026</p>
      <p>
        {APP_NAME} (&quot;we,&quot; &quot;us&quot;) helps you read Scripture, journal, and map your faith framework.
        This policy describes what we collect during the private beta and how we use it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account info:</strong> email, display name, profile photo, and preferences you set in Settings.</li>
        <li><strong>Your content:</strong> journal entries, beliefs, highlights, notes, bookmarks, artifacts, AI chat history, and other data you create in the app.</li>
        <li><strong>Usage data:</strong> AI feature usage (model, tokens, estimated cost) stored to show you usage in Settings and to operate the service.</li>
        <li><strong>Optional context:</strong> location or weather on journal entries if you enable those features; partner connection metadata if you use Walking Together.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use your data to provide and improve {APP_NAME}, personalize AI responses grounded in your content,
        sync across devices, and support you during beta. We do not sell your personal data.
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li><strong>Supabase</strong> — authentication, database, file storage, and edge functions.</li>
        <li><strong>Google Gemini / OpenAI</strong> — AI features (chat, study, analysis) when you use them.</li>
        <li><strong>API.Bible</strong> — Scripture text for reading and search.</li>
        <li><strong>ElevenLabs</strong> — optional sleep narration and voice features.</li>
        <li><strong>Google Maps</strong> — optional journal map views (if configured).</li>
        <li><strong>Sentry</strong> — optional error reporting to fix bugs (no journal content in crash reports by default).</li>
      </ul>

      <h2>End-to-end journal encryption</h2>
      <p>
        When you enable journal encryption in Settings → Journal privacy, title, body, and summary are
        encrypted on your device with AES-256-GCM before sync. We store only a wrapped key — not your
        PIN or recovery key. Dictation formatting runs entirely on your device (no AI). Encrypted entries are excluded
        from server search, mirror scoring, and My AI retrieval.
      </p>

      <h2>Retention & deletion</h2>
      <p>
        Beta data is kept while your account is active. You may export journal entries from Settings.
        To delete your account, use <strong>Settings → Profile → Delete account</strong>, or email{" "}
        <a href="mailto:support@beliefarchitecture.app">support@beliefarchitecture.app</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:support@beliefarchitecture.app">support@beliefarchitecture.app</a>
      </p>
    </LegalPageLayout>
  );
}
