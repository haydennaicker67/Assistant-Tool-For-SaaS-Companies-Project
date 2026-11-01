import { Address4, Address6 } from 'ip-address';
import { URL } from 'node:url';

// Block common internal TLDs and hostnames
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
const BLOCKED_TLDS = ['.local', '.internal', '.lan', '.home'];

export function validateDatabaseUrl(connectionString: string): void {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('Invalid database connection string');
  }

  const hostname = url.hostname.toLowerCase();

  // 1. Block known localhost names
  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new Error('Connections to localhost are strictly forbidden.');
  }

  // 2. Block internal TLDs
  if (BLOCKED_TLDS.some(tld => hostname.endsWith(tld))) {
    throw new Error('Connections to internal domains are strictly forbidden.');
  }

  // 3. Block private IP addresses (IPv4 and IPv6)
  try {
    const cleanHostname = hostname.replace(/^\[|\]$/g, ''); // strip brackets from IPv6
    
    if (Address4.isValid(cleanHostname)) {
      const address = new Address4(cleanHostname);
      // Block private ranges: 10.x, 172.16-31.x, 192.168.x, 169.254.x (link-local)
      if (address.isPrivate() || address.isLinkLocal()) {
        throw new Error('Connections to private IP ranges are forbidden.');
      }
    } else if (Address6.isValid(cleanHostname)) {
      const address = new Address6(cleanHostname);
      const isUniqueLocal = cleanHostname.startsWith('fc') || cleanHostname.startsWith('fd');
      if (address.isLinkLocal() || address.isLoopback() || isUniqueLocal) {
        throw new Error('Connections to private IP ranges are forbidden.');
      }
    }
  } catch (err: any) {
    // If ip-address throws an error, it's not an IP, so it's a domain name. That's fine.
    if (err.message.includes('forbidden')) throw err;
  }
}