import { useCallback, useState } from 'react';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

function dl(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escHtmlWithBreaks(s: string) {
  return esc(s).replace(/\n/g, '<br>');
}

export function useDownload(fullText: string, fullName: string, dir: 'rtl' | 'ltr' = 'rtl') {
  const downloadTxt = useCallback(() => {
    dl(new Blob([fullText], { type: 'text/plain;charset=utf-8' }), fullName + '.txt');
  }, [fullText, fullName]);

  const [docBusy, setDocBusy] = useState(false);

  // Real .docx (Office Open XML) with RTL paragraphs for Urdu/Arabic
  const downloadDoc = useCallback(async () => {
    if (docBusy) return;
    setDocBusy(true);
    try {
      const isRtl = dir === 'rtl';
      const paras: Paragraph[] = [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          bidirectional: isRtl,
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text: fullName, bold: true, size: 40, rightToLeft: isRtl })],
        }),
        new Paragraph({
          bidirectional: isRtl,
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({ text: new Date().toLocaleString(), size: 18, color: '888888', rightToLeft: isRtl }),
          ],
        }),
        ...fullText.split(/\n/).map(
          (line) =>
            new Paragraph({
              bidirectional: isRtl,
              alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              spacing: { after: 160 },
              children: [new TextRun({ text: line || ' ', size: 26, rightToLeft: isRtl })],
            }),
        ),
      ];
      const docFile = new Document({
        title: fullName,
        sections: [{ properties: { rtlGutter: isRtl }, children: paras }],
      });
      const blob = await Packer.toBlob(docFile);
      dl(blob, fullName + '.docx');
    } finally {
      setDocBusy(false);
    }
  }, [fullText, fullName, dir, docBusy]);

  // Print ONLY the transcript in an isolated hidden iframe.
  // Robust vs window.print() + CSS toggles (parent display:none kills print-area).
  const downloadPdf = useCallback(() => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      window.print();
      return;
    }

    const hasIndic = /[\u0900-\u097F\u0A80-\u0AFF]/.test(fullText); // Devanagari / Gujarati blocks
    const fontFamily = dir === 'rtl' && !hasIndic
      ? "'Noto Nastaliq Urdu','Amiri',serif"
      : hasIndic && /[\u0900-\u097F]/.test(fullText)
        ? "'Noto Sans Devanagari','Inter',sans-serif"
        : hasIndic
          ? "'Noto Sans Gujarati','Inter',sans-serif"
          : "'Inter',system-ui,sans-serif";

    doc.open();
    doc.write(`<!doctype html>
<html lang="${dir === 'rtl' && !hasIndic ? 'ur' : 'en'}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${esc(fullName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;500;600&family=Noto+Sans+Gujarati:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&display=swap" rel="stylesheet">
<style>
  @page { margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: ${fontFamily}; direction: ${dir}; color: #000; background: #fff; margin: 0; padding: 24px; line-height: 2.2; }
  h1 { font-size: 20px; margin: 0 0 6px 0; line-height: 1.8; }
  .meta { font-size: 12px; color: #555; margin-bottom: 16px; font-family: 'Inter',system-ui,sans-serif; }
  .content { font-size: 15px; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }
</style>
</head>
<body>
  <h1>${esc(fullName)}</h1>
  <div class="meta">${new Date().toLocaleString()}</div>
  <div class="content">${escHtmlWithBreaks(fullText)}</div>
</body>
</html>`);
    doc.close();

    const cleanup = () => setTimeout(() => iframe.remove(), 1000);
    const win = iframe.contentWindow;
    if (!win) { cleanup(); return; }

    // Give fonts / layout a tick before printing, else blank PDF on slow devices
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        window.print();
      }
      cleanup();
    }, 450);
  }, [fullText, fullName, dir]);

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(fullText);
      return true;
    } catch {
      return false;
    }
  }, [fullText]);

  const share = useCallback(async (): Promise<'shared' | 'copied' | 'failed'> => {
    if (navigator.share) {
      try { await navigator.share({ title: fullName, text: fullText }); return 'shared'; } catch {}
    }
    const ok = await copyToClipboard();
    return ok ? 'copied' : 'failed';
  }, [fullText, fullName, copyToClipboard]);

  return { downloadTxt, downloadDoc, downloadPdf, copyToClipboard, share, docBusy };
}
