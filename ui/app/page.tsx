import React from "react";
import { ArrowRight, Sparkles, Film, BookOpen, Trophy, Scissors, Music, Image, Palette, Sliders, GitMerge, Layers, Volume2, VolumeX, Maximize2, RefreshCw, Package, Captions, Eye, Tag, RotateCw, Zap } from "lucide-react";
import Link from "next/link";

import Navbar from "@/components/navbar";

const LandingPage = () => {
  return (
    <div
      className="font-inter bg-gray-900 min-h-screen relative overflow-hidden"
    >
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="pt-24 pb-16">
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-6 animate-fadeInUp">
              <div className="inline-flex items-center bg-pink-600/20 text-pink-300 rounded-full px-4 py-2 text-sm font-medium border border-pink-500/30">
                <Film className="w-4 h-4 mr-2" />
                Professional Video Editing Platform
                <span className="ml-2 px-2 py-0.5 bg-pink-500/40 text-pink-200 rounded-full text-xs">
                  v1.0
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-bold text-gray-100">
                Welcome to{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300">
                  Clipzy Studio
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                An all-in-one video editing platform featuring intelligent highlight extraction, 
                auto-zoom focus effects, AI video generation, and 15+ professional editing tools.
              </p>
              
              <Link href="/start" className="flex justify-center gap-4 mt-8">
                <button className="rounded-full px-8 py-4 text-lg gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white inline-flex items-center font-semibold shadow-lg hover:shadow-pink-500/50 transition-all duration-300">
                  Start Editing <ArrowRight className="ml-2" size={20} />
                </button>
              </Link>
            </div>

            {/* Core Features Section */}
            <div className="mt-32">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-100 mb-3">Main Features</h2>
                <p className="text-gray-400">Powerful AI-driven tools for video creation</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                {[
                  {
                    icon: BookOpen,
                    title: "Lecture / Podcast Highlights",
                    description: "Extract key moments from lectures and podcasts automatically using Whisper transcription and AI selection.",
                    color: "from-indigo-500 to-blue-500"
                  },
                  {
                    icon: Trophy,
                    title: "Sports Highlights",
                    description: "Detect crowd cheering and exciting moments from sports videos automatically using audio energy analysis.",
                    color: "from-orange-500 to-red-500"
                  },
                  {
                    icon: Sparkles,
                    title: "Hashtag Recommender",
                    description: "Get smart hashtag recommendations for any video to maximize reach and engagement.",
                    color: "from-purple-500 to-pink-500"
                  },
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="group p-6 rounded-2xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/60 hover:border-gray-500/50 transition-all duration-300"
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-100">{feature.title}</h3>
                        {feature.comingSoon && (
                          <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-full text-xs font-semibold border border-purple-500/50">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video Tools Section */}
            <div className="mt-32">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-100 mb-3">Professional Tools</h2>
                <p className="text-gray-400">15+ powerful utilities for complete video control</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { name: "Extract Audio", Icon: Music },
                  { name: "Remove Audio", Icon: VolumeX },
                  { name: "Trim Video", Icon: Scissors },
                  { name: "Merge Videos", Icon: GitMerge },
                  { name: "Split Video", Icon: Layers },
                  { name: "Change Format", Icon: RefreshCw },
                  { name: "Change Resolution", Icon: Maximize2 },
                  { name: "Add Watermark", Icon: Tag },
                  { name: "Compress Video", Icon: Package },
                  { name: "Slow Motion", Icon: Zap },
                  { name: "Thumbnail Generator", Icon: Image },
                  { name: "Create Captions", Icon: Captions },
                  { name: "Music Recommender", Icon: Eye },
                  { name: "Background Blur", Icon: Sliders },
                  { name: "Rotate / Flip", Icon: RotateCw },
                ].map((tool, index) => {
                  const IconComponent = tool.Icon;
                  
                  return (
                    <div
                      key={index}
                      className="group p-6 rounded-xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/60 hover:border-gray-500/50 transition-all duration-300 text-center h-full"
                    >
                      <div className="flex justify-center mb-3 group-hover:scale-125 transition-transform duration-300">
                        <IconComponent size={28} className="text-pink-400 group-hover:text-pink-300" />
                      </div>
                      <p className="text-gray-300 font-medium text-sm group-hover:text-pink-300 transition-colors">{tool.name}</p>
                      {index >= 11 && (
                        <p className="text-gray-500 text-xs mt-2 font-medium">Still working</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Why Choose Section */}
            <div className="mt-32">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-100 mb-3">Why Choose Clipzy Studio?</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    emoji: "🚀",
                    title: "Lightning Fast",
                    description: "Process videos in minutes, not hours with AI acceleration"
                  },
                  {
                    emoji: "🎯",
                    title: "AI-Powered",
                    description: "Intelligent detection and smart processing for professional results"
                  },
                  {
                    emoji: "✨",
                    title: "Studio Quality",
                    description: "Create broadcast-quality content from your bedroom"
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-2xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/60 transition-all duration-300 text-center group cursor-pointer"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">{item.emoji}</div>
                    <h4 className="font-bold text-gray-100 mb-2">{item.title}</h4>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm mt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <Film className="w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-lg p-1" />
                  Clipzy Studio
                </h3>
                <p className="text-gray-400">
                  Professional video editing platform powered by AI
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">
                  © 2024 Clipzy Studio. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
