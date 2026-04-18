import Link from 'next/link';
import { Zap } from 'lucide-react';
import { PrivacyPolicyDialog } from '@/components/legal/privacy-policy-dialog';
import { TermsDialog } from '@/components/legal/terms-dialog';
import { APP_NAME } from '@/lib/constants';

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
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
              <PrivacyPolicyDialog title="Privacy Policy" isInSidebar={false} />
              <TermsDialog title="Terms of Service" isInSidebar={false} />
            </div>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/auth/signin" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
