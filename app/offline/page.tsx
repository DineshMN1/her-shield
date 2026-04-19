'use client';

import { WifiOff, Heart, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Heart className="w-10 h-10 text-white" />
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <WifiOff className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">You&apos;re Offline</h1>
          <p className="text-gray-500 text-sm mb-6">
            No internet connection. Please check your network and try again.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-700 text-sm font-semibold mb-1">⚠️ Emergency?</p>
            <p className="text-red-600 text-xs">
              Call <strong>112</strong> or <strong>108</strong> immediately — do not wait for the app to reconnect.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">Health SOS — Pregnancy Care</p>
      </div>
    </div>
  );
}
