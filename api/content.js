import { readContent, send } from "./_lib.js";

// Public: the site content the pages render from.
export default async function handler(req, res) {
  try {
    const content = await readContent();
    send(res, 200, content, {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
    });
  } catch (e) {
    send(res, 500, { error: "Could not load content" });
  }
}
