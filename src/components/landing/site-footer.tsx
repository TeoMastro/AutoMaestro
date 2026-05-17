import Link from 'next/link';
import { Github, Zap } from 'lucide-react';
import { PrivacyPolicyDialog } from '@/components/legal/privacy-policy-dialog';
import { TermsDialog } from '@/components/legal/terms-dialog';
import { APP_NAME, GITHUB_REPO_URL, GITHUB_WORKFLOWS_REPO_URL } from '@/lib/constants';

export function SiteFooter() {
  return (
    <footer className="w-full border-t">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Zap className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">{APP_NAME}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {APP_NAME}. Open source, GPL-3.0 licensed.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
              <PrivacyPolicyDialog title="Privacy Policy" isInSidebar={false} />
              <TermsDialog title="Terms of Service" isInSidebar={false} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#open-source" className="hover:text-foreground transition-colors">
              Open Source
            </Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              Frontend
            </a>
            <a
              href={GITHUB_WORKFLOWS_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              Workflows
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
