'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function WorkspaceTerminal({
  lines,
  onCommand,
}: {
  lines: string[];
  onCommand: (cmd: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenCountRef = useRef(0);
  const inputBufferRef = useRef('');
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#e8ecf1',
        cursor: '#00B8D4',
        selectionBackground: 'rgba(0,184,212,.3)',
        green: '#22c55e',
        cyan: '#00E5FF',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      cursorBlink: true,
      convertEol: true,
      disableStdin: false,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    try {
      fit.fit();
    } catch {
      /* ignore */
    }

    termRef.current = term;
    fitRef.current = fit;

    const prompt = () => {
      term.write('\x1b[32mros2@r2bot\x1b[0m:\x1b[34m~/my_robot_ws\x1b[0m$ ');
    };

    term.onData((data) => {
      const code = data.charCodeAt(0);
      if (data === '\r') {
        term.write('\r\n');
        const cmd = inputBufferRef.current;
        inputBufferRef.current = '';
        if (cmd.trim().length > 0) {
          onCommandRef.current(cmd);
        }
        // prompt will be re-emitted after lines update
        setTimeout(prompt, 30);
      } else if (code === 127) {
        // backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code === 3) {
        // ctrl-c
        term.write('^C\r\n');
        inputBufferRef.current = '';
        prompt();
      } else if (code >= 32 && code < 127) {
        inputBufferRef.current += data;
        term.write(data);
      }
    });

    // initial prompt after first paint
    setTimeout(prompt, 30);

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Stream new lines from outside as they appear
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const start = writtenCountRef.current;
    if (start >= lines.length) {
      if (start > lines.length) writtenCountRef.current = lines.length;
      return;
    }
    for (let i = start; i < lines.length; i++) {
      // newline before printing if needed
      term.write('\r\n' + lines[i]);
    }
    writtenCountRef.current = lines.length;
  }, [lines]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 160,
        background: '#000',
        borderRadius: 6,
        padding: 6,
        overflow: 'hidden',
      }}
    />
  );
}
