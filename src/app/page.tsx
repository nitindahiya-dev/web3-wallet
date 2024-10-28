"use client";

import React, { useState, useEffect } from "react";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { motion } from "framer-motion";
import bs58 from "bs58";
import { ethers } from "ethers";
import { AuroraBackground } from "./components/ui/aurora-background";
import Navbar from "./components/Navbar";
import PrimaryButton from "./components/ui/PrimaryButton";

interface Wallet {
  publicKey: string;
  privateKey: string;
  mnemonic: string;
  path: string;
}


const Home = () => {
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(Array(12).fill(" "));
  const [pathTypes, setPathTypes] = useState<string[]>([]);
  const [wallets, setWallets] = useState<string[]>([]);
  const [showMnemonic, setShowMnemonic] = useState<boolean>(false);
  const [mnemonicInput, setMnemonicInput] = useState<string>("");
  const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<boolean[]>([]);
  const [visiblePhrases, setVisiblePhrases] = useState<boolean[]>([]);
  const pathTypeNames: { [key: string]: string } = {
    "501": "solana",
    "60": "Ethereum",
  }

  const pathTypeName = pathTypeNames[pathTypes[0]] || " ";

  useEffect(() => {
    const storedWallets = localStorage.getItem("wallets");
    const storedMnemonic = localStorage.getItem("menmonics");
    const storedPathTypes = localStorage.getItem("paths");

    if (storedWallets && storedPathTypes && storedMnemonic) {
      setMnemonicWords(JSON.parse(storedMnemonic));
      setWallets(JSON.parse(storedWallets));
      setPathTypes(JSON.parse(storedPathTypes));

      setVisiblePhrases(JSON.parse(storedWallets).map(() => false));
      setVisiblePrivateKeys(JSON.parse(storedWallets).map(() => false));
    }
  }, []);


  const handleDeleteWallet = (index: number) => {
    const updateWallets = wallets.filter((_, i) => i !== index);
    const updatePathTypes = pathTypes.filter((_, i) => i !== index);

    setWallets(updateWallets);
    setPathTypes(updatePathTypes);

    localStorage.setItem("wallets", JSON.stringify(updateWallets));
    localStorage.setItem("paths", JSON.stringify(updatePathTypes));

    setVisiblePhrases(visiblePhrases.filter((_, i) => i !== index))
    setVisiblePrivateKeys(visiblePhrases.filter((_, i) => i !== index))

    console.log("Wallet deleted successfully!")
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    console.log("Copied to clipboard!");
  }

  const togglePhraseVisibility = (index: number) => {
    setVisiblePhrases(
      visiblePhrases.map((visible, i) => (i === index ? !visible : visible))
    );
  };

  const generateWalletFromMnemonic = (
    pathTypes: string,
    mnemonic: string,
    accountIndex: number,
  ): Wallet | null => {
    try {
      const seedBuffer = mnemonicToSeedSync(mnemonic);
      const path = `m/44'/${pathTypes}'/0'/${accountIndex}`;
      const { key: deriveSeed } = derivePath(path, seedBuffer.toString("hex"));

      let publicKeyEncoded: string;
      let privateKeyEncoded: string;

      if (pathTypes === "501") {
        const { secretKey } = nacl.sign.keypair.fromSeed(deriveSeed);
        const keypair = Keypair.fromSecretKey(secretKey);
        privateKeyEncoded = bs58.encode(secretKey);
        publicKeyEncoded = keypair.publicKey.toBase58();
      } else if (pathTypes === "60" || pathTypes === "56") {
        const privateKey = Buffer.from(deriveSeed).toString("hex");
        privateKeyEncoded = privateKey;
        const wallet = new ethers.Wallet(privateKey);
        publicKeyEncoded = wallet.address;
      } else {
        console.log("unsupported path type");
        return null;
      }

      return {
        publicKey: publicKeyEncoded,
        privateKey: privateKeyEncoded,
        mnemonic,
        path,
      };
    } catch (error) {
      console.log("Failed to gernerate wallet. Please try again");
      return null;
    }
  };

  const handleGenerateWallet = () => {
    let mnemonic = mnemonicInput.trim();
    if (mnemonic) {
      if (!validateMnemonic(mnemonic)) {
        console.log("Invalid recovery phrase. Please try again.");
        return;
      } else {
        mnemonic = generateMnemonic();
      }

      const words = mnemonic.split(" ");
      setMnemonicWords(words);

      const wallet = generateWalletFromMnemonic(
        pathTypes[0],
        mnemonic,
        wallets.length
      );
      if (wallets) {
        const updatedWallets = [...wallets, wallets];
        setWallets(updatedWallets);
        localStorage.setItem("wallets", JSON.stringify(updatedWallets));
        localStorage.setItem("mnemonics", JSON.stringify(words));
        localStorage.setItem("paths", JSON.stringify(pathTypes));
        setVisiblePrivateKeys([...visiblePrivateKeys, false]);
        setVisiblePhrases([...visiblePhrases, false]);
        console.log("Wallet generated successfully!");
      }
    }
  }


  const handleAddWallet = () => {
    if (!mnemonicWords) {
      console.log("No mnemonic found. Please generate a wallet first.");
      return;
    }

    const wallet = generateWalletFromMnemonic(
      pathTypes[0],
      mnemonicWords.join(" "),
      wallets.length
    );
    if (wallet) {
      const updatedWallets = [...wallets, wallet];
      const updatedPathType = [pathTypes, pathTypes];
      setWallets(updatedWallets);
      localStorage.setItem("wallets", JSON.stringify(updatedWallets));
      localStorage.setItem("pathTypes", JSON.stringify(updatedPathType));
      setVisiblePrivateKeys([...visiblePrivateKeys, false]);
      setVisiblePhrases([...visiblePhrases, false]);
      console.log("Wallet generated successfully!");
    }
  };

  const placeholders = [
    "Enter your secret phrase",
    "Create Wallet",
    "Secret Phase...",
    "Create your wallet",
    "Your secret phrase please...",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted");
  };




  return (
    <AuroraBackground>
      <div className="flex relative items-center flex-col justify-center min-h-screen">
        <Navbar />
        {wallets.length === 0 && (
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
          >
            {pathTypes.length === 0 && (
              <motion.div
                initial={{ opacity: 0.0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3,
                  duration: 0.8,
                  ease: "easeInOut",
                }}
                className="relative flex flex-col gap-4 items-center justify-center px-4"
              >
                <div className="text-3xl md:text-7xl font-bold text-white text-center">
                  Your Gateway to Effortless Wallet Creation
                </div>
                <div className="font-extralight text-base md:text-4xl text-neutral-200 py-4">
                  Choose a blockchain to get started.
                </div>
                <div className="flex gap-5">
                  <PrimaryButton
                    label="Solana"
                    onClick={() => setPathTypes(["501"])}
                  />
                  <PrimaryButton
                    label="Ethereum"
                    onClick={() => setPathTypes(["60"])}
                  />
                </div>
              </motion.div>
            )}

            {pathTypes.length !== 0 && (
              <motion.div
                initial={{ opacity: 0.0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3,
                  duration: 0.8,
                  ease: "easeInOut",
                }}
                className="relative flex flex-col gap-4 items-center justify-center px-4"
              >
                <div className="text-2xl md:text-5xl mb-10 font-bold text-white text-center">
                Secret Recovery Phrase
                <br />
                Save these words in a safe place.


                </div>
                <div className="flex gap-5 w-[80vw] justify-center h-12">
                  <input
                    type="text"
                    placeholder="Enter your secret phrase (or leave empty to generate wallet)"
                    className="whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow px-4 py-2 w-[30vw] h-12 gap-0.5 inline-flex items-center justify-center rounded-full hover:bg-dark-4"
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    value={mnemonicInput}
                  />
                  <button
                    className="border-white border-[1px] text-white rounded-full w-60"
                    onClick={handleGenerateWallet}
                  >
                    {mnemonicInput ? "Add Wallet" : "Generate Wallet"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </AuroraBackground>
  );
}

export default Home;