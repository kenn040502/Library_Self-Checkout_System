"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpenIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import BlurFade from "@/app/ui/magicUi/blurFade";
import ShimmerButton from "@/app/ui/magicUi/shimmerButton";
import GlassCard from "@/app/ui/magicUi/glassCard";
import { unstable_noStore as noStore } from 'next/cache';

export default function HomePage() {
  noStore();

  return (
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-canvas text-ink transition-colors dark:bg-dark-canvas dark:text-on-dark">
      <title>Home Page</title>

      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://www.swinburne.edu.my/online-application-form/img/header-bg.jpg"
          alt="background"
          fill
          sizes="100vw"
          priority
          className="
            object-cover
            blur-[2px] brightness-[0.6]
            md:scale-105 md:blur-sm md:brightness-100
            md:grayscale-[20%]
            transition-all duration-1000
          "
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
      </div>

      {/* Header */}
      <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between px-5 py-4 md:px-8 md:py-6">
        <BlurFade delay={0.1} yOffset={-10}>
          <Link href="/">
            <img
              src="https://www.swinburne.edu.my/wp-content/themes/mytheme-2021/images/logo-long-full.svg"
              alt="Swinburne Logo"
              className="h-8 md:h-10 w-auto"
            />
          </Link>
        </BlurFade>

        <BlurFade delay={0.2} yOffset={-10}>
          <Link href="/login">
            <ShimmerButton
              className="h-9 px-4 text-xs md:h-10 md:px-6 md:text-sm shadow-lg"
              borderRadius="999px"
            >
              Log In
            </ShimmerButton>
          </Link>
        </BlurFade>
      </header>

      {/* Main content */}
      <section className="relative z-10 flex flex-grow items-center justify-center px-6 text-center">
        <GlassCard
          intensity="medium"
          className="
            w-full max-w-sm p-8
            md:max-w-4xl md:p-16
            border-white/10 bg-black/20
            shadow-2xl backdrop-blur-xl
          "
        >
          {/* Icon */}
          <BlurFade delay={0.3}>
            <div className="mb-4 md:mb-6 flex justify-center">
              <div className="rounded-full bg-swin-red/20 p-3 md:p-4 ring-1 ring-swin-red/50">
                <BookOpenIcon className="h-10 w-10 md:h-12 md:w-12 text-swin-red" />
              </div>
            </div>
          </BlurFade>

          {/* Title */}
          <BlurFade delay={0.4}>
            <h1 className="mb-3 md:mb-6 text-xl md:text-6xl font-bold tracking-tight text-white">
              Swinburne Library 
                <br/>
              Self-Checkout
            </h1>
          </BlurFade>

          {/* Description */}
          <BlurFade delay={0.5}>
            <p className="mx-auto mb-6 md:mb-10 max-w-2xl text-sm md:text-xl text-white/80">
              Borrow and return books anytime with your device 
              <br/>
              fast, secure, and kiosk-free.
            </p>
          </BlurFade>

          {/* Actions */}
          <BlurFade delay={0.6}>
            <div className="flex flex-col gap-3 md:flex-row md:justify-center md:gap-4">
              <Link href="/login" className="w-full md:w-auto">
                <ShimmerButton className="h-12 md:h-14 w-full md:w-auto px-8 text-base md:text-lg font-semibold shadow-xl shadow-swin-red/20">
                  <span className="flex items-center justify-center gap-2">
                    Get Started <ArrowRightIcon className="h-4 w-4 md:h-5 md:w-5" />
                  </span>
                </ShimmerButton>
              </Link>

              <Link
                href="https://www.swinburne.edu.my/category/library/"
                target="_blank"
                className="
                  flex h-12 md:h-14 w-full md:w-auto
                  items-center justify-center
                  rounded-full border border-white/20
                  bg-white/5 px-8
                  text-sm md:text-lg font-medium text-white
                  backdrop-blur-sm transition
                  hover:bg-white/10 hover:scale-105
                  active:scale-95
                "
              >
                Learn More
              </Link>
            </div>
          </BlurFade>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-4 md:bottom-6 left-0 w-full text-center z-10">
        <BlurFade delay={0.8}>
          {/* Footer link to About page */}
          <p
            className="
              text-[10px] md:text-xs
              text-white/50
              transition
              underline-offset-4
            "
          >
            © 2026 Swinburne Final Year Project • Group 12
          </p>
        </BlurFade>
      </footer>

    </main>
  );
}
