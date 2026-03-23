"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Zap, Sparkles, Wrench, ArrowRight, Scissors, GitMerge, Layers, Music, Tag, VolumeX, Maximize2, RefreshCw, Package, Captions, Eye, Image, Sliders, RotateCw, BookOpen, Trophy, Film } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";

const StartEditingPage = () => {
  const router = useRouter();

  const features = [
    {
      id: "lecture",
      title: "Lecture Highlights",
      subtitle: "AI Transcript",
      description: "Extract key moments from lectures and podcasts using Whisper + Claude AI",
      icon: BookOpen,
      href: "/innerpage/lecture",
      color: "from-indigo-500 to-blue-500",
      stats: "New"
    },
    {
      id: "hashtag",
      title: "Hashtag Recommender",
      subtitle: "AI Powered",
      description: "Get smart hashtag recommendations for any video to boost reach",
      icon: Sparkles,
      href: "/innerpage/hashtag",
      color: "from-purple-500 to-pink-500",
      stats: "New"
    },
    {
      id: "sports",
      title: "Sports Highlights",
      subtitle: "Audio Energy",
      description: "Detect crowd cheering and exciting moments from sports videos automatically",
      icon: Trophy,
      href: "/innerpage/sports",
      color: "from-orange-500 to-red-500",
      stats: "New"
    },
    {
      id: "sports-highlight",
      title: "Large Video Highlights",
      subtitle: "Chunked Analysis",
      description: "Analyse large sports videos by chunking with overlap — RMS & frequency-based detection",
      icon: Film,
      href: "/innerpage/sports-highlight",
      color: "from-emerald-500 to-teal-500",
      stats: "New"
    },
    {
      id: "tools",
      title: "Tools",
      subtitle: "Utilities",
      description: "Advanced editing tools for fine-grained control",
      icon: Wrench,
      href: "#professional-tools",
      color: "from-orange-500 to-yellow-500",
      stats: "Explore",
      scrollTo: "professional-tools",
    },
  ];

  return (
    <div className="font-inter bg-gray-900 min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
      </div>

      <Navbar />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-100">
              Create Professional
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300">
                Videos in Minutes
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Choose your AI-powered tool and start transforming your content
            </p>
          </div>
        </div>

        {/* Features Grid - 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isDisabled = feature.disabled;

            const handleClick = (e: React.MouseEvent) => {
              if (feature.scrollTo) {
                e.preventDefault();
                const element = document.getElementById(feature.scrollTo);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }
            };

            const cardContent = (
                <div
                  className={`group relative h-full rounded-2xl overflow-hidden transition-all duration-500 ${
                    isDisabled ? "opacity-50" : "hover:shadow-2xl hover:-translate-y-2 cursor-pointer"
                  }`}
                >
                  {/* Gradient Border */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl`}
                  />

                  {/* Glass Effect Background */}
                  <div className="absolute inset-0 bg-gray-700/40 backdrop-blur-xl rounded-2xl border border-gray-600/50" />

                  {/* Border Glow */}
                  <div
                    className={`absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br ${feature.color} bg-clip-border opacity-0 group-hover:opacity-40 transition-opacity duration-500`}
                  />

                  {/* Content */}
                  <div className="relative p-6 flex flex-col h-full">
                    {/* Icon Circle */}
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 bg-gradient-to-br ${feature.color} shadow-lg mb-4`}
                    >
                      <Icon size={28} className="text-white" />
                    </div>

                    {/* Title & Subtitle */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-100 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        {feature.subtitle}
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-700/30">
                      <span
                        className={`text-xs font-bold ${
                          isDisabled
                            ? "text-gray-500"
                            : `bg-clip-text text-transparent bg-gradient-to-r ${feature.color}`
                        }`}
                      >
                        {feature.stats}
                      </span>

                      {!isDisabled && (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-600/40 backdrop-blur-sm border border-gray-500/50 group-hover:bg-gray-600/60 transition-all duration-300 font-medium text-xs text-gray-100">
                          Start
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}

                      {feature.scrollTo && (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-600/40 backdrop-blur-sm border border-gray-500/50 group-hover:bg-gray-600/60 transition-all duration-300 font-medium text-xs text-gray-100">
                          View
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}

                      {isDisabled && !feature.scrollTo && (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-600/20 backdrop-blur-sm border border-gray-500/30 font-medium text-xs text-gray-500">
                          Soon
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Glow */}
                  {!isDisabled && (
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-br ${feature.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500 -z-10`}
                    />
                  )}
                </div>
            );

            if (isDisabled || !feature.href) {
              return (
                <div key={feature.id}>
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={feature.id}
                href={feature.href}
                onClick={handleClick}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>

        {/* Professional Tools Section */}
        <div id="professional-tools" className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-100 mb-3">Professional Tools</h2>
            <p className="text-gray-400">15+ powerful utilities for complete video control</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: "Extract Audio", Icon: Music, href: "/innerpage/extract" },
              { name: "Remove Audio", Icon: VolumeX, href: "/innerpage/remove" },
              { name: "Trim Video", Icon: Scissors, href: "/innerpage/trim" },
              { name: "Merge Videos", Icon: GitMerge, href: "/tools/mergevideos" },
              { name: "Split Video", Icon: Layers, href: "/tools/split" },
              { name: "Change Format", Icon: RefreshCw, href: "/tools/change-format" },
              { name: "Change Resolution", Icon: Maximize2, href: "/tools/change-resolution" },
              { name: "Add Watermark", Icon: Tag, href: "/tools/watermark" },
              { name: "Compress Video", Icon: Package, href: "/tools/compress" },
              { name: "Slow Motion", Icon: Zap, href: "/tools/slowmotion" },
              { name: "Thumbnail Generator", Icon: Image, href: "/tools/thumbnail" },
              { name: "Create Captions", Icon: Captions },
              { name: "Music Recommender", Icon: Eye },
              { name: "Background Blur", Icon: Sliders },
              { name: "Rotate / Flip", Icon: RotateCw },
            ].map((tool, index) => {
              const IconComponent = tool.Icon;
              const isClickable = Boolean(tool.href);

              return (
                <div
                  key={index}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={isClickable ? () => router.push(tool.href as string) : undefined}
                  onKeyDown={
                    isClickable
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(tool.href as string);
                          }
                        }
                      : undefined
                  }
                  className={`group p-6 rounded-xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 transition-all duration-300 text-center ${
                    isClickable
                      ? "cursor-pointer hover:bg-gray-700/60 hover:border-gray-500/50"
                      : "opacity-70"
                  }`}
                >
                  <div className="flex justify-center mb-3 group-hover:scale-125 transition-transform duration-300">
                    <IconComponent size={28} className="text-pink-400 group-hover:text-pink-300" />
                  </div>
                  <p className="text-gray-300 font-medium text-sm group-hover:text-pink-300 transition-colors">{tool.name}</p>
                  {!isClickable && (
                    <p className="text-gray-500 text-xs mt-2 font-medium">Still working</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </main>

        {/* Footer */}
        <footer className="border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-400 text-sm">
            Need help?{" "}
            <a href="#" className="font-semibold text-pink-400 hover:text-pink-300 transition-colors">
              Docs
            </a>
            {" • "}
            <a href="#" className="font-semibold text-pink-400 hover:text-pink-300 transition-colors">
              Support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StartEditingPage;
