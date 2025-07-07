import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ArrowLeft, Upload, Bot, Brain, Workflow, Users, MessageSquare, Mic, FileAudio, FileText, BarChart3, TrendingUp } from 'lucide-react';

interface FeatureHeroProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  backHref?: string;
  backText?: string;
  primaryButton?: {
    text: string;
    href: string;
    icon?: React.ReactNode;
  };
  secondaryButton?: {
    text: string;
    href: string;
    icon?: React.ReactNode;
  };
}

export default function FeatureHero({
  title,
  description,
  icon,
  gradient,
  backHref = "/",
  backText = "홈으로",
  primaryButton,
  secondaryButton
}: FeatureHeroProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative">
      <div className="w-full flex justify-between items-center px-4 pt-4">
        {backHref && (
          <Link href={backHref} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backText}
          </Link>
        )}
        <LanguageSwitcher />
      </div>
      
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className={`
              text-6xl p-6 rounded-full bg-gradient-to-br ${gradient} 
              text-white shadow-2xl
              animate-pulse
            `}>
              {icon}
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
            {title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
          {(primaryButton || secondaryButton) && (
            <div className="flex justify-center space-x-4">
              {primaryButton && (
                <Link href={primaryButton.href}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                    {primaryButton.icon && <span className="mr-2">{primaryButton.icon}</span>}
                    {primaryButton.text}
                  </Button>
                </Link>
              )}
              {secondaryButton && (
                <Link href={secondaryButton.href}>
                  <Button size="lg" variant="outline" className="shadow-lg">
                    {secondaryButton.icon && <span className="mr-2">{secondaryButton.icon}</span>}
                    {secondaryButton.text}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 