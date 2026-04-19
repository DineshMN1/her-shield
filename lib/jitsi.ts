export function buildJitsiJoinUrl(roomOrLink: string, displayName: string) {
  const room = roomOrLink.startsWith('http://') || roomOrLink.startsWith('https://')
    ? new URL(roomOrLink)
    : null;

  const baseUrl = room
    ? `${room.origin}${room.pathname}`
    : `https://meet.jit.si/${encodeURIComponent(roomOrLink)}`;

  // Use the current Jitsi config flag so the pre-join screen does not ask for a name.
  return `${baseUrl}#userInfo.displayName=${encodeURIComponent(displayName)}&config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
}
