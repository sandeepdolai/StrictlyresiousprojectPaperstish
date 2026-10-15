import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE_PATH = path.join(process.cwd(), "public", "website-templates", "our-calendar-source.html");
const BRIDGE_PATH = path.join(process.cwd(), "public", "website-templates", "our-calendar-bridge.js");

const READONLY_GUARD = '<style id="paper-stish-readonly-guard">.paper-stish-readonly #tipbtn,.paper-stish-readonly #tipcard,.paper-stish-readonly .photo-btn{display:none!important}</style>\\n</head>';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const editing = url.searchParams.get("editing") === "1";

  try {
    const [source, bridge] = await Promise.all([
      readFile(SOURCE_PATH, "utf8"),
      readFile(BRIDGE_PATH, "utf8"),
    ]);

    if (!source.includes("</body>") || !source.includes('<html lang="en">') || !source.includes("</head>")) {
      return new Response("Our Calendar template source is incomplete.", { status: 500 });
    }
    if (bridge.includes("</script>")) {
      return new Response("Our Calendar bridge cannot be safely embedded.", { status: 500 });
    }

    const htmlTag = editing
      ? '<html lang="en">'
      : '<html lang="en" class="paper-stish-readonly">';
    let documentHtml = source.replace('<html lang="en">', htmlTag);

    if (!editing) {
      documentHtml = documentHtml.replace("</head>", READONLY_GUARD);
      documentHtml = documentHtml.replace(/contenteditable="true"/g, 'contenteditable="false"');
    }

    const script = '<script data-initial-editing="' + (editing ? "true" : "false") + '">' + "\\n" + bridge + "\\n</script>\\n</body>";
    documentHtml = documentHtml.replace("</body>", script);

    return new Response(documentHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Our Calendar could not be opened.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
