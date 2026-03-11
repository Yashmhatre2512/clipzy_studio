"use client";

import React from "react";
import { ArrowLeft, Film, Users, Target, Heart, Zap, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";

const AboutUsPage = () => {
  const router = useRouter();

  return (
    <div className="font-inter bg-gray-900 min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="pt-32 pb-16">
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 font-medium group mb-8"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Back
            </button>

            {/* Hero Section */}
            <div className="text-center mb-16 space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-100">
                About
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300">
                  Clipzy Studio
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Empowering creators with intelligent video editing tools
              </p>
            </div>

            {/* Main Content */}
            <div className="space-y-16">
              {/* Mission Section */}
              <div className="bg-gray-700/30 backdrop-blur-sm rounded-3xl border border-gray-600/50 p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center flex-shrink-0">
                    <Target size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-100 mb-4">Our Mission</h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      At Clipzy Studio, we're dedicated to democratizing professional video editing. 
                      We believe that everyone should have access to powerful, AI-driven tools that 
                      make video creation fast, easy, and enjoyable. Our mission is to transform how 
                      creators, marketers, and content producers approach video editing by combining 
                      cutting-edge AI technology with intuitive design.
                    </p>
                  </div>
                </div>
              </div>

              {/* Vision Section */}
              <div className="bg-gray-700/30 backdrop-blur-sm rounded-3xl border border-gray-600/50 p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-100 mb-4">Our Vision</h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      We envision a future where video editing is no longer a bottleneck for creators. 
                      Clipzy Studio aims to be the go-to platform for anyone looking to create 
                      professional-quality videos in minutes, not hours. We're building a comprehensive 
                      suite of tools that leverage AI to handle the tedious parts of editing, allowing 
                      creators to focus on what truly matters: telling their story.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Features Section */}
              <div>
                <h2 className="text-3xl font-bold text-gray-100 mb-8 text-center">What We Offer</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: Zap,
                      title: "Video Highlight Extractor",
                      description: "AI-powered tool that automatically detects and extracts the most engaging moments from your videos.",
                      color: "from-pink-500 to-red-500"
                    },
                    {
                      icon: Film,
                      title: "Auto Zoom Video",
                      description: "Intelligent person focus and dynamic zoom effects that bring cinematic quality to your content.",
                      color: "from-blue-500 to-cyan-500"
                    },
                    {
                      icon: Sparkles,
                      title: "AI Video Generator",
                      description: "Generate unique, high-quality videos from text prompts using advanced AI technology.",
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
                        <h3 className="text-xl font-bold text-gray-100 mb-2">{feature.title}</h3>
                        <p className="text-gray-400">{feature.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Video Tools Section */}
              <div className="bg-gray-700/30 backdrop-blur-sm rounded-3xl border border-gray-600/50 p-8 md:p-12">
                <h2 className="text-3xl font-bold text-gray-100 mb-6">Professional Video Tools</h2>
                <p className="text-gray-300 mb-6">
                  Beyond our core features, Clipzy Studio includes 15+ professional editing tools:
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    "Trim Video",
                    "Merge Videos",
                    "Split Video",
                    "Extract Audio",
                    "Add Watermark",
                    "Remove Audio",
                    "Change Resolution",
                    "Change Format",
                    "Compress Video",
                    "Generate Subtitles",
                    "Scene Detector",
                    "Thumbnail Generator",
                    "Background Blur",
                    "Slow Motion",
                    "Rotate / Flip",
                  ].map((tool, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-gray-600/30 border border-gray-500/30 hover:bg-gray-600/50 transition-all duration-300"
                    >
                      <p className="text-gray-300 font-medium text-sm">✓ {tool}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Values Section */}
              <div>
                <h2 className="text-3xl font-bold text-gray-100 mb-8 text-center">Our Core Values</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    {
                      title: "Innovation",
                      description: "We constantly push the boundaries of what's possible with AI and video technology.",
                      icon: "💡"
                    },
                    {
                      title: "Accessibility",
                      description: "Professional tools should be available to everyone, regardless of their technical skill level.",
                      icon: "🎯"
                    },
                    {
                      title: "Quality",
                      description: "We're committed to delivering studio-quality results that exceed user expectations.",
                      icon: "✨"
                    },
                    {
                      title: "User-Centric Design",
                      description: "Every feature is designed with the user's needs and experience in mind.",
                      icon: "❤️"
                    },
                  ].map((value, index) => (
                    <div
                      key={index}
                      className="p-6 rounded-2xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/60 transition-all duration-300"
                    >
                      <div className="text-4xl mb-3">{value.icon}</div>
                      <h3 className="text-xl font-bold text-gray-100 mb-2">{value.title}</h3>
                      <p className="text-gray-400">{value.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-3xl border border-gray-600/50 p-8 md:p-12 text-center">
                <h2 className="text-3xl font-bold text-gray-100 mb-4">
                  Ready to Transform Your Videos?
                </h2>
                <p className="text-gray-300 text-lg mb-6">
                  Join thousands of creators using Clipzy Studio to create professional content
                </p>
                <a href="/">
                  <button className="px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-full font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-pink-500/50 transition-all duration-300">
                    Get Started Now
                  </button>
                </a>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm mt-20 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-400">
              © 2024 Clipzy Studio. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AboutUsPage;
