import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
}

interface LogEntry {
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface PeerTransferState {
  peerId: string;
  status: 'connecting' | 'connected' | 'streaming' | 'complete' | 'failed';
  bytesTransferred: number;
  speed: number;
  eta: number;
  progress: number;
}

interface P2PShareProps {
  roomId?: string;
}

const CHUNK_SIZE = 16384; // 16KB WebRTC chunk size
const BUFFER_THRESHOLD = 65536; // 64KB threshold for backpressure

export const P2PShare: React.FC<P2PShareProps> = ({ roomId: initialRoomId }) => {
  const [role, setRole] = useState<'sender' | 'receiver'>(initialRoomId ? 'receiver' : 'sender');
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  
  // Client ID
  const [myPeerId] = useState<string>(() => {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    return 'peer_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  });
  
  // 1-to-Many Receivers State (used by Sender)
  const [receiverPeers, setReceiverPeers] = useState<Record<string, PeerTransferState>>({});
  
  // Single Receiver state (used by Receiver)
  const [receiverBytesTransferred, setReceiverBytesTransferred] = useState<number>(0);
  const [receiverSpeed, setReceiverSpeed] = useState<number>(0);
  const [receiverEta, setReceiverEta] = useState<number>(0);
  
  // Overall Macro Connection Status
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'connected' | 'streaming' | 'complete' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  // Console logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Clipboard state
  const [copied, setCopied] = useState<boolean>(false);

  // WebRTC / WebSocket Refs
  const wsRef = useRef<WebSocket | null>(null);
  const connectionsRef = useRef<Map<string, { pc: RTCPeerConnection; channel: RTCDataChannel }>>(new Map());
  const fileChunksRef = useRef<ArrayBuffer[]>([]);
  const connectionTimeoutRef = useRef<any>(null);
  const completedPeersRef = useRef<Set<string>>(new Set());

  // Helper to append logs
  const addLog = useCallback((text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs((prev) => [...prev, { text: `[${time}] ${text}`, type }]);
  }, []);

  // Scroll only the log container down, preventing browser window scroll-jump
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Clean up WebRTC & WebSocket on unmount
  const cleanup = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // Close all peer connections
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      try {
        conn.channel.close();
        conn.pc.close();
        addLog(`Closed P2P connection with peer ${peerId}`, 'info');
      } catch (e) {
        console.warn(`Error closing connection for peer ${peerId}:`, e);
      }
    }
    connectionsRef.current.clear();
    completedPeersRef.current.clear();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    fileChunksRef.current = [];
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  }, [downloadUrl, addLog]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Get active room share link
  const getShareLink = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/tools/p2p-share/${roomId}`;
  }, [roomId]);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format speed (MB/s or KB/s)
  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    if (bytesPerSec < k * k) {
      return (bytesPerSec / k).toFixed(1) + ' KB/s';
    }
    return (bytesPerSec / (k * k)).toFixed(1) + ' MB/s';
  };

  // Format remaining time (ETA)
  const formatEta = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '--:--';
    if (seconds < 60) return Math.ceil(seconds) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
  };

  // Copy share link to clipboard
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(getShareLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addLog('Copied share link to clipboard.', 'info');
    }
  };

  // Handle keyboard shortcut for copying (⌘ C or Ctrl C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && status === 'waiting') {
        e.preventDefault();
        handleCopyLink();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, roomId]);

  // Dynamic Room ID initialization on receiver
  useEffect(() => {
    if (!roomId && typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== 'p2p-share') {
        setRoomId(lastPart);
        setRole('receiver');
      }
    }
  }, [initialRoomId]);

  // Start Connection Process
  const initiateConnection = useCallback(async (activeRoom: string, activeRole: 'sender' | 'receiver', activeFile?: File) => {
    cleanup();
    setStatus('connecting');
    setError(null);
    setReceiverBytesTransferred(0);
    setReceiverSpeed(0);
    setReceiverEta(0);
    setReceiverPeers({});
    setLogs([]);

    const fileMeta = activeFile ? {
      name: activeFile.name,
      size: activeFile.size,
      mimeType: activeFile.type || 'application/octet-stream'
    } : null;

    if (fileMeta) {
      setMetadata(fileMeta);
    }

    addLog(`Initializing ${activeRole} connection process...`, 'info');
    addLog(`Room ID: ${activeRoom} (Your Peer ID: ${myPeerId})`, 'info');

    // Create STUN configuration
    const peerConfiguration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    // Determine signaling server URL
    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const defaultBase = isDev ? 'ws://localhost:8787' : 'wss://signaling.useutils.com';
    const signalingBase = import.meta.env.PUBLIC_SIGNALING_URL || defaultBase;
    
    // Append room, peer, and role parameters
    const wsUrl = `${signalingBase}?room=${activeRoom}&peer=${myPeerId}&role=${activeRole}`;

    addLog(`Connecting to signaling server: ${signalingBase}...`, 'info');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Queue for buffering candidates arriving before SDP descriptions
      const iceCandidatesQueues = new Map<string, RTCIceCandidateInit[]>();

      ws.onopen = () => {
        addLog('Connected to signaling server.', 'success');
        if (activeRole === 'sender') {
          setStatus('waiting');
          addLog('Waiting for receivers to connect...', 'info');
        }
      };

      ws.onerror = () => {
        addLog('Signaling server WebSocket error.', 'error');
        setStatus('failed');
        setError('Failed to establish connection to signaling server.');
      };

      ws.onclose = () => {
        addLog('Connection to signaling server closed.', 'warn');
      };

      // Handle signaling messages
      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        const senderId = message.senderId;

        if (message.type === 'system-error') {
          addLog(`Server Error: ${message.message}`, 'error');
          setStatus('failed');
          setError(message.message);
          cleanup();
          return;
        }

        // Welcome payload lists existing clients
        if (message.type === 'room-welcome') {
          addLog(`Room joined. Current nodes: ${message.peers.length}`, 'info');
          
          if (activeRole === 'sender') {
            // As sender, initiate offers to any existing receivers in the room
            for (const peer of message.peers) {
              if (peer.id !== myPeerId && peer.role === 'receiver') {
                addLog(`Found receiver ${peer.id} already in room. Initiating handshake...`, 'info');
                setupWebRTCConnection(peer.id, true);
              }
            }
          } else {
            // As receiver, check if there is an active sender in the room
            const senderExists = message.peers.some((p: any) => p.role === 'sender');
            if (!senderExists) {
              addLog('No sender found in this room. Room link is invalid or expired.', 'error');
              setStatus('failed');
              setError('Sender is offline. Please make sure the sender keeps their tab open and request a new link.');
              cleanup();
            } else {
              addLog('Sender detected. Waiting for connection offer...', 'info');
            }
          }
        }

        // A new peer joins the room
        if (message.type === 'peer-joined') {
          addLog(`Peer joined room: ${message.peerId} (${message.role}). Total nodes: ${message.totalPeers}`, 'info');
          
          if (activeRole === 'sender' && message.role === 'receiver') {
            addLog(`Initiating WebRTC offer to receiver ${message.peerId}...`, 'info');
            setupWebRTCConnection(message.peerId, true);
          }
        }

        // Receiver receives offer from sender
        if (message.type === 'offer' && activeRole === 'receiver') {
          addLog(`WebRTC Offer received from sender (${senderId}). Creating Answer...`, 'info');
          await setupWebRTCConnection(senderId, false, message.sdp);
        }

        // Sender receives answer from receiver
        if (message.type === 'answer' && activeRole === 'sender') {
          addLog(`WebRTC Answer received from receiver (${senderId}). Completing handshake...`, 'info');
          const conn = connectionsRef.current.get(senderId);
          if (conn && conn.pc) {
            await conn.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            
            // Drain buffered candidates
            const queue = iceCandidatesQueues.get(senderId) || [];
            while (queue.length > 0) {
              const candidate = queue.shift();
              if (candidate) {
                await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }
            iceCandidatesQueues.delete(senderId);
          }
        }

        // Receive network candidates
        if (message.type === 'candidate') {
          const conn = connectionsRef.current.get(senderId);
          if (conn && conn.pc && conn.pc.remoteDescription) {
            try {
              await conn.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            } catch (e) {
              console.warn('Error adding ICE candidate:', e);
            }
          } else {
            // Buffer candidate
            if (!iceCandidatesQueues.has(senderId)) {
              iceCandidatesQueues.set(senderId, []);
            }
            iceCandidatesQueues.get(senderId)!.push(message.candidate);
          }
        }

        // A peer leaves the room
        if (message.type === 'peer-left') {
          addLog(`Peer ${message.peerId} (${message.role || 'receiver'}) left the room.`, 'warn');
          
          if (activeRole === 'sender') {
            // Clean up individual connection
            const conn = connectionsRef.current.get(message.peerId);
            if (conn) {
              conn.channel.close();
              conn.pc.close();
              connectionsRef.current.delete(message.peerId);
            }
            // Update lists
            setReceiverPeers(prev => {
              const updated = { ...prev };
              const peer = updated[message.peerId];
              if (peer) {
                updated[message.peerId] = {
                  ...peer,
                  status: peer.status === 'complete' ? 'complete' : 'failed'
                };
              }
              return updated;
            });
          } else {
            // If receiver, only fail if the sender left!
            if (message.role === 'sender') {
              if (status !== 'complete') {
                setStatus('failed');
                setError('Sender left the room before transfer completed.');
              }
              cleanup();
            }
          }
        }
      };

      // Set up individual WebRTC connection
      const setupWebRTCConnection = async (targetPeerId: string, isInitiator: boolean, remoteSdp?: RTCSessionDescriptionInit) => {
        const pc = new RTCPeerConnection(peerConfiguration);
        
        // Add to peer state list for sender UI
        if (activeRole === 'sender') {
          setReceiverPeers(prev => ({
            ...prev,
            [targetPeerId]: {
              peerId: targetPeerId,
              status: 'connecting',
              bytesTransferred: 0,
              speed: 0,
              eta: 0,
              progress: 0
            }
          }));
        }

        pc.onicecandidate = (event) => {
          if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'candidate',
              targetId: targetPeerId,
              candidate: event.candidate
            }));
          }
        };

        pc.onconnectionstatechange = () => {
          addLog(`WebRTC state with peer ${targetPeerId} changed to: ${pc.connectionState}`, 'info');
          
          if (pc.connectionState === 'connected') {
            setStatus('connected');
            if (activeRole === 'sender') {
              setReceiverPeers(prev => {
                const peer = prev[targetPeerId];
                if (!peer) return prev;
                return {
                  ...prev,
                  [targetPeerId]: { ...peer, status: 'connected' }
                };
              });
            }
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            if (activeRole === 'sender') {
              setReceiverPeers(prev => {
                const peer = prev[targetPeerId];
                if (!peer) return prev;
                return {
                  ...prev,
                  [targetPeerId]: { ...peer, status: 'failed' }
                };
              });
            } else {
              if (status !== 'complete') {
                setStatus('failed');
                setError('Direct P2P connection failed.');
              }
              cleanup();
            }
          }
        };

        if (isInitiator) {
          // Create Data Channel
          addLog(`Creating RTCDataChannel for peer ${targetPeerId}...`, 'info');
          const channel = pc.createDataChannel('file-transfer', { ordered: true });
          
          connectionsRef.current.set(targetPeerId, { pc, channel });
          bindDataChannelEvents(channel, targetPeerId);

          // Create local offer description
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'offer',
              targetId: targetPeerId,
              sdp: offer
            }));
          }
        } else {
          // Receiver binds remote offer
          await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp!));

          // Set remote channel event handler
          pc.ondatachannel = (event) => {
            addLog(`RTCDataChannel offered by sender (${targetPeerId}).`, 'info');
            const channel = event.channel;
            connectionsRef.current.set(targetPeerId, { pc, channel });
            bindDataChannelEvents(channel, targetPeerId);
          };

          // Create and send answer description
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'answer',
              targetId: targetPeerId,
              sdp: answer
            }));
          }

          // Drain buffered candidates for this sender
          const queue = iceCandidatesQueues.get(targetPeerId) || [];
          while (queue.length > 0) {
            const candidate = queue.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
          iceCandidatesQueues.delete(targetPeerId);
        }
      };

      // Bind Data Channel events
      const bindDataChannelEvents = (channel: RTCDataChannel, partnerId: string) => {
        channel.binaryType = 'arraybuffer';

        channel.onopen = () => {
          addLog(`P2P Data Channel opened with peer ${partnerId}.`, 'success');
          if (activeRole === 'sender' && activeFile) {
            startStreamingFile(activeFile, channel, partnerId);
          }
        };

        channel.onclose = () => {
          if (completedPeersRef.current.has(partnerId)) {
            addLog(`P2P Data Channel teardown completed for peer ${partnerId}.`, 'info');
            return;
          }
          addLog(`P2P Data Channel closed with peer ${partnerId}.`, 'warn');
        };

        channel.onerror = (e) => {
          if (completedPeersRef.current.has(partnerId)) {
            return;
          }
          addLog(`P2P Data Channel error occurred with peer ${partnerId}.`, 'error');
          console.error(e);
        };

        // Listen for receiving data (for receiver role)
        if (activeRole === 'receiver') {
          let lastTime = Date.now();
          let lastBytes = 0;

          channel.onmessage = (event) => {
            const data = event.data;

            if (typeof data === 'string') {
              const msg = JSON.parse(data);

              if (msg.type === 'metadata') {
                addLog(`File metadata received: ${msg.name} (${formatBytes(msg.size)})`, 'info');
                setMetadata({
                  name: msg.name,
                  size: msg.size,
                  mimeType: msg.mimeType
                });
                setReceiverBytesTransferred(0);
                fileChunksRef.current = [];
                setStatus('streaming');
                addLog('Started streaming file packets...', 'info');
                lastTime = Date.now();
                lastBytes = 0;
              } else if (msg.type === 'eof') {
                addLog('All file chunks received. Reconstructing blob...', 'success');
                completedPeersRef.current.add(partnerId);
                
                const blob = new Blob(fileChunksRef.current, { type: metadata?.mimeType || 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setStatus('complete');
                addLog('File reconstructed successfully. Ready for download.', 'success');
                
                // Cleanup connection objects
                cleanup();
              }
            } else {
              // Binary ArrayBuffer packet
              fileChunksRef.current.push(data);
              
              setReceiverBytesTransferred((prev) => {
                const updated = prev + data.byteLength;
                
                // Track transfer speeds & remaining time
                const now = Date.now();
                const elapsed = (now - lastTime) / 1000;
                if (elapsed >= 0.5) {
                  const bytesReceived = updated - lastBytes;
                  const currentSpeed = bytesReceived / elapsed;
                  setReceiverSpeed(currentSpeed);

                  const totalSize = metadata?.size || 1;
                  const remaining = totalSize - updated;
                  setReceiverEta(currentSpeed > 0 ? remaining / currentSpeed : Infinity);

                  lastTime = now;
                  lastBytes = updated;
                }
                
                return updated;
              });
            }
          };
        }
      };

      // File streaming implementation (Sender)
      const startStreamingFile = async (sendFile: File, channel: RTCDataChannel, targetPeerId: string) => {
        addLog(`Broadcasting file metadata to receiver ${targetPeerId}...`, 'info');
        channel.send(
          JSON.stringify({
            type: 'metadata',
            name: sendFile.name,
            size: sendFile.size,
            mimeType: sendFile.type || 'application/octet-stream'
          })
        );

        // Update peer state to streaming
        setReceiverPeers(prev => {
          const peer = prev[targetPeerId];
          if (!peer) return prev;
          return {
            ...prev,
            [targetPeerId]: { ...peer, status: 'streaming' }
          };
        });

        setStatus('streaming');
        addLog(`Streaming file content chunks to receiver ${targetPeerId}...`, 'info');

        let offset = 0;
        let lastTime = Date.now();
        let lastBytes = 0;
        
        channel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

        // Promise to handle backpressure
        const waitForBufferLow = () => {
          return new Promise<void>((resolve) => {
            if (channel.bufferedAmount <= BUFFER_THRESHOLD) {
              resolve();
            } else {
              channel.onbufferedamountlow = () => {
                channel.onbufferedamountlow = null;
                resolve();
              };
            }
          });
        };

        try {
          while (offset < sendFile.size) {
            if (channel.bufferedAmount > BUFFER_THRESHOLD * 4) {
              await waitForBufferLow();
            }

            const chunkSlice = sendFile.slice(offset, offset + CHUNK_SIZE);
            const arrayBuffer = await chunkSlice.arrayBuffer();
            
            if (channel.readyState !== 'open') {
              throw new Error('Data channel closed unexpectedly during stream.');
            }

            channel.send(arrayBuffer);
            offset += arrayBuffer.byteLength;

            // Track individual peer progress, speed, and ETA
            const currentOffset = offset;
            setReceiverPeers(prev => {
              const peer = prev[targetPeerId];
              if (!peer) return prev;

              const now = Date.now();
              const elapsed = (now - lastTime) / 1000;
              let currentSpeed = peer.speed;
              let currentEta = peer.eta;

              if (elapsed >= 0.5) {
                const bytesSent = currentOffset - lastBytes;
                currentSpeed = bytesSent / elapsed;
                
                const remaining = sendFile.size - currentOffset;
                currentEta = currentSpeed > 0 ? remaining / currentSpeed : Infinity;

                lastTime = now;
                lastBytes = currentOffset;
              }

              return {
                ...prev,
                [targetPeerId]: {
                  ...peer,
                  bytesTransferred: currentOffset,
                  speed: currentSpeed,
                  eta: currentEta,
                  progress: (currentOffset / sendFile.size) * 100
                }
              };
            });
          }

          // File transfer complete, send EOF signal
          if (channel.readyState === 'open') {
            channel.send(JSON.stringify({ type: 'eof' }));
            addLog(`File streamed completely to receiver ${targetPeerId}.`, 'success');
            completedPeersRef.current.add(targetPeerId);
            
            // Mark peer as complete
            setReceiverPeers(prev => {
              const peer = prev[targetPeerId];
              if (!peer) return prev;
              return {
                ...prev,
                [targetPeerId]: {
                  ...peer,
                  status: 'complete',
                  progress: 100,
                  bytesTransferred: sendFile.size
                }
              };
            });

            // Adjust macro status: if all active peers are complete, set status to complete
            setReceiverPeers(prev => {
              const allPeers = Object.values(prev);
              const allCompleted = allPeers.length > 0 && allPeers.every(p => p.status === 'complete');
              if (allCompleted) {
                setStatus('complete');
              }
              return prev;
            });
          }
        } catch (err: any) {
          addLog(`Stream Error with receiver ${targetPeerId}: ${err.message}`, 'error');
          setReceiverPeers(prev => {
            const peer = prev[targetPeerId];
            if (!peer) return prev;
            return {
              ...prev,
              [targetPeerId]: { ...peer, status: 'failed' }
            };
          });
        }
      };

    } catch (e: any) {
      addLog(`Setup failed: ${e.message}`, 'error');
      setStatus('failed');
      setError(`Failed to set up peer connection: ${e.message}`);
    }
  }, [cleanup, addLog, status, metadata, myPeerId]);

  // Connect automatically on receiver side once component mounts and roomId is resolved
  useEffect(() => {
    if (role === 'receiver' && roomId) {
      initiateConnection(roomId, 'receiver');
    }
  }, [role, roomId]);

  // Handle local file drop/select (Sender)
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setMetadata({
      name: selectedFile.name,
      size: selectedFile.size,
      mimeType: selectedFile.type || 'application/octet-stream'
    });

    // Generate secure roomId (12-character random hex string)
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    const generatedRoom = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setRoomId(generatedRoom);
    
    // Connect to room as sender
    initiateConnection(generatedRoom, 'sender', selectedFile);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Reset tool state
  const handleReset = () => {
    cleanup();
    setFile(null);
    setMetadata(null);
    setRoomId(initialRoomId || '');
    setRole(initialRoomId ? 'receiver' : 'sender');
    setStatus('idle');
    setReceiverBytesTransferred(0);
    setReceiverSpeed(0);
    setReceiverEta(0);
    setReceiverPeers({});
    setError(null);
    setLogs([]);
    if (initialRoomId) {
      initiateConnection(initialRoomId, 'receiver');
    }
  };

  // Compute receiver progress percentage
  const totalSize = metadata?.size || 0;
  const receiverProgressPercent = totalSize > 0 ? Math.min((receiverBytesTransferred / totalSize) * 100, 100) : 0;

  // Render a single receiver transfer item
  const renderPeerTransfer = (peer: PeerTransferState) => {
    return (
      <div key={peer.peerId} className="bg-zinc-950/40 border border-border-hairline rounded-lg p-4 flex flex-col gap-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-200 truncate font-semibold">Peer: {peer.peerId}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
            peer.status === 'complete' ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' :
            peer.status === 'streaming' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 animate-pulse' :
            peer.status === 'failed' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
            'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}>
            {peer.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
          <div className="bg-zinc-950/60 border border-border-hairline/40 rounded p-1.5 flex flex-col">
            <span>Transferred</span>
            <span className="text-zinc-200 mt-0.5 font-bold">{formatBytes(peer.bytesTransferred)}</span>
          </div>
          <div className="bg-zinc-950/60 border border-border-hairline/40 rounded p-1.5 flex flex-col">
            <span>Speed</span>
            <span className="text-zinc-200 mt-0.5 font-bold">{formatSpeed(peer.speed)}</span>
          </div>
          <div className="bg-zinc-950/60 border border-border-hairline/40 rounded p-1.5 flex flex-col">
            <span>ETA</span>
            <span className="text-zinc-200 mt-0.5 font-bold">
              {peer.status === 'streaming' ? formatEta(peer.eta) : peer.status === 'complete' ? 'Done' : '--:--'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Progress</span>
            <span>{peer.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-zinc-950 border border-zinc-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-accent-emerald h-full rounded-full transition-all duration-300"
              style={{ width: `${peer.progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  const activePeersList = Object.values(receiverPeers);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto">
      
      {/* Left Pane: Ingestion & Control Panel */}
      <div className="flex flex-col gap-6">
        
        {/* Dropzone or Active File Info */}
        <div className="bg-panel border border-border-hairline rounded-xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-border-hairline/60">
            <h3 className="text-sm font-semibold text-zinc-50 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${role === 'sender' ? 'bg-accent-emerald' : 'bg-indigo-400'}`}></span>
              {role === 'sender' ? 'Source File Ingestion' : 'Incoming Stream Payload'}
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider bg-zinc-900 px-2 py-0.5 border border-border-hairline rounded">
              ROLE: {role.toUpperCase()}
            </span>
          </div>

          {role === 'sender' && !file && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-zinc-800 hover:border-accent-emerald/40 hover:bg-zinc-900/10 rounded-lg p-10 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all group"
              onClick={() => document.getElementById('file-picker')?.click()}
            >
              <input
                id="file-picker"
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-accent-emerald group-hover:border-accent-emerald/20 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-200">
                  Drag & drop your file here, or <span className="text-accent-emerald hover:underline">browse</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  Any format, up to 1GB. Direct 1-to-many client streaming.
                </span>
              </div>
            </div>
          )}

          {metadata && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-zinc-950/40 border border-border-hairline rounded-lg flex items-center gap-3.5">
                <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0 flex-grow font-mono text-xs">
                  <span className="text-zinc-200 truncate font-semibold" title={metadata.name}>{metadata.name}</span>
                  <span className="text-zinc-400 mt-0.5">{formatBytes(metadata.size)} • {metadata.mimeType}</span>
                </div>
              </div>

              {role === 'sender' && status !== 'idle' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-zinc-400 font-mono tracking-wider">SHAREABLE RECIPIENT LINK</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareLink()}
                      className="flex-grow bg-zinc-950/60 border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-accent-emerald"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                    <span>Send this link to one or more devices to start transfers</span>
                    <span className="flex items-center gap-1 font-mono">
                      Copy link shortcut: <kbd className="font-mono bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700 text-[9px] text-zinc-400">⌘ C</kbd>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons (Reset/Cancel) */}
          {status !== 'idle' && (
            <div className="flex gap-2 pt-2 border-t border-border-hairline/60">
              <button
                type="button"
                onClick={handleReset}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
                </svg>
                {status === 'complete' || status === 'failed' ? 'Start New Share' : 'Cancel & Reset'}
              </button>
            </div>
          )}
        </div>

        {/* Local Sandboxed Status Pill */}
        <div className="bg-panel border border-border-hairline rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald"></span>
            </span>
            <span className="text-[11px] font-mono text-zinc-300">
              Processed locally in browser. Zero server transmission.
            </span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono bg-zinc-900 border border-border-hairline px-2 py-0.5 rounded">
            100% PRIVATE
          </span>
        </div>

      </div>

      {/* Right Pane: Real-time Stream Dashboard */}
      <div className="flex flex-col gap-6">
        
        {/* Connection Status & Stream Dashboard */}
        <div className="bg-panel border border-border-hairline rounded-xl p-6 flex flex-col gap-5 shadow-sm flex-grow">
          <div className="flex items-center justify-between pb-2 border-b border-border-hairline/60">
            <h3 className="text-sm font-semibold text-zinc-50 flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              P2P Telemetry & State
            </h3>
            
            {/* Status light */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                status === 'idle' ? 'bg-zinc-650' :
                status === 'connecting' || status === 'waiting' ? 'bg-amber-400 animate-pulse' :
                status === 'connected' || status === 'streaming' ? 'bg-accent-emerald animate-pulse' :
                status === 'complete' ? 'bg-accent-emerald' :
                'bg-red-400'
              }`}></span>
              <span className="text-[10px] font-mono text-zinc-300 font-semibold tracking-wider">
                {status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress / Telemetry Section */}
          {status !== 'idle' && (
            <div className="flex flex-col gap-4">
              
              {/* Receiver (Dynamic download progress view) */}
              {role === 'receiver' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-zinc-950/40 border border-border-hairline rounded-lg p-2.5 flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Transferred</span>
                      <span className="text-xs font-bold text-zinc-100">{formatBytes(receiverBytesTransferred)}</span>
                    </div>
                    <div className="bg-zinc-950/40 border border-border-hairline rounded-lg p-2.5 flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Speed</span>
                      <span className="text-xs font-bold text-zinc-100">{formatSpeed(receiverSpeed)}</span>
                    </div>
                    <div className="bg-zinc-950/40 border border-border-hairline rounded-lg p-2.5 flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Remaining</span>
                      <span className="text-xs font-bold text-zinc-100">
                        {status === 'streaming' ? formatEta(receiverEta) : status === 'complete' ? 'Done' : '--:--'}
                      </span>
                    </div>
                  </div>

                  {metadata && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400 px-0.5">
                        <span>Transfer Progress</span>
                        <span>{receiverProgressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-950 border border-zinc-900 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent-emerald h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${receiverProgressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {status === 'complete' && downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={metadata?.name || 'shared-file'}
                      className="bg-accent-emerald hover:bg-emerald-400 text-black rounded-lg py-2.5 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer hover:scale-[1.01]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download File
                    </a>
                  )}
                </div>
              )}

              {/* Sender (1-to-many list of downloads) */}
              {role === 'sender' && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] text-zinc-400 font-mono tracking-wider">ACTIVE RECEIVERS ({activePeersList.length})</span>
                  
                  {activePeersList.length === 0 ? (
                    <div className="bg-zinc-950/40 border border-zinc-900 border-dashed rounded-lg p-6 text-center text-zinc-500 font-mono text-xs select-none">
                      Waiting for receivers to connect...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-60 no-scrollbar">
                      {activePeersList.map(renderPeerTransfer)}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Interactive console logs */}
          <div className="flex flex-col gap-2 flex-grow">
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider">EVENT TRANSACTION STREAM</span>
            
            {logs.length === 0 ? (
              <div className="flex-grow bg-zinc-950/40 border border-zinc-900 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center text-zinc-500 font-mono text-xs select-none min-h-48">
                Console offline. Start a transfer to initialize logging.
              </div>
            ) : (
              <div
                ref={logContainerRef}
                className="flex-grow bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 font-mono text-xs overflow-y-auto h-48 select-text no-scrollbar"
              >
                {logs.map((log, idx) => (
                  <div key={idx} className={`${
                    log.type === 'success' ? 'text-accent-emerald' :
                    log.type === 'warn' ? 'text-amber-400' :
                    log.type === 'error' ? 'text-red-400' :
                    'text-zinc-400'
                  } mb-1 whitespace-pre-wrap leading-relaxed`}>
                    {log.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Error State Banner */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/40 text-red-400 text-xs rounded-lg flex flex-col gap-1.5 font-sans leading-relaxed">
              <span className="font-semibold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Network Restriction Detected
              </span>
              <p>{error}</p>
              <div className="text-[10px] text-red-500 font-mono mt-1 pt-1.5 border-t border-red-900/30">
                Tip: Direct WebRTC might fail if both devices are behind complex firewalls without a TURN relay. Try moving to the same local Wi-Fi or testing on cellular data.
              </div>
            </div>
          )}
        </div>

      </div>
      
    </div>
  );
};
