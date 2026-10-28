// Operator verification only. Public DNS fallback keeps TLS certificate checks on.
import https from "node:https";
import http from "node:http";
import { Resolver } from "node:dns";
const resolver = new Resolver({ timeout: 5000, tries: 2 });
resolver.setServers(["1.1.1.1", "8.8.8.8"]);
export async function checkedFetch(url, options = {}) {
  if (!process.argv.includes("--public-dns"))
    return fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
  if (
    !["nmaogun.com.ng", "www.nmaogun.com.ng", "portal.nmaogun.com.ng"].includes(
      new URL(url).hostname,
    )
  )
    throw new Error("Public DNS check is limited to the NMA Ogun hosts.");
  return new Promise((resolve, reject) => {
    const transport = new URL(url).protocol === "https:" ? https : http;
    const request = transport.request(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        lookup(host, opts, done) {
          resolver.resolve4(host, (error, addresses) => {
            if (error) return done(error);
            done(
              null,
              opts.all
                ? addresses.map((address) => ({ address, family: 4 }))
                : addresses[0],
              4,
            );
          });
        },
      },
      (response) => {
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 5 * 1024 * 1024) {
            request.destroy(new Error("Check response exceeds 5 MiB."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve(
            new Response(
              options.method === "HEAD" ? null : Buffer.concat(chunks),
              { status: response.statusCode, headers: response.headers },
            ),
          ),
        );
        response.on("error", reject);
      },
    );
    request.setTimeout(25000, () =>
      request.destroy(new Error("Public check timed out.")),
    );
    request.on("error", reject);
    request.end();
  });
}
