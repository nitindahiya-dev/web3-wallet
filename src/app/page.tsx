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
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import 'react-toastify/dist/ReactToastify.css';

import { ToastContainer, toast } from 'react-toastify';
interface Wallet {
  publicKey: string;
  privateKey: string;
  mnemonic: string;
  path: string;
}

const Home = () => {
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(Array(12).fill(" "));
  const [pathTypes, setPathTypes] = useState<string[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showMnemonic, setShowMnemonic] = useState<boolean>(false);
  const [mnemonicInput, setMnemonicInput] = useState<string>("");
  const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<boolean[]>([]);
  const [visiblePhrases, setVisiblePhrases] = useState<boolean[]>([]);
  const [open, setOpen] = useState(false);
  const [openDel, setOpenDel] = useState(false);
  const pathTypeNames: { [key: string]: string } = {
    "501": "Solana",
    "60": "Ethereum",
  };

  const onOpenModal = () => {setOpen(true)};
  const onCloseModal = () => {setOpen(false)};

  const openDeleteModal = () => {setOpenDel(true)};
  const CloseDeleteModal = () => {setOpenDel(false)};

  const pathTypeName = pathTypeNames[pathTypes[0]] || "";

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
    const updatedWallets = wallets.filter((_, i) => i !== index);
    const updatedPathTypes = pathTypes.filter((_, i) => i !== index);

    setWallets(updatedWallets);
    setPathTypes(updatedPathTypes);
    localStorage.setItem("wallets", JSON.stringify(updatedWallets));
    localStorage.setItem("paths", JSON.stringify(updatedPathTypes));
    setVisiblePrivateKeys(visiblePrivateKeys.filter((_, i) => i !== index));
    setVisiblePhrases(visiblePhrases.filter((_, i) => i !== index));
    toast.success("Wallet deleted successfully!");

    CloseDeleteModal();
  };

  const handleClearWallets = () => {
    localStorage.removeItem("wallets");
    localStorage.removeItem("mnemonics");
    localStorage.removeItem("paths");
    setWallets([]);
    setMnemonicWords([]);
    setPathTypes([]);
    setVisiblePrivateKeys([]);
    setVisiblePhrases([]);
    toast.success("All wallets cleared.");

    onCloseModal();
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const togglePrivateKeyVisibility = (index: number) => {
    setVisiblePrivateKeys(
      visiblePrivateKeys.map((visible, i) => (i === index ? !visible : visible))
    );
  };

  const handleGenerateWallet = () => {
    let mnemonic = mnemonicInput.trim();

    if (mnemonic) {
      if (!validateMnemonic(mnemonic)) {
        toast.error("Invalid recovery phrase. Please try again.");
        return;
      }
    } else {
      mnemonic = generateMnemonic();
    }

    const words = mnemonic.split(" ");
    setMnemonicWords(words);

    const wallet = generateWalletFromMnemonic(pathTypes[0], mnemonic, wallets.length);
    if (wallet) {
      const updatedWallets = [...wallets, wallet];
      setWallets(updatedWallets);
      localStorage.setItem("wallets", JSON.stringify(updatedWallets));
      localStorage.setItem("mnemonics", JSON.stringify(words));
      localStorage.setItem("paths", JSON.stringify(pathTypes));
      setVisiblePrivateKeys([...visiblePrivateKeys, false]);
      setVisiblePhrases([...visiblePhrases, false]);
      toast.success("Wallet generated successfully!");
    }
  };

  const handleAddWallet = () => {
    if (!mnemonicWords) {
      toast.error("No mnemonic found. Please generate a wallet first.");
      return;
    }

    const wallet = generateWalletFromMnemonic(pathTypes[0], mnemonicWords.join(" "), wallets.length);
    if (wallet) {
      const updatedWallets = [...wallets, wallet];
      const updatedPathType = [pathTypes, pathTypes];
      setWallets(updatedWallets);
      localStorage.setItem("wallets", JSON.stringify(updatedWallets));
      localStorage.setItem("pathTypes", JSON.stringify(updatedPathType));
      setVisiblePrivateKeys([...visiblePrivateKeys, false]);
      setVisiblePhrases([...visiblePhrases, false]);
      toast.success("Wallet generated successfully!");
    }
  };

  const generateWalletFromMnemonic = (pathType: string, mnemonic: string, accountIndex: number): Wallet | null => {
    try {
      const seedBuffer = mnemonicToSeedSync(mnemonic);
      const path = `m/44'/${pathType}'/0'/${accountIndex}'`;
      const { key: derivedSeed } = derivePath(path, seedBuffer.toString("hex"));

      let publicKeyEncoded: string;
      let privateKeyEncoded: string;

      if (pathType === "501") {
        // Solana
        const { secretKey } = nacl.sign.keyPair.fromSeed(derivedSeed);
        const keypair = Keypair.fromSecretKey(secretKey);
        privateKeyEncoded = bs58.encode(secretKey);
        publicKeyEncoded = keypair.publicKey.toBase58();
      } else if (pathType === "60" || pathType === "56") {
        // Ethereum
        const privateKey = Buffer.from(derivedSeed).toString("hex");
        privateKeyEncoded = privateKey;
        const wallet = new ethers.Wallet(privateKey);
        publicKeyEncoded = wallet.address;
      } else {
        toast.error("Unsupported path type.");
        return null;
      }

      return {
        publicKey: publicKeyEncoded,
        privateKey: privateKeyEncoded,
        mnemonic,
        path,
      };
    } catch {
      toast.error("Failed to generate wallet. Please try again.");
      return null;
    }
  };

  return (
    <AuroraBackground>
      <div className="flex relative items-center flex-col min-h-screen">
        <Navbar />


        {wallets.length === 0 && (
          <motion.div
            className="flex flex-col mt-[35vh] gap-4"
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
                className="relative flex flex-col gap-4  px-4"
              >
                <div className="text-2xl md:text-5xl mb-10 font-bold text-white">
                  <span className="bg-blue-600">Secret Recovery Phrase</span>
                  <p className="mt-4">Save these words in a safe place</p>
                </div>
                <div className="flex gap-5 w-[80vw] h-12">
                  <input
                    type="text"
                    placeholder="Enter your secret phrase (or leave empty to generate wallet)"
                    className="whitespace-nowrap text-md font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow px-4 py-2 w-[40vw] h-12 gap-0.5 inline-flex items-center justify-center rounded-full hover:bg-dark-4 placeholder:text-black placeholder:font-bold"
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    value={mnemonicInput}
                  />
                  <button
                    className="border-white border-[1px] text-white rounded-full w-52 hover:bg-white hover:text-black font-bold"
                    onClick={() => handleGenerateWallet()}>
                    {mnemonicInput ? "Add Wallet" : "Generate Wallet"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}


        {/* Display Secret Phrase */}
        {mnemonicWords && wallets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className="group w-full mt-[20vh] flex rounded-xl flex-col items-center gap-4 cursor-pointer border border-white dark:border-white px-8 py-4 "
          >
            <div
              className="flex w-full justify-between items-center"
              onClick={() => setShowMnemonic(!showMnemonic)}
            >
              <h2 className="text-2xl text-white md:text-3xl font-bold tracking-tighter">
                Your Secret Phrase
              </h2>
              <button
                onClick={() => setShowMnemonic(!showMnemonic)}
                className=""
              >
                {showMnemonic ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="m6 9 6 6 6-6"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"></path></svg>
                )}
              </button>
            </div>

            {showMnemonic && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="flex flex-col w-full items-center justify-center"
                onClick={() => copyToClipboard(mnemonicWords.join(" "))}
              >
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 justify-center w-full items-center mx-auto my-8"
                >
                  {mnemonicWords.map((word, index) => (
                    <p
                      key={index}
                      className="md:text-lg text-white bg-foreground/5 hover:bg-foreground/10 transition-all duration-300 rounded-lg p-4 border border-white "
                    >
                      {word}
                    </p>
                  ))}
                </motion.div>
                <div className="text-sm md:text-base text-primary/50 flex w-full gap-2 items-center group-hover:text-primary/80 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg> 
                  <span className="text-white">Click Anywhere To Copy</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Display wallet pairs */}
        {wallets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.3,
              ease: "easeInOut",
            }}
            className="flex flex-col gap-8 mt-6"
          >
            <div className="flex md:flex-row flex-col justify-between w-[80vw] gap-4 md:items-center">
              <h2 className="tracking-tighter text-white text-3xl md:text-4xl font-extrabold">
                {pathTypeName} Wallet
              </h2>

              <div className="flex gap-5">
                <button
                  className="border-white border-[1px] text-white rounded-full px-8 py-2 hover:bg-white hover:text-black font-bold"
                  onClick={handleAddWallet}
                >
                  Add Wallet
                </button>
                <button
                  className="border-white border-[1px] text-white rounded-full px-8 py-2 hover:bg-white hover:text-black font-bold"
                  onClick={onOpenModal}
                >
                  Clear Wallets
                </button>
                <Modal open={open} onClose={onCloseModal} center>
                  <div className="p-8 bg-white rounded-2xl w-[30vw] text-center">
                    <h2 className="text-2xl font-semibold mb-4">
                      Are you sure you want to delete all wallets?
                    </h2>
                    <p>
                      This action cannot be undone. This will permanently delete your
                      wallets and keys from local storage.
                    </p>
                    <div className="flex justify-center space-x-4 mt-6">
                      <button 
                      onClick={onCloseModal} 
                      className="border-black hover:bg-black hover:text-white border-[1px] text-bold rounded-full w-40"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearWallets}
                        className="border-black hover:bg-black hover:text-white border-[1px] text-bold rounded-full w-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 h-[50vh] py-5 px-10 overflow-y-scroll w-[80vw]"  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }} >
            {wallets.map((wallet, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3 + index * 0.1,
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="flex flex-col gap-8 px-8 py-4 rounded-2xl border-[2px] border-dashed"
              >
                <div className="flex justify-between">
                  <h3 className="text-white text-2xl font-bold">Wallet {index + 1}</h3>

                  <button onClick={openDeleteModal}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-trash"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                  <Modal open={openDel} onClose={CloseDeleteModal} center>
                    <div className="p-8 bg-white rounded-2xl w-[30vw] text-center">
                      <h2 className="text-2xl font-semibold mb-4">
                        Are you sure you want to delete this wallet?
                      </h2>
                      <p>
                        This action cannot be undone. This will permanently delete your
                        wallet and key from local storage.
                      </p>
                      <div className="flex justify-center space-x-4 mt-6">
                        <button 
                        onClick={CloseDeleteModal} 
                        className="border-black hover:bg-black hover:text-white border-[1px] text-bold rounded-full w-40"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteWallet(index)} className="border-black hover:bg-black hover:text-white border-[1px] text-bold rounded-full w-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Modal>
                </div>
                <div className="text-white">
                  <div className="mb-6" onClick={() => copyToClipboard(wallet.publicKey)}>
                    <p className="text-xl font-bold">Public Key</p>
                    <span className="cursor-pointer">{wallet.publicKey}</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold">Private Key</p>
                    <div className="flex justify-between">
                      <span className="overflow-hidden w-[20vw] cursor-pointer" onClick={() => copyToClipboard(wallet.privateKey)}>
                        {visiblePrivateKeys[index]
                          ? wallet.privateKey
                          : "•".repeat(wallet.mnemonic.length)}</span>
                      <div onClick={() => togglePrivateKeyVisibility(index)}>
                        {visiblePrivateKeys[index] ? (
                          <button>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-eye-closed"
                            >
                              <path d="M15 18L14.278 14.75" />
                              <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                              <path d="M20 15L18.274 12.95" />
                              <path d="M4 15l1.726-2.05" />
                              <path d="M9 18l.722-3.25" />
                            </svg>
                          </button>
                        ) : (
                          <button>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-eye-off"
                            >
                              <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                              <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                              <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                              <path d="M2 2l20 20" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </motion.div>
        )}
        <ToastContainer />
      </div>
    </AuroraBackground>
  );
}

export default Home;