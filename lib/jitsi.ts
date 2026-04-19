export function buildJitsiJoinUrl(roomOrLink: string, displayName: string) {
  const room = roomOrLink.startsWith('http://') || roomOrLink.startsWith('https://')
    ? new URL(roomOrLink)
    : null;

  const baseUrl = room
    ? `${room.origin}${room.pathname}`
    : `https://meet.jit.si/${encodeURIComponent(roomOrLink)}`;

  return `${baseUrl}#userInfo.displayName=${encodeURIComponent(displayName)}&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
}
