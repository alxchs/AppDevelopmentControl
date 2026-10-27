import os from 'os';

export function getLanAddresses(port = 3333) {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignora loopback e IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          ip: iface.address,
          url: `http://${iface.address}:${port}`,
          mac: iface.mac
        });
      }
    }
  }

  return {
    localhostUrl: `http://localhost:${port}`,
    port,
    hostname: os.hostname(),
    networkUrls: addresses,
    primaryUrl: addresses.length > 0 ? addresses[0].url : `http://localhost:${port}`
  };
}

