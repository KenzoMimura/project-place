(() => {
  "use strict";

  const CANVAS_WIDTH = 1240;
  const CANVAS_HEIGHT = 1754;
  const PDF_WIDTH = 595.28;
  const PDF_HEIGHT = 841.89;

  const MARGIN_X = 132;
  const MARGIN_TOP = 90;
  const MARGIN_BOTTOM = 120;
  const CONTENT_WIDTH = CANVAS_WIDTH - MARGIN_X * 2;

  const COLORS = {
    background: "#fffdf9",
    text: "#2d2b2a",
    muted: "#8a8178",
    accent: "#c8a977"
  };

  function formatWritingDate(dateKey) {
    const date = new Date(`${dateKey}T12:00:00`);
    const formattedDate = date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  function createCanvasPage() {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.textBaseline = "top";

    return { canvas, context };
  }

  function splitLongWord(context, word, maxWidth) {
    const pieces = [];
    let piece = "";

    for (const character of word) {
      const candidate = `${piece}${character}`;

      if (piece && context.measureText(candidate).width > maxWidth) {
        pieces.push(piece);
        piece = character;
      } else {
        piece = candidate;
      }
    }

    if (piece) {
      pieces.push(piece);
    }

    return pieces;
  }

  function wrapParagraph(context, paragraph, maxWidth) {
    const words = paragraph.trim().split(/\s+/);
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const wordPieces = context.measureText(word).width > maxWidth
        ? splitLongWord(context, word, maxWidth)
        : [word];

      wordPieces.forEach((wordPiece) => {
        const candidate = currentLine
          ? `${currentLine} ${wordPiece}`
          : wordPiece;

        if (
          currentLine &&
          context.measureText(candidate).width > maxWidth
        ) {
          lines.push(currentLine);
          currentLine = wordPiece;
        } else {
          currentLine = candidate;
        }
      });
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function wrapTextBlocks(context, text, maxWidth) {
    return text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((paragraph) => {
        if (!paragraph.trim()) {
          return { lines: [], isBlank: true };
        }

        return {
          lines: wrapParagraph(context, paragraph, maxWidth),
          isBlank: false
        };
      });
  }

  function drawPageHeader(context, writing, isFirstPage) {
    const title = writing.title?.trim() || "Sem título";

    context.fillStyle = COLORS.accent;
    context.font = "24px Georgia, serif";
    context.textAlign = "left";
    context.fillText("Nimsay", MARGIN_X, MARGIN_TOP);

    context.fillStyle = COLORS.muted;
    context.textAlign = "right";
    context.fillText(
      formatWritingDate(writing.createdOn),
      CANVAS_WIDTH - MARGIN_X,
      MARGIN_TOP
    );
    context.textAlign = "left";

    if (!isFirstPage) {
      context.fillStyle = COLORS.text;
      context.font = "30px Georgia, serif";

      const continuationTitle = wrapParagraph(
        context,
        title,
        CONTENT_WIDTH
      )[0];

      context.fillText(continuationTitle, MARGIN_X, 160);
      return 230;
    }

    context.fillStyle = COLORS.text;
    context.font = "46px Georgia, serif";

    const titleLines = wrapParagraph(context, title, CONTENT_WIDTH);
    let titleY = 180;

    titleLines.forEach((line) => {
      context.fillText(line, MARGIN_X, titleY);
      titleY += 62;
    });

    context.strokeStyle = COLORS.accent;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(MARGIN_X, titleY + 12);
    context.lineTo(CANVAS_WIDTH - MARGIN_X, titleY + 12);
    context.stroke();

    return titleY + 66;
  }

  function drawPageFooter(context, pageNumber) {
    const footerY = CANVAS_HEIGHT - 76;

    context.strokeStyle = "#e2ddd5";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(MARGIN_X, footerY - 24);
    context.lineTo(CANVAS_WIDTH - MARGIN_X, footerY - 24);
    context.stroke();

    context.fillStyle = COLORS.muted;
    context.font = "20px Georgia, serif";
    context.textAlign = "center";
    context.fillText(`Nimsay · ${pageNumber}`, CANVAS_WIDTH / 2, footerY);
    context.textAlign = "left";
  }

  function renderWritingPages(writing) {
    const pages = [];
    const lineHeight = 50;
    const blankLineHeight = 32;
    let pageNumber = 1;
    let page = createCanvasPage();
    let contentY = drawPageHeader(page.context, writing, true);

    page.context.font = "32px Georgia, serif";
    const textBlocks = wrapTextBlocks(
      page.context,
      writing.text.trim(),
      CONTENT_WIDTH
    );
    const pageLimit = CANVAS_HEIGHT - MARGIN_BOTTOM;

    function startNextPage() {
      drawPageFooter(page.context, pageNumber);
      pages.push(page.canvas);

      pageNumber += 1;
      page = createCanvasPage();
      contentY = drawPageHeader(page.context, writing, false);
      page.context.font = "32px Georgia, serif";
    }

    textBlocks.forEach((block) => {
      if (block.isBlank) {
        if (contentY + blankLineHeight > pageLimit) {
          startNextPage();
        }

        contentY += blankLineHeight;
        return;
      }

      const blockHeight = block.lines.length * lineHeight;

      if (contentY + blockHeight > pageLimit) {
        startNextPage();
      }

      block.lines.forEach((line) => {
        if (contentY + lineHeight > pageLimit) {
          startNextPage();
        }

        page.context.fillStyle = COLORS.text;
        page.context.fillText(line, MARGIN_X, contentY);
        contentY += lineHeight;
      });
    });

    drawPageFooter(page.context, pageNumber);
    pages.push(page.canvas);

    return pages;
  }

  function asciiBytes(text) {
    return new TextEncoder().encode(text);
  }

  function concatenateBytes(byteArrays) {
    const totalLength = byteArrays.reduce(
      (sum, bytes) => sum + bytes.length,
      0
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;

    byteArrays.forEach((bytes) => {
      result.set(bytes, offset);
      offset += bytes.length;
    });

    return result;
  }

  function jpegBytesFromCanvas(canvas) {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function createPdfBytes(canvases) {
    const pageImages = canvases.map(jpegBytesFromCanvas);
    const objectCount = 2 + pageImages.length * 3;
    const objectBodies = new Array(objectCount + 1);
    const pageReferences = [];

    objectBodies[1] = asciiBytes("<< /Type /Catalog /Pages 2 0 R >>");

    pageImages.forEach((imageBytes, index) => {
      const pageObject = 3 + index * 3;
      const contentObject = pageObject + 1;
      const imageObject = pageObject + 2;
      const imageName = `Im${index + 1}`;
      const content = asciiBytes(
        `q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/${imageName} Do\nQ\n`
      );

      pageReferences.push(`${pageObject} 0 R`);

      objectBodies[pageObject] = asciiBytes(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] ` +
        `/Resources << /XObject << /${imageName} ${imageObject} 0 R >> >> ` +
        `/Contents ${contentObject} 0 R >>`
      );

      objectBodies[contentObject] = concatenateBytes([
        asciiBytes(`<< /Length ${content.length} >>\nstream\n`),
        content,
        asciiBytes("endstream")
      ]);

      objectBodies[imageObject] = concatenateBytes([
        asciiBytes(
          `<< /Type /XObject /Subtype /Image /Width ${CANVAS_WIDTH} ` +
          `/Height ${CANVAS_HEIGHT} /ColorSpace /DeviceRGB ` +
          `/BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
        ),
        imageBytes,
        asciiBytes("\nendstream")
      ]);
    });

    objectBodies[2] = asciiBytes(
      `<< /Type /Pages /Kids [${pageReferences.join(" ")}] ` +
      `/Count ${pageReferences.length} >>`
    );

    const header = concatenateBytes([
      asciiBytes("%PDF-1.4\n%"),
      Uint8Array.from([0xe2, 0xe3, 0xcf, 0xd3]),
      asciiBytes("\n")
    ]);
    const parts = [header];
    const offsets = new Array(objectCount + 1).fill(0);
    let currentOffset = header.length;

    for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
      const objectBytes = concatenateBytes([
        asciiBytes(`${objectNumber} 0 obj\n`),
        objectBodies[objectNumber],
        asciiBytes("\nendobj\n")
      ]);

      offsets[objectNumber] = currentOffset;
      parts.push(objectBytes);
      currentOffset += objectBytes.length;
    }

    const xrefOffset = currentOffset;
    const xrefEntries = offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("");
    const trailer = asciiBytes(
      `xref\n0 ${objectCount + 1}\n` +
      "0000000000 65535 f \n" +
      xrefEntries +
      `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`
    );

    parts.push(trailer);
    return concatenateBytes(parts);
  }

  function createFileName(writing) {
    const identifier = writing.title?.trim() || writing.createdOn;
    const safeIdentifier = identifier
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    return `nimsay-${safeIdentifier || "escrita"}.pdf`;
  }

  function createWritingPdfBlob(writing) {
    if (!writing?.text?.trim()) {
      throw new Error("Não há conteúdo para exportar.");
    }

    const canvases = renderWritingPages(writing);
    const pdfBytes = createPdfBytes(canvases);

    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  function downloadWritingPdf(writing) {
    const blob = createWritingPdfBlob(writing);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = createFileName(writing);
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  window.NimsayPdf = {
    createWritingPdfBlob,
    downloadWritingPdf
  };
})();
