export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  fullString: string;
}

export function parseUserAgent(ua: string): DeviceInfo {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';

  // Detect Browser
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) {
    if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
    } else {
      os = 'macOS';
    }
  }
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  // Detect Device Type
  if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
    deviceType = ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile')) ? 'Tablet' : 'Mobile';
  }

  return {
    browser,
    os,
    deviceType,
    fullString: `${os} ${deviceType === 'Desktop' ? 'Desktop' : ''}`.trim() + ` - ${browser}`
  };
}
