import axios from 'axios';

export function getAuthErrorMessage(error: unknown, fallback = 'google sign-in failed'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'studio api is unreachable — start corelabs-backend (port 4005)';
    }

    const payload = error.response.data;
    if (typeof payload === 'object' && payload !== null) {
      const message =
        'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : null;
      if (message) {
        return message.toLowerCase();
      }
    }

    if (error.response.status === 401) {
      return 'google token was rejected by studio auth';
    }
    if (error.response.status >= 500) {
      return 'studio auth error — check corelabs-backend logs';
    }
  }

  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    switch (error.code) {
      case 'auth/unauthorized-domain':
        return 'add localhost to firebase auth authorized domains';
      case 'auth/popup-blocked':
        return 'google popup was blocked by the browser';
      case 'auth/network-request-failed':
        return 'network error talking to google/firebase';
      case 'auth/internal-error':
        return 'firebase auth internal error — check google provider is enabled';
      case 'auth/operation-not-allowed':
        return 'google sign-in is disabled in firebase console';
      default:
        if (error.code.startsWith('auth/')) {
          return error.code.replace('auth/', 'firebase: ');
        }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message.toLowerCase();
  }

  return fallback;
}
