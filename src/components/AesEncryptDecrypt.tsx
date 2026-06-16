import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  deriveKeyFromPassphrase,
  importRawKey,
  encryptAES,
  decryptAES,
  generateRandomBytes,
  generateSecureKey,
  generateSecurePassword,
  uint8ArrayToHex,
  hexToUint8Array,
  uint8ArrayToBase64,
  base64ToUint8Array,
  buildConcatenatedPayload,
  parseConcatenatedPayload,
  buildJsonPayload,
  parseJsonPayload
} from '../utils-engine/aes';
import type { EncryptedPayload } from '../utils-engine/aes';

const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy
    }
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
};

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

export const AesEncryptDecrypt: React.FC = () => {
  // Tabs and general state
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [inputType, setInputType] = useState<'text' | 'file'>('text');
  
  // Inputs
  const [inputText, setInputText] = useState<string>('');
  const [keyType, setKeyType] = useState<'passphrase' | 'raw'>('passphrase');
  const [passphrase, setPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [rawKey, setRawKey] = useState<string>('');
  
  // Crypto Parameters (Advanced Panel)
  const [aesMode, setAesMode] = useState<'AES-GCM' | 'AES-CBC'>('AES-GCM');
  const [keySize, setKeySize] = useState<128 | 192 | 256>(256);
  const [iterations, setIterations] = useState<number>(100000);
  const [outputFormat, setOutputFormat] = useState<'base64' | 'hex'>('base64');
  const [payloadType, setPayloadType] = useState<'concatenated' | 'json' | 'raw'>('concatenated');
  
  // Custom Salt/IV values (for testing / advanced developers)
  const [saltMode, setSaltMode] = useState<'auto' | 'custom'>('auto');
  const [customSalt, setCustomSalt] = useState<string>('');
  const [ivMode, setIvMode] = useState<'auto' | 'custom'>('auto');
  const [customIv, setCustomIv] = useState<string>('');
  
  // Generator utility states
  const [genLength, setGenLength] = useState<number>(16);
  const [genIncludeSymbols, setGenIncludeSymbols] = useState<boolean>(true);
  const [genIncludeNumbers, setGenIncludeNumbers] = useState<boolean>(true);
  
  // Outputs & Logs
  const [outputText, setOutputText] = useState<string>('');
  const [derivedKeyHex, setDerivedKeyHex] = useState<string>('');
  const [activeIvHex, setActiveIvHex] = useState<string>('');
  const [activeSaltHex, setActiveSaltHex] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({});
  
  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // UI states
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger copy feedback
  const triggerCopyFeedback = (id: string) => {
    setCopyFeedback(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [id]: false }));
    }, 1500);
  };

  // Sync state from shareable link in hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#payload=')) {
        try {
          const encoded = hash.substring(9);
          const decodedJson = atob(decodeURIComponent(encoded));
          const data = JSON.parse(decodedJson);
          
          setActiveTab('decrypt');
          setInputType('text');
          setAesMode(data.mode || 'AES-GCM');
          setKeySize(data.keySize || 256);
          if (data.iterations) setIterations(data.iterations);
          
          if (data.payloadType === 'json') {
            setPayloadType('json');
            const jsonPayload: EncryptedPayload = {
              mode: data.mode,
              keySize: data.keySize,
              iterations: data.iterations,
              salt: data.salt,
              iv: data.iv,
              ciphertext: data.ciphertext
            };
            setInputText(buildJsonPayload(jsonPayload));
          } else if (data.payloadType === 'raw') {
            setPayloadType('raw');
            setInputText(data.ciphertext);
            if (data.salt) {
              setSaltMode('custom');
              setCustomSalt(data.salt);
            }
            if (data.iv) {
              setIvMode('custom');
              setCustomIv(data.iv);
            }
          } else {
            setPayloadType('concatenated');
            // Reconstruct concatenated payload
            const format = data.format || 'base64';
            setOutputFormat(format);
            const saltBytes = data.salt ? hexToUint8Array(data.salt) : undefined;
            const ivBytes = hexToUint8Array(data.iv);
            const cipherBytes = base64ToUint8Array(data.ciphertext);
            const concatenated = buildConcatenatedPayload(cipherBytes, ivBytes, saltBytes, format);
            setInputText(concatenated);
          }
          
          setSuccessMsg('Loaded encrypted payload parameters from link! Enter the passphrase to decrypt.');
          setErrorMsg('');
          // Clear hash to avoid annoying scroll jumping, but keep it readable
          window.history.replaceState(null, '', window.location.pathname);
        } catch (err) {
          setErrorMsg('Failed to parse shareable configuration from URL.');
        }
      }
    };

    handleHashChange(); // Run on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync input elements to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedPlaintext = localStorage.getItem('useutils_aes_plaintext');
    if (storedPlaintext && activeTab === 'encrypt' && inputType === 'text') {
      setInputText(storedPlaintext);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (typeof window !== 'undefined' && activeTab === 'encrypt' && inputType === 'text') {
      localStorage.setItem('useutils_aes_plaintext', val);
    }
  };

  // Perform calculations in real-time for TEXT encryption/decryption
  useEffect(() => {
    if (inputType === 'file') return;
    
    // Clear outputs if inputs are empty
    if (!inputText.trim()) {
      setOutputText('');
      setDerivedKeyHex('');
      setActiveIvHex('');
      setActiveSaltHex('');
      setErrorMsg('');
      return;
    }

    const runCrypto = async () => {
      setErrorMsg('');
      setSuccessMsg('');
      try {
        if (activeTab === 'encrypt') {
          // Encrypt Text
          const encoder = new TextEncoder();
          const plaintextBytes = encoder.encode(inputText);
          
          let salt: Uint8Array;
          if (keyType === 'passphrase') {
            if (saltMode === 'custom' && customSalt) {
              salt = hexToUint8Array(customSalt);
            } else {
              salt = generateRandomBytes(16); // 128-bit salt
            }
            setActiveSaltHex(uint8ArrayToHex(salt));
          } else {
            salt = new Uint8Array(0);
            setActiveSaltHex('');
          }

          let iv: Uint8Array;
          if (ivMode === 'custom' && customIv) {
            iv = hexToUint8Array(customIv);
          } else {
            const ivSize = aesMode === 'AES-GCM' ? 12 : 16;
            iv = generateRandomBytes(ivSize);
          }
          setActiveIvHex(uint8ArrayToHex(iv));

          let cryptoKey: CryptoKey;
          if (keyType === 'passphrase') {
            if (!passphrase) {
              setErrorMsg('Please input a passphrase to derive the AES key.');
              return;
            }
            cryptoKey = await deriveKeyFromPassphrase(passphrase, salt, iterations, keySize, aesMode);
            // Display derived key
            const rawKeyMaterial = await crypto.subtle.importKey(
              'raw',
              encoder.encode(passphrase),
              { name: 'PBKDF2' },
              false,
              ['deriveBits', 'deriveKey']
            );
            const derivedBits = await crypto.subtle.deriveBits(
              {
                name: 'PBKDF2',
                salt,
                iterations,
                hash: 'SHA-256'
              },
              rawKeyMaterial,
              keySize
            );
            setDerivedKeyHex(uint8ArrayToHex(new Uint8Array(derivedBits)));
          } else {
            if (!rawKey) {
              setErrorMsg('Please enter a raw cryptographic key.');
              return;
            }
            let keyBytes: Uint8Array;
            try {
              if (/^[0-9a-fA-F]+$/.test(rawKey)) {
                keyBytes = hexToUint8Array(rawKey);
              } else {
                keyBytes = base64ToUint8Array(rawKey);
              }
            } catch {
              setErrorMsg('Raw key must be a valid Hex or Base64 string.');
              return;
            }
            cryptoKey = await importRawKey(keyBytes, aesMode);
            setDerivedKeyHex(uint8ArrayToHex(keyBytes));
          }

          const ciphertextBytes = await encryptAES(plaintextBytes, cryptoKey, iv, aesMode);
          const ciphertextBase64 = uint8ArrayToBase64(ciphertextBytes);
          const ciphertextHex = uint8ArrayToHex(ciphertextBytes);

          if (payloadType === 'json') {
            const payload: EncryptedPayload = {
              mode: aesMode,
              keySize,
              iv: uint8ArrayToHex(iv),
              ciphertext: ciphertextBase64
            };
            if (keyType === 'passphrase') {
              payload.iterations = iterations;
              payload.salt = uint8ArrayToHex(salt);
            }
            setOutputText(buildJsonPayload(payload));
          } else if (payloadType === 'raw') {
            setOutputText(outputFormat === 'hex' ? ciphertextHex : ciphertextBase64);
          } else {
            // Concatenated Payload
            const combined = buildConcatenatedPayload(
              ciphertextBytes,
              iv,
              keyType === 'passphrase' ? salt : undefined,
              outputFormat
            );
            setOutputText(combined);
          }
        } else {
          // Decrypt Text
          let saltBytes: Uint8Array | undefined;
          let ivBytes: Uint8Array;
          let cipherBytes: Uint8Array;

          if (payloadType === 'json') {
            try {
              const payload = parseJsonPayload(inputText);
              setAesMode(payload.mode);
              setKeySize(payload.keySize);
              if (payload.iterations) setIterations(payload.iterations);
              
              ivBytes = hexToUint8Array(payload.iv);
              cipherBytes = base64ToUint8Array(payload.ciphertext);
              if (payload.salt) saltBytes = hexToUint8Array(payload.salt);
            } catch (err: any) {
              setErrorMsg(`Invalid JSON payload envelope: ${err.message}`);
              return;
            }
          } else if (payloadType === 'raw') {
            if (keyType === 'passphrase' && saltMode === 'custom' && customSalt) {
              saltBytes = hexToUint8Array(customSalt);
            } else if (keyType === 'passphrase') {
              setErrorMsg('Salt is required to decrypt raw ciphertext in passphrase mode. Provide it in Advanced parameters.');
              return;
            }

            if (ivMode === 'custom' && customIv) {
              ivBytes = hexToUint8Array(customIv);
            } else {
              setErrorMsg('IV (Initialization Vector) is required to decrypt raw ciphertext. Enter it in Advanced parameters.');
              return;
            }

            try {
              const cleanedText = inputText.trim();
              if (/^[0-9a-fA-F]+$/.test(cleanedText)) {
                cipherBytes = hexToUint8Array(cleanedText);
              } else {
                cipherBytes = base64ToUint8Array(cleanedText);
              }
            } catch {
              setErrorMsg('Ciphertext must be a valid Hex or Base64 string.');
              return;
            }
          } else {
            // Concatenated Payload
            try {
              const parsed = parseConcatenatedPayload(inputText, outputFormat);
              cipherBytes = parsed.ciphertext;
              ivBytes = parsed.iv;
              saltBytes = parsed.salt;
            } catch (err: any) {
              setErrorMsg(`Concatenated payload parsing failed: ${err.message}`);
              return;
            }
          }

          // Populate visual diagnostics
          if (saltBytes) setActiveSaltHex(uint8ArrayToHex(saltBytes));
          else setActiveSaltHex('');
          setActiveIvHex(uint8ArrayToHex(ivBytes));

          let cryptoKey: CryptoKey;
          if (keyType === 'passphrase') {
            if (!passphrase) {
              setErrorMsg('Enter your passphrase to decrypt.');
              return;
            }
            if (!saltBytes) {
              setErrorMsg('Salt not found. Concatenated payload or custom salt is required for key derivation.');
              return;
            }
            cryptoKey = await deriveKeyFromPassphrase(passphrase, saltBytes, iterations, keySize, aesMode);
            
            // Derive hex representation for preview
            const encoder = new TextEncoder();
            const rawKeyMaterial = await crypto.subtle.importKey(
              'raw',
              encoder.encode(passphrase),
              { name: 'PBKDF2' },
              false,
              ['deriveBits', 'deriveKey']
            );
            const derivedBits = await crypto.subtle.deriveBits(
              {
                name: 'PBKDF2',
                salt: saltBytes,
                iterations,
                hash: 'SHA-256'
              },
              rawKeyMaterial,
              keySize
            );
            setDerivedKeyHex(uint8ArrayToHex(new Uint8Array(derivedBits)));
          } else {
            if (!rawKey) {
              setErrorMsg('Enter the raw cryptographic key to decrypt.');
              return;
            }
            let keyBytes: Uint8Array;
            try {
              if (/^[0-9a-fA-F]+$/.test(rawKey)) {
                keyBytes = hexToUint8Array(rawKey);
              } else {
                keyBytes = base64ToUint8Array(rawKey);
              }
            } catch {
              setErrorMsg('Raw key must be a valid Hex or Base64 string.');
              return;
            }
            cryptoKey = await importRawKey(keyBytes, aesMode);
            setDerivedKeyHex(uint8ArrayToHex(keyBytes));
          }

          const decryptedBytes = await decryptAES(cipherBytes, cryptoKey, ivBytes, aesMode);
          const decodedPlaintext = new TextDecoder().decode(decryptedBytes);
          setOutputText(decodedPlaintext);
        }
      } catch (err: any) {
        console.error(err);
        if (activeTab === 'decrypt') {
          setErrorMsg('Decryption failed! Please verify the passphrase, key, IV, salt, and mode parameters. The ciphertext might be corrupted or encoded with a different key.');
        } else {
          setErrorMsg(`Encryption error: ${err.message || err}`);
        }
        setOutputText('');
        setDerivedKeyHex('');
      }
    };

    // Debounce/delay briefly to avoid choking on quick key presses
    const timer = setTimeout(runCrypto, 100);
    return () => clearTimeout(timer);

  }, [inputText, passphrase, rawKey, keyType, aesMode, keySize, iterations, outputFormat, payloadType, saltMode, customSalt, ivMode, customIv, activeTab, inputType]);

  // ==========================================
  // File Encryption & Decryption Handlers
  // ==========================================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > FILE_SIZE_LIMIT) {
        setErrorMsg('File exceeds size limit of 5MB. Please upload a smaller config or file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg('');
    setSuccessMsg('');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > FILE_SIZE_LIMIT) {
        setErrorMsg('File exceeds size limit of 5MB. Please upload a smaller config or file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setProcessedFileUrl(null);
    setProcessedFileName(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFileCrypto = async () => {
    if (!selectedFile) return;
    setErrorMsg('');
    setSuccessMsg('');
    setProcessedFileUrl(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileBuffer = e.target?.result as ArrayBuffer;
        const fileBytes = new Uint8Array(fileBuffer);

        if (activeTab === 'encrypt') {
          // Encrypt File
          let salt: Uint8Array;
          if (keyType === 'passphrase') {
            if (saltMode === 'custom' && customSalt) {
              salt = hexToUint8Array(customSalt);
            } else {
              salt = generateRandomBytes(16);
            }
          } else {
            salt = new Uint8Array(0);
          }

          let iv: Uint8Array;
          if (ivMode === 'custom' && customIv) {
            iv = hexToUint8Array(customIv);
          } else {
            const ivSize = aesMode === 'AES-GCM' ? 12 : 16;
            iv = generateRandomBytes(ivSize);
          }

          let cryptoKey: CryptoKey;
          if (keyType === 'passphrase') {
            if (!passphrase) {
              setErrorMsg('Please input a passphrase to encrypt.');
              return;
            }
            cryptoKey = await deriveKeyFromPassphrase(passphrase, salt, iterations, keySize, aesMode);
          } else {
            if (!rawKey) {
              setErrorMsg('Please input a raw cryptographic key.');
              return;
            }
            let keyBytes: Uint8Array;
            try {
              if (/^[0-9a-fA-F]+$/.test(rawKey)) {
                keyBytes = hexToUint8Array(rawKey);
              } else {
                keyBytes = base64ToUint8Array(rawKey);
              }
            } catch {
              setErrorMsg('Raw key must be a valid Hex or Base64 string.');
              return;
            }
            cryptoKey = await importRawKey(keyBytes, aesMode);
          }

          const ciphertextBytes = await encryptAES(fileBytes, cryptoKey, iv, aesMode);

          // Build Binary File Envelope:
          // Layout: [1 byte saltLen] [1 byte ivLen] [1 byte filenameLen] [saltBytes] [ivBytes] [filenameBytes] [ciphertextBytes]
          const saltLen = salt.length;
          const ivLen = iv.length;
          const filenameBytes = new TextEncoder().encode(selectedFile.name);
          const filenameLen = filenameBytes.length;

          if (filenameLen > 255) {
            setErrorMsg('Filename too long (must be under 255 UTF-8 characters).');
            return;
          }

          const totalLength = 1 + 1 + 1 + saltLen + ivLen + filenameLen + ciphertextBytes.length;
          const fileEnvelope = new Uint8Array(totalLength);

          fileEnvelope[0] = saltLen;
          fileEnvelope[1] = ivLen;
          fileEnvelope[2] = filenameLen;

          let offset = 3;
          if (saltLen > 0) {
            fileEnvelope.set(salt, offset);
            offset += saltLen;
          }
          fileEnvelope.set(iv, offset);
          offset += ivLen;
          fileEnvelope.set(filenameBytes, offset);
          offset += filenameLen;
          fileEnvelope.set(ciphertextBytes, offset);

          const blob = new Blob([fileEnvelope], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          setProcessedFileUrl(url);
          setProcessedFileName(`${selectedFile.name}.enc`);
          setSuccessMsg('File successfully encrypted locally! Download your encrypted payload below.');
        } else {
          // Decrypt File (.enc envelope)
          if (fileBytes.length < 3) {
            setErrorMsg('Encrypted file envelope is corrupted or too short.');
            return;
          }

          const saltLen = fileBytes[0];
          const ivLen = fileBytes[1];
          const filenameLen = fileBytes[2];

          if (3 + saltLen + ivLen + filenameLen > fileBytes.length) {
            setErrorMsg('Corrupted envelope headers. Layout sizes exceed block length.');
            return;
          }

          let offset = 3;
          let saltBytes: Uint8Array | undefined;
          if (saltLen > 0) {
            saltBytes = fileBytes.slice(offset, offset + saltLen);
            offset += saltLen;
          }
          const ivBytes = fileBytes.slice(offset, offset + ivLen);
          offset += ivLen;
          const filenameBytes = fileBytes.slice(offset, offset + filenameLen);
          offset += filenameLen;
          const ciphertextBytes = fileBytes.slice(offset);

          const originalFilename = new TextDecoder().decode(filenameBytes);

          let cryptoKey: CryptoKey;
          if (keyType === 'passphrase') {
            if (!passphrase) {
              setErrorMsg('Enter your passphrase to decrypt.');
              return;
            }
            if (!saltBytes) {
              setErrorMsg('Salt bytes not found in encrypted file envelope.');
              return;
            }
            cryptoKey = await deriveKeyFromPassphrase(passphrase, saltBytes, iterations, keySize, aesMode);
          } else {
            if (!rawKey) {
              setErrorMsg('Enter your raw key to decrypt.');
              return;
            }
            let keyBytes: Uint8Array;
            try {
              if (/^[0-9a-fA-F]+$/.test(rawKey)) {
                keyBytes = hexToUint8Array(rawKey);
              } else {
                keyBytes = base64ToUint8Array(rawKey);
              }
            } catch {
              setErrorMsg('Raw key must be a valid Hex or Base64 string.');
              return;
            }
            cryptoKey = await importRawKey(keyBytes, aesMode);
          }

          const decryptedBytes = await decryptAES(ciphertextBytes, cryptoKey, ivBytes, aesMode);

          const blob = new Blob([decryptedBytes], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          setProcessedFileUrl(url);
          setProcessedFileName(originalFilename || 'decrypted_file');
          setSuccessMsg(`File decrypted successfully! Download the original file '${originalFilename}' below.`);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Decryption failed! Please check your password/key and ensure the file is an useUtils encrypted file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // ==========================================
  // Generator triggers
  // ==========================================
  
  const handleGenerateKey = () => {
    try {
      const key = generateSecureKey(keySize, outputFormat);
      setRawKey(key);
      setKeyType('raw');
      setSuccessMsg(`Generated a cryptographically secure ${keySize}-bit key!`);
    } catch (err: any) {
      setErrorMsg(`Generation failed: ${err.message}`);
    }
  };

  const handleGeneratePassword = () => {
    try {
      const pwd = generateSecurePassword(genLength, {
        upper: true,
        lower: true,
        numbers: genIncludeNumbers,
        symbols: genIncludeSymbols
      });
      setPassphrase(pwd);
      setKeyType('passphrase');
      setSuccessMsg(`Generated a strong ${genLength}-character passphrase!`);
    } catch (err: any) {
      setErrorMsg(`Generation failed: ${err.message}`);
    }
  };

  // ==========================================
  // URL Share link generator
  // ==========================================

  const handleGenerateShareLink = () => {
    if (!outputText || errorMsg) return;

    try {
      // Package config and ciphertext into a non-sensitive container
      const data: any = {
        mode: aesMode,
        keySize,
        payloadType,
        format: outputFormat
      };

      if (keyType === 'passphrase') {
        data.iterations = iterations;
        data.salt = activeSaltHex;
      }
      
      if (payloadType === 'json') {
        const payloadObj = parseJsonPayload(outputText);
        data.iv = payloadObj.iv;
        data.ciphertext = payloadObj.ciphertext;
      } else if (payloadType === 'raw') {
        data.iv = activeIvHex;
        data.ciphertext = outputFormat === 'hex' ? uint8ArrayToBase64(hexToUint8Array(outputText)) : outputText;
      } else {
        const parsed = parseConcatenatedPayload(outputText, outputFormat);
        data.iv = uint8ArrayToHex(parsed.iv);
        data.ciphertext = uint8ArrayToBase64(parsed.ciphertext);
      }

      const jsonStr = JSON.stringify(data);
      const b64 = btoa(jsonStr);
      const shareUrl = `${window.location.origin}${window.location.pathname}#payload=${encodeURIComponent(b64)}`;
      
      const success = copyToClipboard(shareUrl);
      if (success) {
        triggerCopyFeedback('shareLink');
        setSuccessMsg('Shareable secure configuration URL copied to clipboard! (Password is NOT included for safety)');
      }
    } catch (err: any) {
      setErrorMsg(`Failed to build shareable URL: ${err.message}`);
    }
  };

  // Text Stats
  const inputLength = inputText.length;
  const outputLength = outputText.length;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Operation Tabs */}
      <div className="flex bg-zinc-900 border border-border-hairline p-1 rounded-xl w-max self-center sm:self-start">
        <button
          onClick={() => {
            setActiveTab('encrypt');
            setOutputText('');
            setErrorMsg('');
            setSuccessMsg('');
            setSelectedFile(null);
          }}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-mono select-none cursor-pointer transition-all duration-150 ${
            activeTab === 'encrypt'
              ? 'bg-panel border border-border-hairline text-accent-emerald font-semibold shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🔐</span> Encrypt Studio
        </button>
        <button
          onClick={() => {
            setActiveTab('decrypt');
            setOutputText('');
            setErrorMsg('');
            setSuccessMsg('');
            setSelectedFile(null);
          }}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-mono select-none cursor-pointer transition-all duration-150 ${
            activeTab === 'decrypt'
              ? 'bg-panel border border-border-hairline text-accent-emerald font-semibold shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🔓</span> Decrypt Studio
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: Input Configuration & Controls              */}
        {/* ======================================================== */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {activeTab === 'encrypt' ? 'Input Data Plaintext' : 'Encrypted Ciphertext Ingestion'}
              </h2>
              {inputType === 'text' && (
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {inputLength} characters
                </span>
              )}
            </div>

            {/* Input Type selection */}
            <div className="flex bg-zinc-900 border border-border-hairline/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setInputType('text');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`px-3 py-1 rounded text-[10px] font-mono select-none cursor-pointer transition-all ${
                  inputType === 'text'
                    ? 'bg-zinc-800 text-accent-emerald font-semibold border border-zinc-700/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputType('file');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`px-3 py-1 rounded text-[10px] font-mono select-none cursor-pointer transition-all ${
                  inputType === 'file'
                    ? 'bg-zinc-800 text-accent-emerald font-semibold border border-zinc-700/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                File (.enc)
              </button>
            </div>
          </div>

          {/* Text Area Input */}
          {inputType === 'text' ? (
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={
                  activeTab === 'encrypt'
                    ? 'Type or paste plaintext logs, JSON configs, or sensitive strings to encrypt locally...'
                    : 'Paste the encrypted Base64/Hex payload, JSON envelope, or concatenated payload to decrypt...'
                }
                rows={9}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 outline-none rounded-lg p-3.5 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all"
              />
              {!inputText && (
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                </div>
              )}
            </div>
          ) : (
            /* File Drag & Drop Sandbox */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col justify-center items-center gap-3 cursor-pointer text-center transition-all ${
                isDragOver
                  ? 'border-accent-emerald bg-accent-emerald/5'
                  : 'border-border-hairline hover:border-zinc-700 hover:bg-zinc-900/10'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept={activeTab === 'decrypt' ? '.enc' : '*'}
              />
              {selectedFile ? (
                <>
                  <span className="text-3xl">📄</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold font-mono text-zinc-200 truncate max-w-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="mt-2 px-3 py-1 bg-red-950/40 border border-red-900/40 text-red-400 text-[10px] font-mono rounded-md hover:bg-red-950/80 transition-colors"
                  >
                    Remove File
                  </button>
                </>
              ) : (
                <>
                  <span className="text-3xl text-zinc-650">📥</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-zinc-300 font-sans">
                      Drag & drop file or click to browse
                    </span>
                    <span className="text-[10px] text-zinc-500 font-sans max-w-xs mx-auto leading-relaxed">
                      {activeTab === 'encrypt'
                        ? 'Securely encrypt configurations, secrets, or binary files. Capped at 5MB.'
                        : 'Upload an useUtils .enc encrypted payload file to restore.'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Key Credentials Panel */}
          <div className="flex flex-col gap-3.5 border-t border-border-hairline/60 pt-4">
            
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">
                Key Credentials
              </label>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKeyType('passphrase')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    keyType === 'passphrase'
                      ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  Passphrase
                </button>
                <button
                  type="button"
                  onClick={() => setKeyType('raw')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    keyType === 'raw'
                      ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  Raw Key
                </button>
              </div>
            </div>

            {keyType === 'passphrase' ? (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter decryption/encryption password..."
                    className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg py-2.5 pl-3.5 pr-28 text-xs md:text-sm font-mono text-zinc-200 leading-relaxed focus:ring-1 focus:ring-zinc-800 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded border border-zinc-700/60 transition-colors font-mono cursor-pointer"
                    >
                      {showPassphrase ? 'Hide' : 'Show'}
                    </button>
                    {passphrase && (
                      <button
                        type="button"
                        onClick={() => setPassphrase('')}
                        className="text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 transition-colors font-mono cursor-pointer px-2 py-0.5"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={rawKey}
                    onChange={(e) => setRawKey(e.target.value)}
                    placeholder="Paste raw symmetric key (Hex/Base64)..."
                    className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg py-2.5 pl-3.5 pr-20 text-xs md:text-sm font-mono text-zinc-200 leading-relaxed focus:ring-1 focus:ring-zinc-800 transition-all"
                  />
                  {rawKey && (
                    <button
                      type="button"
                      onClick={() => setRawKey('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded border border-zinc-700/60 transition-colors font-mono cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Trigger button for Files */}
          {inputType === 'file' && selectedFile && (
            <button
              type="button"
              onClick={processFileCrypto}
              className="w-full py-2.5 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md active:scale-98"
            >
              {activeTab === 'encrypt' ? 'Encrypt Uploaded File' : 'Decrypt Uploaded File'}
            </button>
          )}

          {/* Collapsible Advanced Settings */}
          <div className="border-t border-border-hairline/60 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 uppercase font-semibold cursor-pointer transition-colors"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              <span>Advanced Parameters</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 animate-fade-in p-4 bg-zinc-950/40 border border-border-hairline/60 rounded-lg">
                
                {/* Mode Option */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                    AES Block Mode
                  </label>
                  <div className="flex gap-1.5 bg-zinc-900/60 p-0.5 border border-border-hairline/80 rounded-md w-max">
                    <button
                      type="button"
                      onClick={() => setAesMode('AES-GCM')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        aesMode === 'AES-GCM'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      AES-GCM (Auth)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAesMode('AES-CBC')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        aesMode === 'AES-CBC'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      AES-CBC
                    </button>
                  </div>
                </div>

                {/* Key Size */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                    Key Bit Length
                  </label>
                  <div className="flex gap-1 bg-zinc-900/60 p-0.5 border border-border-hairline/80 rounded-md w-max">
                    {([128, 192, 256] as const).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setKeySize(size)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                          keySize === size
                            ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output Encoding Payload Types */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                    Payload Structure
                  </label>
                  <div className="flex gap-1 bg-zinc-900/60 p-0.5 border border-border-hairline/80 rounded-md w-max">
                    <button
                      type="button"
                      onClick={() => setPayloadType('concatenated')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        payloadType === 'concatenated'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Concatenated
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayloadType('json')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        payloadType === 'json'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      JSON Envelope
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayloadType('raw')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        payloadType === 'raw'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Raw Text
                    </button>
                  </div>
                </div>

                {/* Output Text Formatting */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                    Text Output Encoding
                  </label>
                  <div className="flex gap-1.5 bg-zinc-900/60 p-0.5 border border-border-hairline/80 rounded-md w-max">
                    <button
                      type="button"
                      onClick={() => setOutputFormat('base64')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        outputFormat === 'base64'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Base64
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputFormat('hex')}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        outputFormat === 'hex'
                          ? 'bg-zinc-800 text-accent-emerald font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Hex
                    </button>
                  </div>
                </div>

                {/* PBKDF2 Iterations */}
                {keyType === 'passphrase' && (
                  <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                      PBKDF2 Iteration Rounds
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1000"
                        max="200000"
                        step="1000"
                        value={iterations}
                        onChange={(e) => setIterations(parseInt(e.target.value))}
                        className="w-full accent-accent-emerald cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 border border-border-hairline rounded min-w-[65px] text-center">
                        {iterations.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Custom Salt */}
                {keyType === 'passphrase' && (
                  <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                        Salt Vector (Hex)
                      </label>
                      <div className="flex gap-1.5 bg-zinc-900/60 p-0.5 border border-border-hairline/80 rounded">
                        <button
                          type="button"
                          onClick={() => {
                            setSaltMode('auto');
                            setCustomSalt('');
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                            saltMode === 'auto' ? 'bg-zinc-800 text-accent-emerald' : 'text-zinc-500'
                          }`}
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          onClick={() => setSaltMode('custom')}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                            saltMode === 'custom' ? 'bg-zinc-800 text-accent-emerald' : 'text-zinc-500'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>
                    {saltMode === 'custom' && (
                      <input
                        type="text"
                        placeholder="Paste hex salt (e.g. a1b2c3d4e5f60708...)"
                        value={customSalt}
                        onChange={(e) => setCustomSalt(e.target.value)}
                        className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded px-3 py-1.5 text-xs font-mono text-zinc-300 transition-all"
                      />
                    )}
                  </div>
                )}

                {/* Custom IV */}
                <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-zinc-500 font-semibold uppercase">
                      Initialization Vector IV (Hex)
                    </label>
                    <div className="flex gap-1.5 bg-zinc-900/60 p-0.5 border border-border-hairline/80 rounded">
                      <button
                        type="button"
                        onClick={() => {
                          setIvMode('auto');
                          setCustomIv('');
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                          ivMode === 'auto' ? 'bg-zinc-800 text-accent-emerald' : 'text-zinc-500'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setIvMode('custom')}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                          ivMode === 'custom' ? 'bg-zinc-800 text-accent-emerald' : 'text-zinc-500'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                  {ivMode === 'custom' && (
                    <input
                      type="text"
                      placeholder={`Paste hex IV (e.g. ${aesMode === 'AES-GCM' ? '12 bytes/24 hex characters' : '16 bytes/32 hex characters'})`}
                      value={customIv}
                      onChange={(e) => setCustomIv(e.target.value)}
                      className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded px-3 py-1.5 text-xs font-mono text-zinc-300 transition-all"
                    />
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Processed Output & Cryptography Blueprint */}
        {/* ======================================================== */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {activeTab === 'encrypt' ? 'Encrypted Secure Output' : 'Restored Decrypted Plaintext'}
              </h2>
              {inputType === 'text' && outputText && !errorMsg && (
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {outputLength} characters
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {inputType === 'text' && outputText && !errorMsg && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const success = copyToClipboard(outputText);
                      if (success) triggerCopyFeedback('output');
                    }}
                    className="flex items-center gap-1 px-3 py-0.5 text-[10px] bg-accent-emerald/15 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold"
                  >
                    {copyFeedback['output'] ? 'Copied ✓' : 'Copy'}
                  </button>
                  {activeTab === 'encrypt' && (
                    <button
                      type="button"
                      onClick={handleGenerateShareLink}
                      className="flex items-center gap-1 px-3 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/60 rounded cursor-pointer transition-all font-mono"
                    >
                      {copyFeedback['shareLink'] ? 'Copied URL ✓' : 'Share Link'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Main Feedback logs */}
          {errorMsg && (
            <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-lg text-xs font-mono text-red-400">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[9px] text-red-500 mb-1">
                <span>⚠️</span>
                <span>Security Diagnostic Alert</span>
              </div>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-xs font-mono text-emerald-400">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[9px] text-emerald-500 mb-1">
                <span>✓</span>
                <span>Process Notification</span>
              </div>
              {successMsg}
            </div>
          )}

          {/* Interactive Output display depending on Output Mode */}
          {inputType === 'text' ? (
            <div className="flex-grow min-h-[220px] bg-canvas border border-border-hairline rounded-lg p-3.5 relative overflow-auto flex flex-col">
              <textarea
                value={outputText}
                readOnly
                placeholder={
                  activeTab === 'encrypt'
                    ? 'Encrypted output will generate dynamically in real-time as you configure parameters...'
                    : 'Restored original text will populate here instantly upon successful decryption...'
                }
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all flex-grow"
              />
              {outputText && (
                <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                </div>
              )}
            </div>
          ) : (
            /* File Output Panel */
            <div className="flex-grow min-h-[220px] bg-canvas border border-border-hairline rounded-lg p-5 flex flex-col justify-center items-center gap-4 text-center">
              <span className="text-4xl">💾</span>
              <div className="flex flex-col gap-1 max-w-xs">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono">
                  File Processing Sandbox
                </h4>
                <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                  Payload files are encrypted and packed with non-sensitive headers to enable seamless recovery.
                </p>
              </div>

              {processedFileUrl && processedFileName && (
                <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                  <a
                    href={processedFileUrl}
                    download={processedFileName}
                    className="w-full py-2 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold rounded-lg transition-all cursor-pointer text-center block shadow-md active:scale-98"
                  >
                    Download Output File
                  </a>
                  <span className="text-[9px] font-mono text-zinc-500 italic block">
                    Name: {processedFileName}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cryptography Metadata & Generated variables */}
          {(!errorMsg && (activeIvHex || activeSaltHex || derivedKeyHex)) && (
            <div className="border border-border-hairline bg-zinc-950/20 rounded-lg p-4 flex flex-col gap-3 font-mono text-[11px] text-zinc-400">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider border-b border-border-hairline pb-1.5 mb-1">
                Cryptographic Diagnostics
              </span>

              {derivedKeyHex && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-zinc-500 shrink-0 select-none">Derived Key:</span>
                  <span className="text-right text-zinc-300 break-all select-all font-mono">
                    {derivedKeyHex}
                  </span>
                </div>
              )}

              {activeSaltHex && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-zinc-500 shrink-0 select-none">Salt:</span>
                  <span className="text-right text-zinc-300 break-all select-all font-mono">
                    {activeSaltHex}
                  </span>
                </div>
              )}

              {activeIvHex && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-zinc-500 shrink-0 select-none">IV vector:</span>
                  <span className="text-right text-zinc-300 break-all select-all font-mono">
                    {activeIvHex}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* High-Entropy Utility Generators */}
          <div className="border border-border-hairline rounded-lg bg-zinc-950/40 p-4 flex flex-col gap-4">
            
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider font-mono">
              Secure Key & Passphrase Generators
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Passphrase Generator */}
              <div className="flex flex-col gap-2 bg-zinc-900/50 border border-border-hairline/60 rounded-md p-3">
                <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                  Passphrase Generator
                </span>
                
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>Length: {genLength}</span>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      value={genLength}
                      onChange={(e) => setGenLength(parseInt(e.target.value))}
                      className="w-24 accent-accent-emerald cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-500">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={genIncludeNumbers}
                        onChange={(e) => setGenIncludeNumbers(e.target.checked)}
                        className="accent-accent-emerald"
                      />
                      Numbers
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={genIncludeSymbols}
                        onChange={(e) => setGenIncludeSymbols(e.target.checked)}
                        className="accent-accent-emerald"
                      />
                      Symbols
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="w-full py-1 mt-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 font-mono text-[10px] rounded hover:text-accent-emerald cursor-pointer transition-colors"
                  >
                    Generate Passphrase
                  </button>
                </div>
              </div>

              {/* Raw Key Generator */}
              <div className="flex flex-col gap-2 bg-zinc-900/50 border border-border-hairline/60 rounded-md p-3 justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                    Symmetric Key Generator
                  </span>
                  <p className="text-[9px] text-zinc-500 font-sans leading-relaxed mt-1">
                    Generates cryptographically random keys mapping to the chosen bit length ({keySize}-bit) in the specified output encoding ({outputFormat.toUpperCase()}).
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="w-full py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 font-mono text-[10px] rounded hover:text-accent-emerald cursor-pointer transition-colors mt-2"
                >
                  Generate {keySize}-Bit Key
                </button>
              </div>
            </div>

          </div>

          {/* Cryptography Pipeline Blueprint Visualizer */}
          <div className="border border-border-hairline rounded-lg bg-zinc-950/20 p-4 flex flex-col gap-3 font-mono text-[10px] text-zinc-500 select-none">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 border-b border-border-hairline pb-1.5 mb-1">
              Crypto Blueprint Pipeline
            </span>

            {activeTab === 'encrypt' ? (
              <div className="flex flex-col gap-2 leading-relaxed">
                {keyType === 'passphrase' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-650">1. Key Derivation:</span>
                      <span className="text-zinc-400">Passphrase</span>
                      <span className="text-zinc-650">+</span>
                      <span className="text-zinc-400">Salt</span>
                      <span className="text-zinc-650">→</span>
                      <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1 rounded font-semibold">
                        PBKDF2 ({iterations.toLocaleString()} SHA-256)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-650">2. Encryption:</span>
                      <span className="text-zinc-400">Input Plaintext</span>
                      <span className="text-zinc-650">+</span>
                      <span className="text-zinc-400">IV Vector</span>
                      <span className="text-zinc-650">+</span>
                      <span className="text-zinc-350">Derived {keySize}-bit Key</span>
                      <span className="text-zinc-650">→</span>
                      <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1 rounded font-semibold">
                        {aesMode}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-650">1. Encryption:</span>
                    <span className="text-zinc-400">Input Plaintext</span>
                    <span className="text-zinc-650">+</span>
                    <span className="text-zinc-400">IV Vector</span>
                    <span className="text-zinc-650">+</span>
                    <span className="text-zinc-350">Raw {keySize}-bit Key</span>
                    <span className="text-zinc-650">→</span>
                    <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1 rounded font-semibold">
                      {aesMode}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-650">3. Serialization:</span>
                  <span className="text-zinc-400">Ciphertext Bytes</span>
                  {payloadType === 'concatenated' && <span className="text-zinc-650">+ Headers (Salt + IV)</span>}
                  <span className="text-zinc-650">→</span>
                  <span className="text-zinc-300 font-semibold bg-zinc-900 border border-border-hairline px-1 rounded">
                    {payloadType.toUpperCase()} ({outputFormat.toUpperCase()})
                  </span>
                </div>
              </div>
            ) : (
              /* Decrypt Pipeline Flow */
              <div className="flex flex-col gap-2 leading-relaxed">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-650">1. Extraction:</span>
                  <span className="text-zinc-400">Encrypted Payload String</span>
                  <span className="text-zinc-650">→</span>
                  <span className="text-zinc-300 font-semibold bg-zinc-900 border border-border-hairline px-1 rounded">
                    Parse {payloadType.toUpperCase()}
                  </span>
                  <span className="text-zinc-650">→</span>
                  <span className="text-zinc-400">Ciphertext</span>
                  <span className="text-zinc-650">+</span>
                  <span className="text-zinc-400">IV</span>
                  {keyType === 'passphrase' && <span className="text-zinc-650">+ Salt</span>}
                </div>

                {keyType === 'passphrase' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-650">2. Key Derivation:</span>
                      <span className="text-zinc-400">Passphrase</span>
                      <span className="text-zinc-650">+</span>
                      <span className="text-zinc-400">Extracted Salt</span>
                      <span className="text-zinc-650">→</span>
                      <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1 rounded font-semibold">
                        PBKDF2 ({iterations.toLocaleString()} SHA-256)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-650">3. Decryption:</span>
                      <span className="text-zinc-400">Ciphertext</span>
                      <span className="text-zinc-650">+</span>
                      <span className="text-zinc-400">Extracted IV</span>
                      <span className="text-zinc-650">+</span>
                      <span className="text-zinc-350">Derived Key</span>
                      <span className="text-zinc-650">→</span>
                      <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1 rounded font-semibold">
                        {aesMode} Decrypt
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-650">2. Decryption:</span>
                    <span className="text-zinc-400">Ciphertext</span>
                    <span className="text-zinc-650">+</span>
                    <span className="text-zinc-400">Extracted IV</span>
                    <span className="text-zinc-650">+</span>
                    <span className="text-zinc-350">Raw Key Input</span>
                    <span className="text-zinc-650">→</span>
                    <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1 rounded font-semibold">
                      {aesMode} Decrypt
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>



        </div>

      </div>

    </div>
  );
};
