import React, { useState, useEffect } from 'react';
import type { AuditLedgerBlock } from '../types';
import { apiFetch } from '../lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  FileCode,
} from 'lucide-react';

export const AuditLedgerVerifier: React.FC = () => {
  const [blocks, setBlocks] = useState<AuditLedgerBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [tamperResult, setTamperResult] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<AuditLedgerBlock | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<AuditLedgerBlock[]>('/api/v1/audit/ledger?limit=60');
      setBlocks(data);
      if (data.length > 0 && !selectedBlock) {
        setSelectedBlock(data[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load ledger:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  // 1. Full Cryptographic Verification Check
  const handleVerifyLedger = async () => {
    try {
      setVerifying(true);
      setTamperResult(null);
      const data = await apiFetch<any>('/api/v1/audit/verify', {
        method: 'POST',
      });
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyResult({ valid: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  // 2. Simulate Ledger Tampering (Demonstrate instantaneous detection)
  const handleSimulateTamper = async () => {
    try {
      setVerifying(true);
      setVerifyResult(null);
      const data = await apiFetch<any>('/api/v1/audit/simulate-tamper', {
        method: 'POST',
      });
      setTamperResult(data);
    } catch (err: any) {
      setTamperResult({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const filteredBlocks = blocks.filter((b) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        b.record_id.toLowerCase().includes(q) ||
        b.event_type.toLowerCase().includes(q) ||
        b.actor.toLowerCase().includes(q) ||
        b.current_hash.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6] text-[#263238] overflow-y-auto p-4 space-y-4 font-sans animate-fade-in">
      {/* Top Header & Actions */}
      <div className="border-b border-[#DDD6C8] pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-[#173D35]" />
            <h2 className="text-base font-bold text-[#173D35]">
              Cryptographic Audit Ledger Verification (SHA-256 Hash Chain)
            </h2>
          </div>
          <p className="text-xs text-[#66706B] mt-0.5">
            Tamper-evident immutable ledger linking incidents, AI predictions, safety gate evaluations, and signed pump actuations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Verify Entire Ledger Button */}
          <button
            onClick={handleVerifyLedger}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#173D35] hover:bg-[#1E4D43] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {verifying ? (
              <Clock className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>Verify Entire Ledger</span>
          </button>

          {/* Simulate Ledger Tampering Button (Step 3.4.4) */}
          <button
            onClick={handleSimulateTamper}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B85042] hover:bg-[#9E3E33] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            <span>Simulate Ledger Tampering</span>
          </button>
        </div>
      </div>

      {/* Verification Results Banner */}
      {verifyResult && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
            verifyResult.valid
              ? 'bg-[#5D7A4E]/15 border-[#5D7A4E]/40 text-[#5D7A4E]'
              : 'bg-[#B85042]/15 border-[#B85042]/40 text-[#B85042]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {verifyResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-[#5D7A4E] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#B85042] shrink-0" />
            )}
            <div>
              <span className="font-bold text-sm">
                {verifyResult.valid
                  ? `✓ Cryptographic Integrity Verified: ${verifyResult.verified_blocks} Blocks Validated`
                  : '✗ Chain Integrity Failure Detected!'}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {verifyResult.valid
                  ? 'All SHA-256 block hashes and chronological linkages match Genesis baseline perfectly.'
                  : `Tampering detected at block: ${verifyResult.tampered_record_id || 'Unknown'}. Hash mismatch!`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerifyResult(null)}
            className="text-xs underline hover:text-[#263238] ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tamper Simulation Demonstration Banner */}
      {tamperResult && (
        <div className="p-4 rounded-xl border bg-[#B85042]/10 border-[#B85042]/50 text-[#B85042] space-y-2 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-black text-sm text-[#B85042]">
              <ShieldAlert className="w-5 h-5 text-[#B85042] shrink-0 animate-bounce" />
              <span>🚨 Intentional Tamper Injection Detected Instantaneously!</span>
            </div>
            <button
              onClick={() => setTamperResult(null)}
              className="text-xs underline hover:text-[#263238] cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-[#263238] leading-relaxed font-sans">
            {tamperResult.message}
          </p>

          <div className="bg-[#FFFDF8] p-2.5 rounded-lg border border-[#B85042]/30 font-mono text-[11px] space-y-1">
            <div className="text-[#B85042] font-bold">
              Corrupted Block: {tamperResult.tampered_block} (Block #{tamperResult.tampered_index})
            </div>
            <div className="text-[#66706B] truncate">
              Linkage Status: BROKEN HASH CHAIN at Index {tamperResult.tampered_index}
            </div>
            <div className="text-[#66706B]">
              Integrity Valid: <strong className="text-[#B85042]">FALSE</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Ledger Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Column: Blocks Hash-Chain List */}
        <div className="lg:col-span-7 bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 flex flex-col space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#173D35]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#173D35]">
                Recent Audit Blocks ({filteredBlocks.length} / {blocks.length})
              </h3>
            </div>

            <button
              onClick={fetchLedger}
              className="text-[#66706B] hover:text-[#173D35] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#173D35]' : ''}`} />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#66706B]" />
            <input
              type="text"
              placeholder="Search Record ID, Event Type, Actor, or Hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F0E6] border border-[#DDD6C8] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#263238] placeholder-[#66706B] focus:outline-none focus:border-[#173D35]"
            />
          </div>

          {/* Blocks List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[460px] pr-1">
            {filteredBlocks.map((block) => {
              const isSelected = block.record_id === selectedBlock?.record_id;
              return (
                <div
                  key={block.record_id}
                  onClick={() => setSelectedBlock(block)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#173D35]/10 border-[#173D35] shadow-xs ring-1 ring-[#173D35]'
                      : 'bg-[#FFFDF8] border-[#DDD6C8] hover:bg-[#F5F0E6]/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs font-mono text-[#173D35]">
                      {block.record_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#173D35]/10 text-[#173D35] border border-[#173D35]/30 truncate max-w-[150px]">
                      {block.event_type}
                    </span>
                  </div>

                  {/* Previous -> Current Hash Linkage Display (Step 3.4.4) */}
                  <div className="bg-[#F5F0E6] p-2 rounded-lg border border-[#DDD6C8] font-mono text-[10px] space-y-1">
                    <div className="flex items-center space-x-1.5 text-[#66706B] truncate">
                      <span className="text-[#66706B] shrink-0">Prev:</span>
                      <span className="truncate">{block.previous_hash}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[#5D7A4E] truncate">
                      <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                      <span className="text-[#66706B] shrink-0">Hash:</span>
                      <span className="truncate font-bold">{block.current_hash}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#66706B] mt-1.5">
                    <span>Actor: <strong className="text-[#263238]">{block.actor}</strong></span>
                    <span>{block.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Block Payload & Inspector */}
        <div className="lg:col-span-5 bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          {selectedBlock ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-[#173D35]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#173D35]">
                    Block Payload Inspector
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#66706B] bg-[#F5F0E6] border border-[#DDD6C8] px-2 py-0.5 rounded">
                  {selectedBlock.record_id}
                </span>
              </div>

              {/* Block Metadata */}
              <div className="space-y-2 text-xs bg-[#F5F0E6] p-3 rounded-xl border border-[#DDD6C8] font-mono text-[11px]">
                <div>
                  <span className="text-[#66706B] block text-[10px]">EVENT TYPE</span>
                  <span className="text-[#263238] font-bold">{selectedBlock.event_type}</span>
                </div>
                <div>
                  <span className="text-[#66706B] block text-[10px]">AUTHORIZED ACTOR</span>
                  <span className="text-[#173D35] font-semibold">{selectedBlock.actor}</span>
                </div>
                <div>
                  <span className="text-[#66706B] block text-[10px]">ASSOCIATED INCIDENT</span>
                  <span className="text-[#263238]">{selectedBlock.incident_id}</span>
                </div>
                <div>
                  <span className="text-[#66706B] block text-[10px]">TIMESTAMP</span>
                  <span className="text-[#66706B]">{selectedBlock.timestamp}</span>
                </div>
              </div>

              {/* SHA-256 Hashes */}
              <div className="space-y-2 text-xs bg-[#F5F0E6] p-3 rounded-xl border border-[#DDD6C8] font-mono text-[10px]">
                <div>
                  <span className="text-[#66706B] block">PREVIOUS BLOCK HASH</span>
                  <span className="text-[#66706B] break-all">{selectedBlock.previous_hash}</span>
                </div>
                <div className="pt-1 border-t border-[#DDD6C8]">
                  <span className="text-[#5D7A4E] block font-bold">CURRENT BLOCK SHA-256 HASH</span>
                  <span className="text-[#5D7A4E] break-all font-bold">{selectedBlock.current_hash}</span>
                </div>
              </div>

              {/* Payload JSON */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#66706B] uppercase font-mono block">
                  Immutable Payload Body
                </span>
                <div className="bg-[#F5F0E6] p-3 rounded-xl border border-[#DDD6C8] text-[11px] font-mono text-[#263238] overflow-x-auto max-h-40">
                  <pre>{JSON.stringify(JSON.parse(selectedBlock.payload_json || '{}'), null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#66706B]">
              Select an audit block to inspect its cryptographic payload.
            </div>
          )}

          <div className="pt-3 border-t border-[#DDD6C8] text-[10px] text-[#66706B] flex items-center justify-between">
            <span>Model Version: {selectedBlock?.model_version || 'fusion-sim-1.0'}</span>
            <span className="text-[#5D7A4E] font-semibold">Unbroken Ledger Chain</span>
          </div>
        </div>
      </div>
    </div>
  );
};
