// Type declaration for the pure-JS QR core path.
// We import from here instead of the root "qrcode" to avoid node builtins
// (fs / stream / canvas) that the server-side renderer pulls in.
declare module "qrcode/lib/core/qrcode" {
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: string },
  ): { modules: { data: Uint8Array; size: number } };
}
