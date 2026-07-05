'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Globe,
  Zap,
  MessageCircle,
  Camera,
  History,
  BookOpen,
  Radio,
  Settings,
  Star,
  ArrowRight,
  Menu,
  Smartphone,
  Brain,
  Mic,
  Eye,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.66 },
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  transition: { staggerChildren: 0.14, delayChildren: 0.18 },
};

const floatingAnimation = {
  initial: { y: -8 },
  animate: { y: 8 },
  transition: { duration: 5, repeat: Infinity, repeatType: 'reverse' as const },
};

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      text: 'StreetLingo made travel feel effortless. I could read signs and chat with locals instantly.',
      author: 'Sara Patel',
      role: 'Traveler',
    },
    {
      text: 'The clean interface and smart suggestions made translations feel premium and calm.',
      author: 'Amit Roy',
      role: 'Marketer',
    },
    {
      text: 'I love the pastel UI and smooth experience. It feels modern, gentle, and fast.',
      author: 'Leila Ahmed',
      role: 'Student',
    },
  ];

  const features = [
    { icon: Zap, title: 'Intelligent translation', desc: 'Smart text and phrase translation for every conversation.' },
    { icon: MessageCircle, title: 'Soft transliteration', desc: 'Read local scripts in familiar latin text instantly.' },
    { icon: Camera, title: 'Live scan', desc: 'Capture signs and menus with a calm, responsive scanner.' },
    { icon: Mic, title: 'Voice mode', desc: 'Speak naturally and hear accurate pronunciations.' },
  ];

  const languages = ['Tamil', 'Hindi', 'English', 'French', 'Spanish', 'Gujarati', 'Arabic', 'Chinese'];

  const steps = [
    { num: '01', title: 'Type or scan', desc: 'Enter text, paste a phrase, or snap a photo.', icon: Camera },
    { num: '02', title: 'Choose languages', desc: 'Pick source and target language in one tap.', icon: Globe },
    { num: '03', title: 'Read & speak', desc: 'See instant translations and pronunciation help.', icon: Zap },
  ];

  const historyCards = [
    { title: 'Morning commute', detail: 'Translated street signs and menu items in Chennai.', tag: 'Travel' },
    { title: 'Client meeting', detail: 'Converted mixed English/Hindi notes into clear text.', tag: 'Work' },
    { title: 'Café order', detail: 'Read a local menu and ordered like a local.', tag: 'Everyday' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 text-slate-900 overflow-hidden">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-sky/20 to-brand-lavender/20 border border-slate-200 shadow-sm">
              <Globe className="h-6 w-6 text-brand-sky" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">StreetLingo</p>
              <p className="text-xs text-slate-500">Soft AI translation</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {['Features', 'Languages', 'History', 'About'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-slate-600 hover:text-brand-indigo transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          <button className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-sky/40 hover:text-brand-sky md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {isMenuOpen && (
          <div className="border-t border-slate-200 bg-white/95 px-4 py-4 shadow-soft md:hidden">
            <div className="flex flex-col gap-3">
              {['Features', 'Languages', 'History', 'About'].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="rounded-2xl px-3 py-2 text-slate-700 hover:bg-brand-sky/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="pt-28">
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-sky/15 to-transparent blur-3xl" />
          <div className="absolute right-0 top-10 h-48 w-48 rounded-full bg-brand-lavender/20 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div {...fadeInUp}>
              <p className="mb-4 inline-flex rounded-full bg-brand-mint/15 px-4 py-2 text-sm font-semibold text-brand-mint">
                Calm translation for modern life
              </p>
              <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
                Speak, read, and travel with a gentle AI translator.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                StreetLingo is a premium translation experience with soft pastel visuals, glassmorphism UI, and fluent language support for travel, study, and everyday conversations.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/translate" className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-brand-sky to-brand-indigo px-8 py-4 text-base font-semibold text-white shadow-xl shadow-brand-sky/20 transition hover:-translate-y-0.5">
                  Start translating
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link href="#features" className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-brand-sky/10">
                  View features
                </Link>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Languages</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">18+</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Offline ready</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">Anywhere</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Calm AI</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">Conversational</p>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeInUp} className="relative rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-soft backdrop-blur-xl">
              <div className="absolute -left-10 top-4 h-24 w-24 rounded-full bg-brand-sky/15 blur-3xl" />
              <div className="absolute -right-10 bottom-6 h-28 w-28 rounded-full bg-brand-lavender/10 blur-3xl" />

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Translate</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">English → தமிழ்</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-mint/15 px-3 py-2 text-sm font-semibold text-brand-mint">
                    Live
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <textarea
                    rows={6}
                    className="w-full resize-none rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm outline-none transition focus:border-brand-sky focus:ring-4 focus:ring-brand-sky/10"
                    placeholder="Type a phrase, paste text, or scan an image..."
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white border border-slate-200 p-4">
                      <p className="text-sm text-slate-500">Output</p>
                      <p className="mt-2 text-slate-900">பயணம் மிகவும் எளிதாக உள்ளது.</p>
                    </div>
                    <div className="rounded-3xl bg-white border border-slate-200 p-4">
                      <p className="text-sm text-slate-500">Pronunciation</p>
                      <p className="mt-2 text-slate-900">payanam mikavum elithaga ulladhu.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {['English', 'Tamil', 'Hindi', 'French', 'Arabic', 'Spanish'].slice(0, 3).map((lang) => (
                    <span key={lang} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Designed for calm productivity</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Soft features for smooth multilingual flow.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                A refined translation toolkit with gentle visuals, instant language cards, and clean interactions.
              </p>
            </motion.div>

            <motion.div {...staggerContainer} className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="group rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                    variants={fadeInUp}
                  >
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-sky/10 text-brand-sky">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-slate-600">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="languages" className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Language palette</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Speak and read in every major language.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Soft, elegant language chips let you swap between scripts with ease.
              </p>
            </motion.div>

            <motion.div {...staggerContainer} className="flex flex-wrap justify-center gap-3">
              {languages.map((lang, index) => (
                <motion.span
                  key={index}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky/40 hover:bg-brand-sky/10"
                  variants={fadeInUp}
                >
                  {lang}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="history" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">History</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Your recent translation flow.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Stay organized with glassmorphism history cards that feel calm and premium.
              </p>
            </motion.div>

            <motion.div {...staggerContainer} className="grid gap-6 lg:grid-cols-3">
              {historyCards.map((item, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className="inline-flex rounded-full bg-brand-lavender/15 px-3 py-1 text-sm font-semibold text-brand-indigo">
                    {item.tag}
                  </span>
                  <h3 className="mt-6 text-2xl font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-4 text-slate-600">{item.detail}</p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                    <History className="h-4 w-4 text-brand-sky" />
                    Full record available
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="mb-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Process</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Translate in three calm steps.
              </h2>
            </motion.div>

            <motion.div {...staggerContainer} className="grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                  >
                    <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-sky/10 text-brand-sky">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{step.num}</div>
                    <h3 className="mt-4 text-2xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-3 text-slate-600">{step.desc}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">About StreetLingo</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                  Premium translation with a calm modern feel.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  StreetLingo blends elegant UI, gentle motion, and AI-native language support so users feel relaxed while translating conversations, signs, and everyday text.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {['Instant sign translation', 'Phrasebook & pronunciation', 'Offline mode', 'Context-aware meaning'].map((item) => (
                  <div key={item} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{item}</p>
                    <p className="mt-3 text-slate-600">A thoughtful feature designed for calm, confident translations.</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-12 shadow-soft">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Get started</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                  A calm interface for every language journey.
                </h2>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  Move from text to speech with style, use history cards to stay organized, and enjoy a soft modern UI for translation that feels premium.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
                <Link href="/translate" className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-brand-sky to-brand-indigo px-8 py-4 text-base font-semibold text-white shadow-xl shadow-brand-sky/20 transition hover:-translate-y-0.5">
                  Try it now
                </Link>
                <Link href="#about" className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-brand-sky/10">
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
