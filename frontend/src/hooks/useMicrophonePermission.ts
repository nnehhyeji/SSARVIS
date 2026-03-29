import { useCallback, useEffect, useRef, useState } from 'react';

export type MicPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied';

/**
 * 마이크 권한을 단일 지점에서 관리하는 훅.
 *
 * - permission  : 현재 권한 상태
 * - requestPermission() : 권한 확인 전용 (stream 즉시 해제, boolean 반환)
 * - getStream()  : 실제 MediaStream이 필요한 곳에서 사용 (해제는 호출처 책임)
 */
export function useMicrophonePermission() {
  const [permission, setPermission] = useState<MicPermissionState>('unknown');
  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  useEffect(() => {
    if (!navigator.permissions) return;

    let cancelled = false;

    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permissionStatusRef.current = status;
        setPermission(status.state as MicPermissionState);

        status.onchange = () => {
          setPermission(status.state as MicPermissionState);
        };
      })
      .catch(() => {
        // 일부 브라우저는 permissions.query를 지원하지 않음 — 무시
      });

    return () => {
      cancelled = true;
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, []);

  /**
   * 권한이 있는지만 확인한다. stream을 즉시 닫고 boolean을 반환한다.
   * 권한 거부 시 false를 반환하며 permission 상태를 'denied'로 갱신한다.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermission('granted');
      return true;
    } catch {
      setPermission('denied');
      return false;
    }
  }, []);

  /**
   * 실제 MediaStream이 필요한 곳에서 사용한다.
   * 반환된 stream의 수명(track.stop 등)은 호출처가 관리해야 한다.
   * 실패 시 null을 반환하고 permission 상태를 'denied'로 갱신한다.
   */
  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
      return stream;
    } catch {
      setPermission('denied');
      return null;
    }
  }, []);

  return { permission, requestPermission, getStream };
}
