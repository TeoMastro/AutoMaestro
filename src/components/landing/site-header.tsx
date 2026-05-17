import Link from 'next/link';
import Image from 'next/image';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import MobileNavigation from '@/components/landing/mobile-navigation';
import { APP_NAME, GITHUB_REPO_URL } from '@/lib/constants';

const navigationItems = [
  { title: 'Features', href: '#features' },
  { title: 'Open Source', href: '#open-source' },
  { title: 'FAQ', href: '#faq' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/AutoMaestro-logo.png"
            alt={`${APP_NAME} logo`}
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-bold text-lg tracking-tight">{APP_NAME}</span>
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.title}>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
            <NavigationMenuItem>
              <Button asChild variant="ghost" size="sm" aria-label="GitHub">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button asChild size="sm">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <MobileNavigation navigationItems={navigationItems} />
      </div>
    </header>
  );
}
