import { isIP } from "node:net";

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "[::1]"]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254)
  );
}

export function validateSutUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The SUT URL must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("The SUT URL must use HTTP or HTTPS.");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    blockedHostnames.has(hostname) ||
    isPrivateIpv4(hostname) ||
    (isIP(hostname) === 6 && (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd")))
  ) {
    throw new Error("Private and local SUT destinations are blocked.");
  }
  return url;
}