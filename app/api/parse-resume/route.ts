import path from "node:path";
import { MessageChannel } from "node:worker_threads";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl =
    `${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts").replace(/\\/g, "/")}/`;
  const channel = new MessageChannel();
  workerModule.WorkerMessageHandler.initializeFromPort(channel.port1);
  const worker = pdfjsLib.PDFWorker.create({ port: channel.port2 as never });

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    worker,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl,
  });

  const pdf = await loadingTask.promise;

  try {
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();

        if (text) {
          pageTexts.push(text);
        }
      } finally {
        page.cleanup();
      }
    }

    return pageTexts.join("\n\n").trim();
  } finally {
    await pdf.destroy();
    await worker.destroy();
    channel.port1.close();
    channel.port2.close();
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    let text = "";

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else if (
      mime === "text/plain" ||
      name.endsWith(".txt") ||
      mime === ""
    ) {
      text = new TextDecoder("utf-8").decode(buffer);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or TXT file." },
        { status: 400 }
      );
    }

    // Normalise whitespace
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{3,}/g, " ")
      .trim()
      .slice(0, 6000);

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from the file. If this is a scanned PDF or image-only resume, paste the text instead.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[parse-resume] Failed to extract resume text:", message);
    return NextResponse.json(
      {
        error: `Failed to parse resume file. ${message}`,
      },
      { status: 500 }
    );
  }
}
