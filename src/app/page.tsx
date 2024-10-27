"use client"
import { motion } from "framer-motion";
import React from "react";
import { AuroraBackground } from "./components/ui/aurora-background";
import Navbar from "./components/Navbar";

export default function Home() {
  return (
          <AuroraBackground>
    <div className="flex relative items-center flex-col justify-center min-h-screen">
      <Navbar />
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative  flex flex-col gap-4 items-center justify-center px-4"
      >
        <div className="text-3xl md:text-7xl font-bold text-white text-center">
        Your Gateway to Effortless Wallet Creation</div>
        <div className="font-extralight text-base md:text-4xl text-neutral-200 py-4">
        Get started with:</div>
        <button className="bg-black rounded-full w-fit text-white  px-4 py-2">
          Debug now
        </button>
      </motion.div>
    </div>
    </AuroraBackground>
  );
}
