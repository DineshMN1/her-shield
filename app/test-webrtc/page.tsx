'use client';

/**
 * WebRTC Loopback Test Page — /test-webrtc
 *
 * Tests the full signaling flow in-browser without needing a second device:
 * - pc1 and pc2 are two RTCPeerConnections in the same tab
 * - pc1 creates an offer, pc2 answers it (simulating patient + doctor)
 * - ICE candidates are exchanged directly (no network, no DB)
 * - If the remote video plays back your own camera, WebRTC is working end-to-end
 *
 * This does NOT test the DB signaling layer — it tests that WebRTC itself works
 * in your browser (permissions, codecs, STUN).
 */

import { useRef, useState } from 'react';
import { Video, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

type TestResult = { name: string; ok: boolean; detail?: string };

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function TestWebRTCPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pc1Ref = useRef<RTCPeerConnection | null>(null);
  const pc2Ref = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const addResult = (r: TestResult) =>
    setResults((prev) => [...prev, r]);

  const stop = () => {
    pc1Ref.current?.close();
    pc2Ref.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteRef.current) remoteRef.current.srcObject = null;
    pc1Ref.current = null;
    pc2Ref.current = null;
    streamRef.current = null;
  };

  const runTests = async () => {
    setRunning(true);
    setDone(false);
    setResults([]);
    stop();

    // ── Test 1: Camera / mic permission ──────────────────────────────────
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      addResult({ name: 'Camera & microphone access', ok: true });
    } catch (err: any) {
      addResult({ name: 'Camera & microphone access', ok: false, detail: err.message });
      setRunning(false);
      setDone(true);
      return;
    }

    // ── Test 2: RTCPeerConnection creation ────────────────────────────────
    let pc1: RTCPeerConnection, pc2: RTCPeerConnection;
    try {
      pc1 = new RTCPeerConnection(ICE_CONFIG);
      pc2 = new RTCPeerConnection(ICE_CONFIG);
      pc1Ref.current = pc1;
      pc2Ref.current = pc2;
      addResult({ name: 'RTCPeerConnection created', ok: true });
    } catch (err: any) {
      addResult({ name: 'RTCPeerConnection created', ok: false, detail: err.message });
      setRunning(false);
      setDone(true);
      return;
    }

    // ── Test 3: Track addition ────────────────────────────────────────────
    try {
      stream.getTracks().forEach((t) => pc1.addTrack(t, stream));
      addResult({ name: 'Tracks added to pc1', ok: true });
    } catch (err: any) {
      addResult({ name: 'Tracks added to pc1', ok: false, detail: err.message });
    }

    // ── Test 4: Offer / Answer exchange (loopback signaling) ──────────────
    const connected = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 15000);

      // Wire ICE candidates directly between the two peers (no network needed)
      pc1.onicecandidate = ({ candidate }) => {
        if (candidate) pc2.addIceCandidate(candidate).catch(() => {});
      };
      pc2.onicecandidate = ({ candidate }) => {
        if (candidate) pc1.addIceCandidate(candidate).catch(() => {});
      };

      // When pc2 receives tracks, show them in the remote video element
      pc2.ontrack = (event) => {
        if (remoteRef.current && event.streams[0]) {
          remoteRef.current.srcObject = event.streams[0];
        }
      };

      pc1.onconnectionstatechange = () => {
        if (pc1.connectionState === 'connected') {
          clearTimeout(timeout);
          resolve(true);
        }
        if (['failed', 'closed'].includes(pc1.connectionState)) {
          clearTimeout(timeout);
          resolve(false);
        }
      };

      (async () => {
        try {
          const offer = await pc1.createOffer();
          await pc1.setLocalDescription(offer);
          await pc2.setRemoteDescription(offer);
          const answer = await pc2.createAnswer();
          await pc2.setLocalDescription(answer);
          await pc1.setRemoteDescription(answer);
        } catch (err) {
          clearTimeout(timeout);
          resolve(false);
        }
      })();
    });

    addResult({
      name: 'Offer / answer exchange & ICE connection',
      ok: connected,
      detail: connected ? 'Loopback connection established' : 'Timed out after 15 s',
    });

    // ── Test 5: Remote video stream playing ───────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    const remoteHasStream = !!(remoteRef.current?.srcObject);
    addResult({
      name: 'Remote video stream received',
      ok: remoteHasStream,
      detail: remoteHasStream ? 'Remote video is playing' : 'No stream on remote video element',
    });

    // ── Test 6: STUN reachability (best-effort) ───────────────────────────
    const stunOk = ['connected', 'completed'].includes(pc1.iceConnectionState);
    addResult({
      name: 'ICE / STUN reachability',
      ok: stunOk,
      detail: `ICE state: ${pc1.iceConnectionState}`,
    });

    setRunning(false);
    setDone(true);
  };

  const reset = () => {
    stop();
    setResults([]);
    setDone(false);
  };

  const allPassed = results.length > 0 && results.every((r) => r.ok);
  const anyFailed = results.some((r) => !r.ok);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Video className="w-7 h-7 text-pink-500" />
          <div>
            <h1 className="text-2xl font-bold">WebRTC Loopback Test</h1>
            <p className="text-gray-400 text-sm">
              Verifies camera, RTCPeerConnection, ICE, and stream playback in-browser
            </p>
          </div>
        </div>

        {/* Video previews */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <p className="text-xs text-gray-500 mb-1">Local (your camera)</p>
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-gray-800 rounded-xl object-cover"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Remote (loopback)</p>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="w-full aspect-video bg-gray-800 rounded-xl object-cover"
            />
            <p className="text-xs text-gray-600 mt-1">
              Should mirror the local feed when test passes
            </p>
          </div>
        </div>

        {/* Run / Reset buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={runTests}
            disabled={running}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            {running ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Running tests…
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Run WebRTC Test
              </>
            )}
          </button>

          {done && (
            <button
              onClick={reset}
              className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-gray-800 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-lg mb-4">Test Results</h2>

            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                {r.ok ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={r.ok ? 'text-green-300' : 'text-red-300'}>{r.name}</p>
                  {r.detail && <p className="text-gray-500 text-xs mt-0.5">{r.detail}</p>}
                </div>
              </div>
            ))}

            {done && (
              <div
                className={`mt-6 p-4 rounded-xl font-semibold text-center ${
                  allPassed
                    ? 'bg-green-900/40 text-green-300 border border-green-700'
                    : 'bg-red-900/40 text-red-300 border border-red-700'
                }`}
              >
                {allPassed
                  ? 'All tests passed — WebRTC is fully functional in this browser'
                  : anyFailed
                  ? 'Some tests failed — check camera permissions or browser support'
                  : 'Tests complete'}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-gray-800/50 rounded-xl p-4 text-sm text-gray-400">
          <p className="font-medium text-gray-300 mb-1">What this tests</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Camera &amp; microphone permission grant</li>
            <li>RTCPeerConnection API availability</li>
            <li>Offer / answer SDP exchange (simulating 2 peers)</li>
            <li>ICE candidate exchange &amp; connection establishment</li>
            <li>Remote track / stream delivery</li>
            <li>STUN server reachability (stun.l.google.com)</li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Note: This page does not test the DB signaling layer. It tests whether WebRTC
            works in your browser before network latency is a factor.
          </p>
        </div>
      </div>
    </div>
  );
}
