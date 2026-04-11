'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsDialogProps {
  title: string;
  isInSidebar?: boolean;
}

export function TermsDialog({ title, isInSidebar = true }: TermsDialogProps) {
  const TriggerComponent = isInSidebar ? (
    <SidebarMenuButton size="sm" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
      <FileText className="h-4 w-4" />
      <span className="text-xs">{title}</span>
    </SidebarMenuButton>
  ) : (
    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">{title}</button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{TriggerComponent}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>Last updated: April 5, 2026</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p>
                By accessing and using AutoExec (&quot;the Service&quot;), you accept and agree to be bound by these
                Terms of Service. If you do not agree to these terms, do not use the Service. These terms apply to all
                users of the platform, including administrators, managers, and clients.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Description of Service</h3>
              <p>
                AutoExec is a web-based dashboard and analytics platform that provides workflow management, client
                management, document processing, and reporting tools integrated with n8n workflow automation. The
                Service allows users to manage chat workflows, trigger workflow executions, upload and process documents
                for AI-powered knowledge bases, and view analytics and execution history.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. User Accounts and Registration</h3>
              <p>
                To access the Service, you must create an account with accurate information. You are responsible for
                maintaining the confidentiality of your account credentials and for all activities under your account.
                Users must verify their email address before accessing the Service.
              </p>
              <p className="mt-2">
                The platform uses a role-based access system with three roles: Admin (full access), Manager
                (company-scoped access), and Client (limited to their own company&apos;s resources). The platform
                operator assigns roles at their discretion.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Acceptable Use</h3>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction regarding online conduct</li>
                <li>Upload or transmit viruses, malware, or other harmful code</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or servers connected to it</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Misuse workflow execution features or overload n8n integrations</li>
                <li>Upload content that infringes on intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Intellectual Property</h3>
              <p>
                The AutoExec platform, including its design, code, and content, is owned by the platform operator and is
                protected by intellectual property laws. You retain ownership of any data, documents, or content you
                upload to the Service (&quot;User Content&quot;). By uploading User Content, you grant us a license to
                process, store, and use it as necessary to provide the Service.
              </p>
              <p className="mt-2">
                Workflow configurations and n8n integrations are owned by the respective users or their organizations,
                subject to the permissions granted by the role-based access system.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Document Processing and AI Features</h3>
              <p>
                The Service includes document processing capabilities where uploaded files are analyzed, chunked, and
                processed with OpenAI embeddings to enable AI-powered knowledge base search. Documents are stored
                securely in Supabase storage and processed according to the Privacy Policy.
              </p>
              <p className="mt-2">
                AI-generated responses and embeddings are provided by OpenAI and are subject to OpenAI&apos;s terms of
                service in addition to these Terms of Service.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Third-Party Services</h3>
              <p>The Service integrates with and depends on third-party services:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong>Supabase</strong> — Database, authentication, and file storage
                </li>
                <li>
                  <strong>OpenAI</strong> — Text embeddings for knowledge base processing
                </li>
                <li>
                  <strong>n8n</strong> — Workflow automation engine (operated separately by users)
                </li>
                <li>
                  <strong>Google</strong> — Optional OAuth sign-in provider
                </li>
              </ul>
              <p className="mt-2">
                We are not responsible for the availability, accuracy, or practices of these third-party services. Their
                use is subject to their respective terms and privacy policies.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Data Storage and Security</h3>
              <p>
                The platform uses Supabase for data storage with Row Level Security (RLS) policies and role-based access
                controls. While we implement security measures to protect your data, no method of electronic storage or
                transmission over the internet is completely secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Disclaimer of Warranties</h3>
              <p>
                THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF
                ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY.
              </p>
              <p className="mt-2">
                We do not warrant that the Service will be uninterrupted, secure, or error-free. We do not warrant that
                the results obtained from the Service will meet your requirements or that AI-generated outputs will be
                accurate, reliable, or suitable for your needs.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL AutoExec OR ITS OPERATORS BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF
                PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OR INABILITY TO USE
                THE SERVICE.
              </p>
              <p className="mt-2">
                Our total liability shall not exceed the amount you paid us (if any) in the twelve (12) months preceding
                the event giving rise to the liability.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">11. Account Termination</h3>
              <p>
                We reserve the right to suspend, terminate, or restrict your account at any time, with or without
                notice, for any reason including but not limited to violation of these Terms, fraudulent activity, or
                behavior that threatens the security or integrity of the Service.
              </p>
              <p className="mt-2">
                Upon termination, your right to use the Service ceases immediately. Data associated with your account
                will be handled according to our data retention practices described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">12. Modifications to Terms</h3>
              <p>
                We reserve the right to modify these Terms of Service at any time. Changes will be effective upon
                posting to the platform. Continued use of the Service after changes constitutes acceptance of the
                modified terms. We will make reasonable efforts to notify users of significant changes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">13. Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with applicable laws, without regard to its
                conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be
                resolved through binding arbitration or in courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">14. Contact Information</h3>
              <p>If you have any questions about these Terms of Service, please contact the platform administrator.</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
